import {
  validateFileUpload,
  secureStorage,
  constantTimeCompare,
  generateSecureToken,
  aiRequestLimiter,
  authLimiter,
} from '../securityUtils';

describe('securityUtils', () => {
  describe('validateFileUpload', () => {
    it('should accept valid image files', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
      
      expect(() => validateFileUpload(validFile)).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB
      
      expect(() => validateFileUpload(largeFile)).toThrow('File size exceeds');
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });
      
      expect(() => validateFileUpload(invalidFile)).toThrow('File type');
    });

    it('should reject invalid file extensions', () => {
      const invalidFile = new File(['content'], 'test.pdf', { type: 'image/jpeg' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });
      
      expect(() => validateFileUpload(invalidFile)).toThrow('File extension');
    });
  });

  describe('secureStorage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store and retrieve data', () => {
      const testData = { name: 'Test', value: 123 };
      secureStorage.setItem('test', testData);
      
      const retrieved = secureStorage.getItem('test');
      expect(retrieved).toEqual(testData);
    });

    it('should return default value for missing keys', () => {
      const defaultValue = { default: true };
      const result = secureStorage.getItem('nonexistent', defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorage.setItem('corrupt', 'invalid json {');
      const result = secureStorage.getItem('corrupt', null);
      
      expect(result).toBeNull();
    });

    it('should remove items', () => {
      secureStorage.setItem('test', { data: 'value' });
      secureStorage.removeItem('test');
      
      expect(secureStorage.getItem('test')).toBeNull();
    });

    it('should clear all items', () => {
      secureStorage.setItem('test1', 'value1');
      secureStorage.setItem('test2', 'value2');
      secureStorage.clear();
      
      expect(secureStorage.getItem('test1')).toBeNull();
      expect(secureStorage.getItem('test2')).toBeNull();
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      expect(constantTimeCompare('secret123', 'secret123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeCompare('secret123', 'secret456')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('short', 'longer string')).toBe(false);
    });

    it('should be timing-safe', () => {
      const str1 = 'a'.repeat(1000);
      const str2 = 'a'.repeat(999) + 'b';
      
      const start1 = performance.now();
      constantTimeCompare(str1, str1);
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      constantTimeCompare(str1, str2);
      const time2 = performance.now() - start2;
      
      // Times should be similar (within 50% variance)
      expect(Math.abs(time1 - time2) / Math.max(time1, time2)).toBeLessThan(0.5);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      // Reset rate limiters before each test
      aiRequestLimiter.reset('test-user');
      authLimiter.reset('test-user');
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(aiRequestLimiter.canMakeRequest('test-user')).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      // AI limiter allows 10 requests per minute
      for (let i = 0; i < 10; i++) {
        aiRequestLimiter.canMakeRequest('test-user');
      }
      
      expect(aiRequestLimiter.canMakeRequest('test-user')).toBe(false);
    });

    it('should track different users separately', () => {
      for (let i = 0; i < 10; i++) {
        aiRequestLimiter.canMakeRequest('user1');
      }
      
      expect(aiRequestLimiter.canMakeRequest('user1')).toBe(false);
      expect(aiRequestLimiter.canMakeRequest('user2')).toBe(true);
    });

    it('should reset specific user', () => {
      for (let i = 0; i < 10; i++) {
        aiRequestLimiter.canMakeRequest('test-user');
      }
      expect(aiRequestLimiter.canMakeRequest('test-user')).toBe(false);
      
      aiRequestLimiter.reset('test-user');
      expect(aiRequestLimiter.canMakeRequest('test-user')).toBe(true);
    });
  });
});
