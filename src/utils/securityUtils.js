/**
 * Security utilities for the application
 */

/**
 * Content Security Policy headers
 * Production: strict policy without unsafe-eval
 * Development: relaxed for React hot-reload / dev tools
 */
const isProd = import.meta.env.PROD;

export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    isProd
      ? "script-src 'self'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://api.groq.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

/**
 * Rate limiting for API calls (client-side)
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  canMakeRequest(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key) {
    this.requests.delete(key);
  }
}

// Export rate limiters for different operations
export const aiRequestLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const authLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes
export const testSubmitLimiter = new RateLimiter(20, 3600000); // 20 submissions per hour

/**
 * Validate and sanitize file uploads
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }

  // Check file extension
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`File extension ${ext} not allowed`);
  }

  return true;
};

/**
 * Secure localStorage wrapper with error handling
 */
export const secureStorage = {
  setItem: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        if (import.meta.env.DEV) {
           
          console.error('localStorage quota exceeded');
        }
        // Clear old data
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.includes('Session') && k !== key) {
            localStorage.removeItem(k);
          }
        });
        // Retry
        try {
          const serialized = JSON.stringify(value);
          localStorage.setItem(key, serialized);
          return true;
        } catch (_retryError) {
          if (import.meta.env.DEV) {
             
            console.error('localStorage still full after cleanup');
          }
        }
      }
      return false;
    }
  },

  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('Error reading from localStorage:', error);
      }
      return defaultValue;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('Error removing from localStorage:', error);
      }
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('Error clearing localStorage:', error);
      }
      return false;
    }
  }
};

/**
 * Prevent timing attacks on string comparison
 */
export const constantTimeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Generate secure random string
 */
export const generateSecureToken = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
