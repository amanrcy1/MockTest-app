/**
 * Performance monitoring utilities
 * Tracks Web Vitals and custom metrics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { logEvent } from './errorTracking';

/**
 * Report Web Vitals to analytics
 */
export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
};

/**
 * Send Web Vitals to monitoring service
 */
export const sendToAnalytics = ({ name, delta, value, id }) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Performance] ${name}:`, { delta, value, id });
  }
  
  // Send to analytics in production
  if (import.meta.env.PROD) {
    logEvent('web_vital', {
      metric: name,
      value: Math.round(name === 'CLS' ? delta * 1000 : delta),
      id,
    });
    
    // Send to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', name, {
        value: Math.round(name === 'CLS' ? delta * 1000 : delta),
        metric_id: id,
        metric_value: value,
        metric_delta: delta,
      });
    }
  }
};


/**
 * Measure custom performance metrics
 */
export class PerformanceTracker {
  constructor(name) {
    this.name = name;
    this.startTime = performance.now();
  }
  
  end() {
    const duration = performance.now() - this.startTime;
    
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${this.name}: ${duration.toFixed(2)}ms`);
    }
    
    if (import.meta.env.PROD) {
      logEvent('custom_metric', {
        name: this.name,
        duration: Math.round(duration),
      });
    }
    
    return duration;
  }
}

/**
 * Track component render time
 */
export const trackRender = (componentName) => {
  return new PerformanceTracker(`render_${componentName}`);
};

/**
 * Track API call duration
 */
export const trackAPICall = (endpoint) => {
  return new PerformanceTracker(`api_${endpoint}`);
};

/**
 * Track test submission time
 */
export const trackTestSubmission = () => {
  return new PerformanceTracker('test_submission');
};

/**
 * Get performance metrics summary
 */
export const getPerformanceMetrics = () => {
  if (!window.performance) return null;
  
  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');
  
  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    request: navigation?.responseStart - navigation?.requestStart,
    response: navigation?.responseEnd - navigation?.responseStart,
    dom: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
    load: navigation?.loadEventEnd - navigation?.loadEventStart,
    
    // Paint timing
    fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
    
    // Memory (if available)
    memory: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    } : null,
  };
};

/**
 * Monitor long tasks (> 50ms)
 */
export const monitorLongTasks = () => {
  if (!window.PerformanceObserver) return;
  
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
           
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          
          if (import.meta.env.PROD) {
            logEvent('long_task', {
              duration: Math.round(entry.duration),
              startTime: Math.round(entry.startTime),
            });
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Long task API not supported
  }
};

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = () => {
  // Report Web Vitals
  reportWebVitals(sendToAnalytics);
  
  // Monitor long tasks
  monitorLongTasks();
  
  // Log initial metrics after page load
  if (document.readyState === 'complete') {
    logInitialMetrics();
  } else {
    window.addEventListener('load', logInitialMetrics);
  }
};

const logInitialMetrics = () => {
  setTimeout(() => {
    const metrics = getPerformanceMetrics();
    if (metrics && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.table(metrics);
    }
  }, 0);
};

const performanceUtils = {
  reportWebVitals,
  sendToAnalytics,
  PerformanceTracker,
  trackRender,
  trackAPICall,
  trackTestSubmission,
  getPerformanceMetrics,
  initPerformanceMonitoring,
};

export default performanceUtils;
