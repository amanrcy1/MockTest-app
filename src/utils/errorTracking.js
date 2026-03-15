/**
 * Error tracking and monitoring utilities
 * Sentry integration is disabled for now
 */

/**
 * Log error to tracking service
 */
export const logError = (error, context = {}) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error:', error, 'Context:', context);
  }

  // Error tracking can be integrated with services like Sentry if needed
};

/**
 * Log custom event
 */
export const logEvent = (eventName, data = {}) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('Event:', eventName, 'Data:', data);
  }
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (_user) => {
  // No-op for now
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  // No-op for now
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message, category = 'custom', _level = 'info') => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[${category}] ${message}`);
  }
};

const errorTracking = {
  logError,
  logEvent,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
};

export default errorTracking;
