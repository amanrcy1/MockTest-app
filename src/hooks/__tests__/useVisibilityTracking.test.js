import { renderHook, act } from '@testing-library/react';
import { useVisibilityTracking } from '../useVisibilityTracking';

describe('useVisibilityTracking', () => {
  it('should initialize with visible and focused state', () => {
    const { result } = renderHook(() => useVisibilityTracking());
    expect(result.current.isVisible).toBe(true);
    expect(result.current.isFocused).toBe(true);
    expect(result.current.violations).toBe(0);
  });

  it('should not track when inactive', () => {
    const onTabSwitch = jest.fn();
    renderHook(() => useVisibilityTracking(false, { onTabSwitch }));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onTabSwitch).not.toHaveBeenCalled();
  });

  it('should track violations when active', () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const onTabSwitch = jest.fn();
    const { result } = renderHook(() => useVisibilityTracking(true, { onTabSwitch }));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.violations).toBeGreaterThanOrEqual(0);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('should reset violations', () => {
    const { result } = renderHook(() => useVisibilityTracking(true));
    act(() => { result.current.resetViolations(); });
    expect(result.current.violations).toBe(0);
  });

  it('should calculate remaining attempts', () => {
    const { result } = renderHook(() => useVisibilityTracking(false, { maxViolations: 5 }));
    expect(result.current.remainingAttempts).toBe(5);
  });

  it('should cleanup listeners on unmount', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useVisibilityTracking(true));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeSpy.mockRestore();
  });
});
