import {
  saveTestResult,
  getUserStats,
} from '../testService';
import { testSubmitLimiter } from '../../utils/securityUtils';

jest.mock('../../config/firebase');
jest.mock('../../utils/securityUtils');

describe('testService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveTestResult', () => {
    it('should save test result when rate limit allows', async () => {
      testSubmitLimiter.canMakeRequest = jest.fn().mockReturnValue(true);
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'test123' });
      require('firebase/firestore').addDoc = mockAddDoc;

      const testData = {
        userId: 'user1',
        score: 85,
        examType: 'prelims',
      };

      const result = await saveTestResult(testData);
      expect(result).toBe('test123');
      expect(testSubmitLimiter.canMakeRequest).toHaveBeenCalledWith('user1');
    });

    it('should throw error when rate limit exceeded', async () => {
      testSubmitLimiter.canMakeRequest = jest.fn().mockReturnValue(false);

      const testData = { userId: 'user1', score: 85 };

      await expect(saveTestResult(testData)).rejects.toThrow(
        'Too many test submissions'
      );
    });
  });

  describe('getUserStats', () => {
    it('should calculate stats correctly', async () => {
      const mockTests = [
        { accuracy: 80, timeTaken: 3600 },
        { accuracy: 90, timeTaken: 3000 },
        { accuracy: 70, timeTaken: 4000 },
      ];

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockTests.map(data => ({ data: () => data })),
      });
      require('firebase/firestore').getDocs = mockGetDocs;

      const stats = await getUserStats('user1');

      expect(stats.attempted).toBe(3);
      expect(stats.averageAccuracy).toBe(80);
      expect(stats.totalTimeTaken).toBe(10600);
    });

    it('should handle no tests', async () => {
      const mockGetDocs = jest.fn().mockResolvedValue({ docs: [] });
      require('firebase/firestore').getDocs = mockGetDocs;

      const stats = await getUserStats('user1');

      expect(stats.attempted).toBe(0);
      expect(stats.averageAccuracy).toBe(0);
      expect(stats.totalTimeTaken).toBe(0);
    });
  });
});
