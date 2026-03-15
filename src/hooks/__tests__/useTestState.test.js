import { renderHook, act } from '@testing-library/react';
import { useTestState } from '../useTestState';

describe('useTestState', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useTestState());
    expect(result.current.state.questions).toEqual([]);
    expect(result.current.state.responses).toEqual([]);
    expect(result.current.state.currentQuestionIndex).toBe(0);
    expect(result.current.state.currentSectionIndex).toBe(0);
  });

  it('should set questions', () => {
    const { result } = renderHook(() => useTestState());
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    act(() => {
      result.current.actions.setQuestions(questions);
    });
    expect(result.current.state.questions).toEqual(questions);
  });

  it('should set sections', () => {
    const { result } = renderHook(() => useTestState());
    const sections = [{ id: 's1', name: 'English' }];
    act(() => {
      result.current.actions.setSections(sections);
    });
    expect(result.current.state.sections).toEqual(sections);
  });

  it('should set current question index', () => {
    const { result } = renderHook(() => useTestState());
    act(() => {
      result.current.actions.setCurrentQuestion(5);
    });
    expect(result.current.state.currentQuestionIndex).toBe(5);
  });

  it('should set current section index', () => {
    const { result } = renderHook(() => useTestState());
    act(() => {
      result.current.actions.setCurrentSection(2);
    });
    expect(result.current.state.currentSectionIndex).toBe(2);
  });

  it('should set time remaining', () => {
    const { result } = renderHook(() => useTestState());
    act(() => {
      result.current.actions.setTimeRemaining(3600);
    });
    expect(result.current.state.timeRemaining).toBe(3600);
  });

  it('should toggle bookmark', () => {
    const { result } = renderHook(() => useTestState());
    act(() => {
      result.current.actions.toggleBookmark('q1', 'b1');
    });
    expect(result.current.state.bookmarkMap['q1']).toBe('b1');
    act(() => {
      result.current.actions.toggleBookmark('q1', null);
    });
    expect(result.current.state.bookmarkMap['q1']).toBeUndefined();
  });

  it('should load session data', () => {
    const { result } = renderHook(() => useTestState());
    const sessionData = { timeRemaining: 1800, currentQuestionIndex: 10 };
    act(() => {
      result.current.actions.loadSession(sessionData);
    });
    expect(result.current.state.timeRemaining).toBe(1800);
    expect(result.current.state.currentQuestionIndex).toBe(10);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useTestState());
    act(() => {
      result.current.actions.setTimeRemaining(3600);
    });
    act(() => {
      result.current.actions.reset();
    });
    expect(result.current.state.timeRemaining).toBe(0);
    expect(result.current.state.questions).toEqual([]);
  });
});
