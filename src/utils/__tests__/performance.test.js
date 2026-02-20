import { vi } from 'vitest';
import {
  PerformanceTracker,
  trackRender,
  trackAPICall,
  getPerformanceMetrics,
} from '../performance';

describe('performance utilities', () => {
  describe('PerformanceTracker', () => {
    it('should track duration', (done) => {
      const tracker = new PerformanceTracker('test-operation');
      
      setTimeout(() => {
        const duration = tracker.end();
        expect(duration).toBeGreaterThan(50);
        expect(duration).toBeLessThan(150);
        done();
      }, 100);
    });

    it('should return duration in milliseconds', () => {
      const tracker = new PerformanceTracker('test');
      const duration = tracker.end();
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('trackRender', () => {
    it('should create tracker with component name', () => {

      const perfTracker = trackRender('TestComponent');
      expect(perfTracker).toBeInstanceOf(PerformanceTracker);
      expect(perfTracker.name).toBe('render_TestComponent');
    });
  });

  describe('trackAPICall', () => {
    it('should create tracker with endpoint name', () => {
      const tracker = trackAPICall('/api/questions');
      expect(tracker).toBeInstanceOf(PerformanceTracker);
      expect(tracker.name).toBe('api_/api/questions');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return null if performance API unavailable', () => {
      const originalPerformance = global.performance;
      delete global.performance;
      
      const metrics = getPerformanceMetrics();
      expect(metrics).toBeNull();
      
      global.performance = originalPerformance;
    });

    it('should return metrics object when available', () => {
      // Mock performance API
      global.performance = {
        getEntriesByType: vi.fn((type) => {
          if (type === 'navigation') {
            return [{
              domainLookupStart: 0,
              domainLookupEnd: 10,
              connectStart: 10,
              connectEnd: 20,
              requestStart: 20,
              responseStart: 30,
              responseEnd: 40,
              domContentLoadedEventStart: 50,
              domContentLoadedEventEnd: 60,
              loadEventStart: 70,
              loadEventEnd: 80,
            }];
          }
          if (type === 'paint') {
            return [
              { name: 'first-contentful-paint', startTime: 100 },
            ];
          }
          return [];
        }),
        memory: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 20 * 1024 * 1024,
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
      };
      
      const metrics = getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.dns).toBe(10);
      expect(metrics.tcp).toBe(10);
      expect(metrics.fcp).toBe(100);
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.used).toBe(10);
    });
  });
});
