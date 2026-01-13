/**
 * Production-safe logger
 * Only logs in development, suppresses in production
 */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  
  error: (message, error = null) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(message, error);
    }
    // In production, you could send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  },
  
  warn: (...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
};

export { logger };
export default logger;
