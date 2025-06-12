import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  port: process.env.PORT || 5002,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: "gemini-1.5-pro",
  
  // Rate limiting configuration
  rateLimits: {
    windowMs: {
      minute: 60 * 1000,        // 1 minute
      hour: 60 * 60 * 1000,     // 1 hour
      day: 24 * 60 * 60 * 1000  // 24 hours
    },
    maxRequests: {
      perMinute: 1,
      perHour: 20,
      perDay: 100
    }
  },
  
  // Cache configuration
  cache: {
    duration: 24 * 60 * 60 * 1000  // 24 hours
  }
}; 