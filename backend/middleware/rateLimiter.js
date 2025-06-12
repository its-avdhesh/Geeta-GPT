import { config } from '../config/config.js';

// Track requests at different time windows
const requestCounts = new Map();
const minuteRequests = new Map();
const dailyRequests = new Map();

export const rateLimiter = (req, res, next) => {
  const clientIP = req.ip;
  const now = Date.now();
  
  // Clean up old entries
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.timestamp > config.rateLimits.windowMs.hour) {
      requestCounts.delete(ip);
    }
  }
  
  for (const [ip, data] of minuteRequests.entries()) {
    if (now - data.timestamp > config.rateLimits.windowMs.minute) {
      minuteRequests.delete(ip);
    }
  }

  for (const [ip, data] of dailyRequests.entries()) {
    if (now - data.timestamp > config.rateLimits.windowMs.day) {
      dailyRequests.delete(ip);
    }
  }

  // Get or initialize client data
  const clientData = requestCounts.get(clientIP) || { count: 0, timestamp: now };
  const minuteData = minuteRequests.get(clientIP) || { count: 0, timestamp: now };
  const dailyData = dailyRequests.get(clientIP) || { count: 0, timestamp: now };
  
  // Check per-minute limit
  if (minuteData.count >= config.rateLimits.maxRequests.perMinute) {
    const timeLeft = config.rateLimits.windowMs.minute - (now - minuteData.timestamp);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please wait ${Math.ceil(timeLeft / 1000)} seconds before trying again.`,
      quota: {
        used: minuteData.count,
        limit: config.rateLimits.maxRequests.perMinute,
        window: '1 minute',
        resetIn: Math.ceil(timeLeft / 1000)
      }
    });
  }

  // Check per-hour limit
  if (clientData.count >= config.rateLimits.maxRequests.perHour) {
    const timeLeft = config.rateLimits.windowMs.hour - (now - clientData.timestamp);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Hourly quota exceeded. Please try again in ${Math.ceil(timeLeft / 60000)} minutes.`,
      quota: {
        used: clientData.count,
        limit: config.rateLimits.maxRequests.perHour,
        window: '1 hour',
        resetIn: Math.ceil(timeLeft / 60000)
      }
    });
  }

  // Check per-day limit
  if (dailyData.count >= config.rateLimits.maxRequests.perDay) {
    const timeLeft = config.rateLimits.windowMs.day - (now - dailyData.timestamp);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Daily quota exceeded. Please try again in ${Math.ceil(timeLeft / (60 * 60 * 1000))} hours.`,
      quota: {
        used: dailyData.count,
        limit: config.rateLimits.maxRequests.perDay,
        window: '24 hours',
        resetIn: Math.ceil(timeLeft / (60 * 60 * 1000))
      }
    });
  }

  // Update client data
  clientData.count++;
  minuteData.count++;
  dailyData.count++;
  requestCounts.set(clientIP, clientData);
  minuteRequests.set(clientIP, minuteData);
  dailyRequests.set(clientIP, dailyData);
  
  // Add quota info to response headers
  res.setHeader('X-RateLimit-Limit-Minute', config.rateLimits.maxRequests.perMinute);
  res.setHeader('X-RateLimit-Remaining-Minute', config.rateLimits.maxRequests.perMinute - minuteData.count);
  res.setHeader('X-RateLimit-Reset-Minute', Math.ceil((minuteData.timestamp + config.rateLimits.windowMs.minute - now) / 1000));
  
  res.setHeader('X-RateLimit-Limit-Hour', config.rateLimits.maxRequests.perHour);
  res.setHeader('X-RateLimit-Remaining-Hour', config.rateLimits.maxRequests.perHour - clientData.count);
  res.setHeader('X-RateLimit-Reset-Hour', Math.ceil((clientData.timestamp + config.rateLimits.windowMs.hour - now) / 1000));
  
  res.setHeader('X-RateLimit-Limit-Day', config.rateLimits.maxRequests.perDay);
  res.setHeader('X-RateLimit-Remaining-Day', config.rateLimits.maxRequests.perDay - dailyData.count);
  res.setHeader('X-RateLimit-Reset-Day', Math.ceil((dailyData.timestamp + config.rateLimits.windowMs.day - now) / (60 * 60)));
  
  next();
}; 