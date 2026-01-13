import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should initialize with correct time', () => {
    const { result } = renderHook(() => useTimer(60));

    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isExpired).toBe(false);
  });

  it('should start and pause timer', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(false);
  });

  it('should reset timer to initial time', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.setTime(5);
    });

    expect(result.current.timeRemaining).toBe(5);

    act(() => {
      result.current.reset();
    });

    expect(result.current.timeRemaining).toBe(10);
    expect(result.current.isRunning).toBe(false);
  });

  it('should reset timer to custom time', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.reset(20);
    });

    expect(result.current.timeRemaining).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });

  it('should handle autoStart option', () => {
    const { result } = renderHook(() => useTimer(10, null, true));

    expect(result.current.isRunning).toBe(true);
  });

  it('should format time correctly with hours', () => {
    const { result } = renderHook(() => useTimer(3665)); // 1h 1m 5s

    expect(result.current.formattedTime).toBe('1:01:05');
  });

  it('should format time without hours for short durations', () => {
    const { result } = renderHook(() => useTimer(125)); // 2m 5s

    expect(result.current.formattedTime).toBe('2:05');
  });

  it('should provide formatTime function', () => {
    const { result } = renderHook(() => useTimer(125));
    
    expect(result.current.formatTime(3665)).toBe('1:01:05');
    expect(result.current.formatTime(125)).toBe('2:05');
    expect(result.current.formatTime(59)).toBe('0:59');
  });

  it('should set time using setTime', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.setTime(50);
    });

    expect(result.current.timeRemaining).toBe(50);
  });

  it('should show warning state when less than 5 minutes', () => {
    const { result } = renderHook(() => useTimer(299));

    expect(result.current.isWarning).toBe(true);
    expect(result.current.isCritical).toBe(false);
  });

  it('should show critical state when less than 1 minute', () => {
    const { result } = renderHook(() => useTimer(59));

    expect(result.current.isWarning).toBe(true);
    expect(result.current.isCritical).toBe(true);
  });

  it('should not show warning when time is sufficient', () => {
    const { result } = renderHook(() => useTimer(600));

    expect(result.current.isWarning).toBe(false);
    expect(result.current.isCritical).toBe(false);
  });

  it('should mark as expired when time is zero', () => {
    const { result } = renderHook(() => useTimer(0));

    expect(result.current.isExpired).toBe(true);
  });
});
