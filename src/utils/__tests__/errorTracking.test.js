import { vi } from 'vitest';
import {
  logError,
  logEvent,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
} from '../errorTracking';

describe('errorTracking', () => {
  let consoleErrorSpy;
  let consoleLogSpy;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('logError', () => {
    it('should log error in development', () => {
      const error = new Error('test');
      logError(error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should accept context parameter', () => {
      logError(new Error('test'), { userId: '123' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('logEvent', () => {
    it('should log event in development', () => {
      logEvent('test_event', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('setUserContext', () => {
    it('should not throw', () => {
      expect(() => setUserContext({ id: '123' })).not.toThrow();
    });
  });

  describe('clearUserContext', () => {
    it('should not throw', () => {
      expect(() => clearUserContext()).not.toThrow();
    });
  });

  describe('addBreadcrumb', () => {
    it('should log breadcrumb in development', () => {
      addBreadcrumb('clicked button', 'ui');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle default category', () => {
      addBreadcrumb('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('custom'));
    });
  });
});
