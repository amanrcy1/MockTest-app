import {
  shuffleArray,
  calculateScore,
  formatTime,
  getQuestionStatus,
  sanitizeInput,
  isValidEmail,
} from '../testUtils';

describe('testUtils', () => {
  describe('shuffleArray', () => {
    it('should return array with same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      expect(shuffled).toHaveLength(arr.length);
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3];
      const original = [...arr];
      shuffleArray(arr);
      expect(arr).toEqual(original);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      arr.forEach(item => {
        expect(shuffled).toContain(item);
      });
    });
  });

  describe('calculateScore', () => {
    const questions = [
      { id: '1', correctAnswer: 'A' },
      { id: '2', correctAnswer: 'B' },
      { id: '3', correctAnswer: 'C' },
    ];

    it('should calculate correct score for all correct answers', () => {
      const responses = [
        { selectedAnswer: 'A', marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: 'B', marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: 'C', marksPerQuestion: 1, negativeMarking: -0.33 },
      ];

      const result = calculateScore(responses, questions);
      expect(result.correct).toBe(3);
      expect(result.incorrect).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.totalMarks).toBe(3);
    });

    it('should handle incorrect answers with negative marking', () => {
      const responses = [
        { selectedAnswer: 'B', marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: 'A', marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: 'C', marksPerQuestion: 1, negativeMarking: -0.33 },
      ];

      const result = calculateScore(responses, questions);
      expect(result.correct).toBe(1);
      expect(result.incorrect).toBe(2);
      expect(result.totalMarks).toBeCloseTo(0.34, 1);
    });

    it('should handle skipped questions', () => {
      const responses = [
        { selectedAnswer: null, marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: 'B', marksPerQuestion: 1, negativeMarking: -0.33 },
        { selectedAnswer: null, marksPerQuestion: 1, negativeMarking: -0.33 },
      ];

      const result = calculateScore(responses, questions);
      expect(result.correct).toBe(1);
      expect(result.skipped).toBe(2);
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3661)).toBe('1:01:01');
    });

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should handle negative numbers', () => {
      expect(formatTime(-10)).toBe('0:00');
    });
  });

  describe('getQuestionStatus', () => {
    it('should return not-visited for unvisited questions', () => {
      expect(getQuestionStatus({ visited: false })).toBe('not-visited');
      expect(getQuestionStatus(null)).toBe('not-visited');
    });

    it('should return answered for answered questions', () => {
      expect(getQuestionStatus({ 
        visited: true, 
        selectedAnswer: 'A' 
      })).toBe('answered');
    });

    it('should return marked for marked questions', () => {
      expect(getQuestionStatus({ 
        visited: true, 
        markedForReview: true 
      })).toBe('marked');
    });

    it('should return answered-marked for answered and marked', () => {
      expect(getQuestionStatus({ 
        visited: true, 
        selectedAnswer: 'A',
        markedForReview: true 
      })).toBe('answered-marked');
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle quotes', () => {
      expect(sanitizeInput("It's a test")).toContain('&#x27;');
      expect(sanitizeInput('Say "hello"')).toContain('&quot;');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });
});
