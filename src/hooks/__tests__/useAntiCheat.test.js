import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAntiCheat, shuffleWithSeed, randomizeOptions } from '../useAntiCheat';

describe('useAntiCheat', () => {
  beforeEach(() => {
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    });
    document.documentElement.requestFullscreen = vi.fn(() => Promise.resolve());
    document.exitFullscreen = vi.fn(() => Promise.resolve());
  });

  describe('hook functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAntiCheat(false));

      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.violationCount).toBe(0);
      expect(result.current.showViolationModal).toBe(false);
    });

    it('should enter fullscreen when requested', async () => {
      const { result } = renderHook(() => useAntiCheat(true));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when requested', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        value: document.documentElement,
      });
      const { result } = renderHook(() => useAntiCheat(true));

      await act(async () => {
        result.current.exitFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should reset violations', () => {
      const { result } = renderHook(() => useAntiCheat(true));

      act(() => {
        result.current.resetViolations();
      });

      expect(result.current.violationCount).toBe(0);
      expect(result.current.showViolationModal).toBe(false);
    });
  });

  describe('shuffleWithSeed', () => {
    it('should shuffle array deterministically', () => {
      const array = [1, 2, 3, 4, 5];
      const seed = 12345;

      const shuffled1 = shuffleWithSeed(array, seed);
      const shuffled2 = shuffleWithSeed(array, seed);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('should not modify original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];

      shuffleWithSeed(array, 12345);

      expect(array).toEqual(original);
    });

    it('should produce different results with different seeds', () => {
      const array = [1, 2, 3, 4, 5];

      const shuffled1 = shuffleWithSeed(array, 111);
      const shuffled2 = shuffleWithSeed(array, 222);

      expect(shuffled1).not.toEqual(shuffled2);
    });

    it('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = shuffleWithSeed(array, 12345);

      expect(shuffled.sort()).toEqual(array.sort());
    });
  });

  describe('randomizeOptions', () => {
    const question = {
      id: 'q1',
      questionText: 'Test question?',
      options: {
        A: 'Option A',
        B: 'Option B',
        C: 'Option C',
        D: 'Option D',
      },
      correctAnswer: 'B',
    };

    it('should randomize options deterministically', () => {
      const seed = 12345;

      const randomized1 = randomizeOptions(question, seed);
      const randomized2 = randomizeOptions(question, seed);

      expect(randomized1.options).toEqual(randomized2.options);
      expect(randomized1.correctAnswer).toBe(randomized2.correctAnswer);
    });

    it('should preserve correct answer mapping', () => {
      const randomized = randomizeOptions(question, 12345);
      const originalCorrectText = question.options[question.correctAnswer];
      const newCorrectText = randomized.options[randomized.correctAnswer];

      expect(newCorrectText).toBe(originalCorrectText);
    });

    it('should store original correct answer', () => {
      const randomized = randomizeOptions(question, 12345);

      expect(randomized._originalCorrectAnswer).toBe('B');
    });

    it('should contain all original options', () => {
      const randomized = randomizeOptions(question, 12345);
      const originalValues = Object.values(question.options).sort();
      const randomizedValues = Object.values(randomized.options).sort();

      expect(randomizedValues).toEqual(originalValues);
    });

    it('should handle questions without options', () => {
      const questionWithoutOptions = { ...question, options: undefined };
      const randomized = randomizeOptions(questionWithoutOptions, 12345);

      expect(randomized).toEqual(questionWithoutOptions);
    });
  });
});
