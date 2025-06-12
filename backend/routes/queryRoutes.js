import express from 'express';
import { queryController } from '../controllers/queryController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Health check route
router.get('/', queryController.healthCheck);

// Test route
router.get('/test', queryController.test);

// Test Gemini API route
router.get('/test-gemini', queryController.testGemini);

// Main query route with rate limiting
router.post('/api/query', rateLimiter, queryController.handleQuery);

// Handle 404 errors
router.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    details: err.message 
  });
});

export default router; 