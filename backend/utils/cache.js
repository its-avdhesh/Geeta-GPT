import { config } from '../config/config.js';

const responseCache = new Map();

export const cache = {
  get: (key) => {
    const cachedResponse = responseCache.get(key);
    if (cachedResponse && (Date.now() - cachedResponse.timestamp < config.cache.duration)) {
      return cachedResponse.data;
    }
    return null;
  },

  set: (key, data) => {
    responseCache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  clear: () => {
    responseCache.clear();
  }
}; 