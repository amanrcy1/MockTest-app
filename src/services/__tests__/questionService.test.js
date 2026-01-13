// Import first
import {
  fetchQuestionsByExam,
  fetchQuestionsWithFilters,
  clearQuestionCache,
  getQuestionCountsByExam,
} from '../questionService';

// Mock Firebase
const mockCollection = jest.fn();
const mockWhere = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  query: jest.fn((...args) => args[0]),
  where: (...args) => mockWhere(...args),
  getDocs: (...args) => mockGet(...args),
  getDoc: (...args) => mockGetDoc(...args),
  doc: (...args) => mockDoc(...args),
  limit: jest.fn((n) => ({ _limit: n })),
}));

describe('questionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearQuestionCache();
    mockCollection.mockReturnValue({});
    mockWhere.mockReturnThis();
    mockGet.mockResolvedValue({ docs: [] });
  });

  describe('fetchQuestionsByExam', () => {
    it('should fetch questions for given exam type', async () => {
      const mockQuestions = [
        { id: '1', examType: 'CDS', subject: 'Math' },
        { id: '2', examType: 'CDS', subject: 'English' },
      ];

      const mockSnapshot = {
        docs: mockQuestions.map(q => ({
          id: q.id,
          data: () => q,
        })),
      };

      mockGet.mockResolvedValue(mockSnapshot);

      const result = await fetchQuestionsByExam('CDS');

      expect(result).toHaveLength(2);
      expect(result[0].examType).toBe('CDS');
    });

    it('should cache results', async () => {
      const mockSnapshot = {
        docs: [{ id: '1', data: () => ({ examType: 'CDS' }) }],
      };

      mockGet.mockResolvedValue(mockSnapshot);

      // First call
      await fetchQuestionsByExam('CDS');
      const firstCallCount = mockGet.mock.calls.length;

      // Second call should use cache
      await fetchQuestionsByExam('CDS');
      expect(mockGet.mock.calls.length).toBe(firstCallCount);
    });

    it('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(fetchQuestionsByExam('CDS')).rejects.toThrow('Network error');
    });
  });

  describe('fetchQuestionsWithFilters', () => {
    it('should apply exam type filter', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await fetchQuestionsWithFilters({ examType: 'CSAT' });

      expect(mockWhere).toHaveBeenCalledWith('examType', '==', 'CSAT');
    });

    it('should apply multiple filters', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await fetchQuestionsWithFilters({
        examType: 'CDS',
        subject: 'Math',
        difficulty: 'Hard',
      });

      expect(mockWhere).toHaveBeenCalledWith('examType', '==', 'CDS');
      expect(mockWhere).toHaveBeenCalledWith('subject', '==', 'Math');
      expect(mockWhere).toHaveBeenCalledWith('difficulty', '==', 'Hard');
    });
  });

  describe('clearQuestionCache', () => {
    it('should clear specific cache key', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      // Populate cache
      await fetchQuestionsByExam('CDS');
      const firstCallCount = mockGet.mock.calls.length;

      // Clear cache
      clearQuestionCache('questions_CDS');

      // Should fetch again
      await fetchQuestionsByExam('CDS');
      expect(mockGet.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('should clear all cache when no key provided', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await fetchQuestionsByExam('CDS');
      await fetchQuestionsByExam('CSAT');
      const callsAfterCache = mockGet.mock.calls.length;

      clearQuestionCache();

      await fetchQuestionsByExam('CDS');
      await fetchQuestionsByExam('CSAT');
      expect(mockGet.mock.calls.length).toBeGreaterThan(callsAfterCache);
    });
  });

  describe('getQuestionCountsByExam', () => {
    it('should fetch from stats collection first', async () => {
      const mockStatsData = {
        CDS: 100,
        CSAT: 80,
        'IAS-GS': 120,
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockStatsData,
      });

      const result = await getQuestionCountsByExam();

      expect(result).toEqual(mockStatsData);
    });

    it('should fallback to manual count if stats unavailable', async () => {
      const mockQuestions = [
        { data: () => ({ examType: 'CDS' }) },
        { data: () => ({ examType: 'CDS' }) },
        { data: () => ({ examType: 'CSAT' }) },
      ];

      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockGet.mockResolvedValue({
        forEach: (callback) => mockQuestions.forEach(callback),
      });

      const result = await getQuestionCountsByExam();

      expect(result).toEqual({ CDS: 2, CSAT: 1 });
    });
  });
});
