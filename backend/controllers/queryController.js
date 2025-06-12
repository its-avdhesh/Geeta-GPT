import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config.js';
import { cache } from '../utils/cache.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Exponential backoff for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, maxRetries = 2) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        const retryDelay = error.message.includes('retryDelay') 
          ? parseInt(error.message.match(/retryDelay":"(\d+)s"/)?.[1] || '30') * 1000
          : Math.min(30000 * Math.pow(2, i), 60000);
        
        console.log(`Rate limited. Retrying in ${retryDelay/1000} seconds...`);
        await sleep(retryDelay);
        continue;
      }
      throw error;
    }
  }
};

export const queryController = {
  // Health check endpoint
  healthCheck: (req, res) => { 
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
  },

  // Test endpoint
  test: (req, res) => {
    res.json({ message: 'Server is working fine!' });
  },

  // Test Gemini API connection
  testGemini: async (req, res) => {
    try {
      console.log('Testing Gemini API connection...');
      const model = genAI.getGenerativeModel({ model: config.geminiModel });
      
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
          model: config.geminiModel,
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
  },

  // Main query endpoint
  handleQuery: async (req, res) => {
    try {
      console.log('Received query:', req.body);
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required in the request body.' });
      }

      // Check cache first
      const cacheKey = query.toLowerCase().trim();
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        console.log('Serving from cache');
        return res.json({ 
          response: cachedResponse,
          cached: true
        });
      }

      // Use gemini model with retry logic
      const model = genAI.getGenerativeModel({ model: config.geminiModel });
      const prompt = `Based on the teachings of Bhagavad Gita, please provide insights about: ${query}`;
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

      // Cache the response
      cache.set(cacheKey, text);

      // Send response
      res.json({ 
        response: text,
        cached: false
      });
      
    } catch (error) {
      console.error('Error while processing:', error);
      
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

      res.status(500).json({ 
        error: 'Failed to generate response.',
        details: error.message 
      });
    }
  }
}; 