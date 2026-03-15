import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// ThemeContext uses localStorage directly, so we need a real-ish mock
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  }),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

describe('ThemeContext', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    // Re-set mock implementations after clearAllMocks
    localStorageMock.getItem.mockImplementation((key) => storage[key] || null);
    localStorageMock.setItem.mockImplementation((key, value) => {
      storage[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key) => {
      delete storage[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    });
    // Ensure matchMedia is properly mocked
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should provide theme value', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBeDefined();
    expect(['light', 'dark']).toContain(result.current.theme);
  });

  it('should provide isDark boolean', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.isDark).toBe('boolean');
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    const initial = result.current.isDark;
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.isDark).toBe(!initial);
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggleTheme();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', expect.any(String));
  });

  it('should apply dark class to document', async () => {
    storage['theme'] = 'dark';
    renderHook(() => useTheme(), { wrapper });
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should throw when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation();
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });
});
