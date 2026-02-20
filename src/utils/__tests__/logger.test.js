import { vi } from 'vitest';
// Logger checks NODE_ENV at module load time, so we test what we can
import logger from '../logger';

describe('logger', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('should have log method', () => {
    expect(typeof logger.log).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof logger.warn).toBe('function');
  });

  it('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('should not throw when calling log', () => {
    expect(() => logger.log('test')).not.toThrow();
  });

  it('should not throw when calling error', () => {
    expect(() => logger.error('test error')).not.toThrow();
  });

  it('should not throw when calling error with Error object', () => {
    expect(() => logger.error('msg', new Error('test'))).not.toThrow();
  });

  it('should not throw when calling warn', () => {
    expect(() => logger.warn('test warning')).not.toThrow();
  });

  it('should not throw when calling info', () => {
    expect(() => logger.info('test info')).not.toThrow();
  });

  it('should accept multiple arguments', () => {
    expect(() => logger.log('a', 'b', 'c')).not.toThrow();
    expect(() => logger.warn('a', 'b')).not.toThrow();
    expect(() => logger.info('a', 'b')).not.toThrow();
  });
});
