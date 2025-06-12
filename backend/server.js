// backend/index.js
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { config } from './config/config.js';
import queryRoutes from './routes/queryRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', queryRoutes);

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Exponential backoff for retries with longer delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, maxRetries = 2) => { // Reduced max retries
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        // Extract retry delay from error message if available
        const retryDelay = error.message.includes('retryDelay') 
          ? parseInt(error.message.match(/retryDelay":"(\d+)s"/)?.[1] || '30') * 1000
          : Math.min(30000 * Math.pow(2, i), 60000); // Max 60 seconds
        
        console.log(`Rate limited. Retrying in ${retryDelay/1000} seconds...`);
        await sleep(retryDelay);
        continue;
      }
      throw error;
    }
  }
};

// Health Check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'GitaGPT API is running!',
    status: 'healthy',
    quota: {
      perMinute: {
        limit: config.rateLimits.maxRequests.perMinute,
        window: '1 minute'
      },
      perHour: {
        limit: config.rateLimits.maxRequests.perHour,
        window: '1 hour'
      },
      perDay: {
        limit: config.rateLimits.maxRequests.perDay,
        window: '24 hours'
      }
    }
  });
});

// Test server route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working fine!' });
});

// Test Gemini API connection
app.get('/test-gemini', async (req, res) => {
  try {
    console.log('Testing Gemini API connection...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Simple test prompt
    const testPrompt = "Say 'Hello' in one word.";
    console.log('Test prompt:', testPrompt);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: testPrompt }] }]
    });

    const text = result.response.text();
    console.log('Gemini API Response:', text);

    res.json({ 
      status: 'success',
      message: 'Gemini API is working!',
      response: text,
      apiStatus: {
        model: "gemini-1.5-pro",
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Gemini API Test Error:', error);
    
    if (error.message.includes('API Key not found') || error.message.includes('API_KEY_INVALID')) {
      return res.status(401).json({ 
        status: 'error',
        error: 'API Key Error',
        message: 'Invalid or missing API key. Please check your .env file.'
      });
    }
    
    if (error.message.includes('429') || error.message.includes('quota')) {
      return res.status(429).json({ 
        status: 'error',
        error: 'Quota Exceeded',
        message: 'API quota has been exceeded. Please try again later.',
        details: error.message
      });
    }

    res.status(500).json({ 
      status: 'error',
      error: 'API Test Failed',
      message: 'Failed to connect to Gemini API',
      details: error.message 
    });
  }
});

// Main API to handle queries
app.post('/api/query', async (req, res) => {
  try {
    console.log('Received query:', req.body);
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required in the request body.' });
    }

    // Use gemini-1.5-pro model with retry logic
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `Based on the teachings of Bhagavad Gita, please provide insights about ( Give in proper format and styling): ${query}`;
    console.log('Prompt being sent:', prompt);

    // Generate content with retry logic
    const result = await retryWithBackoff(async () => {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      return response;
    });

    const text = result.response.text();
    console.log('Response from Gemini:', text);

    // Send response
    res.json({ 
      response: text,
      cached: false
    });
    
  } catch (error) {
    console.error('Error while processing:', error);
    
    // Handle specific API errors
    if (error.message.includes('API Key not found') || error.message.includes('API_KEY_INVALID')) {
      return res.status(401).json({ 
        error: 'API Key Error',
        message: 'Invalid or missing API key. Please contact the administrator.'
      });
    }
    
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
      const retryAfter = error.message.includes('retryDelay') 
        ? parseInt(error.message.match(/retryDelay":"(\d+)s"/)?.[1] || '30') 
        : 30;
      
      return res.status(429).json({ 
        error: 'Quota Exceeded',
        message: `API quota has been exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter
      });
    }

    // Generic error response
    res.status(500).json({ 
      error: 'Failed to generate response.',
      details: error.message 
    });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    details: err.message 
  });
});

// Start the server
app.listen(config.port, () => {
  console.log(`✅ Server running at http://localhost:${config.port}`);
  console.log('🌱 Environment Check:', {
    GEMINI_API_KEY: config.geminiApiKey ? '✅ Present' : '❌ Missing'
  });
  console.log('📊 Rate Limits:', {
    'Requests per minute': config.rateLimits.maxRequests.perMinute,
    'Requests per hour': config.rateLimits.maxRequests.perHour,
    'Requests per day': config.rateLimits.maxRequests.perDay,
    'Cache duration': '24 hours'
  });
});
