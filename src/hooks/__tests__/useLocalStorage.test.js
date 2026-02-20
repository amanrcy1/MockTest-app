import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should initialize with value from localStorage if it exists', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify('updated'));
  });

  it('should handle function updater', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it('should remove item from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'value'));

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe('value'); // Returns to default
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should handle complex objects', () => {
    const complexObject = {
      name: 'Test',
      nested: { value: 123 },
      array: [1, 2, 3],
    };

    const { result } = renderHook(() => useLocalStorage('complex', complexObject));

    expect(result.current[0]).toEqual(complexObject);

    act(() => {
      result.current[1]({ ...complexObject, name: 'Updated' });
    });

    expect(result.current[0].name).toBe('Updated');
    expect(JSON.parse(localStorage.getItem('complex')).name).toBe('Updated');
  });

  it('should handle arrays', () => {
    const { result } = renderHook(() => useLocalStorage('array', [1, 2, 3]));

    expect(result.current[0]).toEqual([1, 2, 3]);

    act(() => {
      result.current[1]([...result.current[0], 4]);
    });

    expect(result.current[0]).toEqual([1, 2, 3, 4]);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage('nullKey', null));

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]('notNull');
    });

    expect(result.current[0]).toBe('notNull');
  });

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('boolKey', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(JSON.parse(localStorage.getItem('boolKey'))).toBe(true);
  });

  it('should handle number values', () => {
    const { result } = renderHook(() => useLocalStorage('numKey', 42));

    expect(result.current[0]).toBe(42);

    act(() => {
      result.current[1](100);
    });

    expect(result.current[0]).toBe(100);
  });

  it('should handle localStorage errors gracefully', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useLocalStorage('testKey', 'value'));

    act(() => {
      result.current[1]('newValue');
    });

    // Should not crash, value should still update in state
    expect(result.current[0]).toBe('newValue');

    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorage.setItem('invalidKey', 'not valid JSON {');

    const { result } = renderHook(() => useLocalStorage('invalidKey', 'default'));

    // Should fall back to default value
    expect(result.current[0]).toBe('default');
  });

  it('should sync localStorage across multiple hook instances', () => {
    const { result } = renderHook(() => useLocalStorage('sharedKey', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    // Value should be updated in state and localStorage
    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem('sharedKey'))).toBe('updated');
  });

  it('should handle empty string as valid value', () => {
    const { result } = renderHook(() => useLocalStorage('emptyKey', 'default'));

    act(() => {
      result.current[1]('');
    });

    expect(result.current[0]).toBe('');
    expect(JSON.parse(localStorage.getItem('emptyKey'))).toBe('');
  });

  it('should handle zero as valid value', () => {
    const { result } = renderHook(() => useLocalStorage('zeroKey', 10));

    act(() => {
      result.current[1](0);
    });

    expect(result.current[0]).toBe(0);
    expect(JSON.parse(localStorage.getItem('zeroKey'))).toBe(0);
  });
});
