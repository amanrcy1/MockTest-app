import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, createTestShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('should register keydown listener on window', () => {
    const spy = jest.spyOn(window, 'addEventListener');
    renderHook(() => useKeyboardShortcuts({ n: jest.fn() }));
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
  });

  it('should remove listener on unmount', () => {
    const spy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts({ n: jest.fn() }));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
  });

  it('should call handler when matching key pressed', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ n: handler }));
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
      Object.defineProperty(event, 'target', { value: document.body });
      window.dispatchEvent(event);
    });
    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler when disabled', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ n: handler }, false));
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
      Object.defineProperty(event, 'target', { value: document.body });
      window.dispatchEvent(event);
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle empty shortcuts', () => {
    expect(() => {
      renderHook(() => useKeyboardShortcuts({}));
    }).not.toThrow();
  });
});

describe('createTestShortcuts', () => {
  it('should create shortcuts for options A-D', () => {
    const onSelectOption = jest.fn();
    const shortcuts = createTestShortcuts({ onSelectOption });
    shortcuts['1']();
    expect(onSelectOption).toHaveBeenCalledWith('A');
    shortcuts['2']();
    expect(onSelectOption).toHaveBeenCalledWith('B');
    shortcuts['3']();
    expect(onSelectOption).toHaveBeenCalledWith('C');
    shortcuts['4']();
    expect(onSelectOption).toHaveBeenCalledWith('D');
  });

  it('should create shortcuts for navigation', () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    const shortcuts = createTestShortcuts({ onNext, onPrevious });
    shortcuts['n']();
    expect(onNext).toHaveBeenCalled();
    shortcuts['p']();
    expect(onPrevious).toHaveBeenCalled();
  });

  it('should create shortcut for mark for review', () => {
    const onMarkForReview = jest.fn();
    const shortcuts = createTestShortcuts({ onMarkForReview });
    shortcuts['m']();
    expect(onMarkForReview).toHaveBeenCalled();
  });
});
