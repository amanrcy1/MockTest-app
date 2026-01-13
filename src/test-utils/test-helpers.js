import { render } from '@testing-library/react';

/**
 * Render component with minimal setup
 */
export const renderWithProviders = (component) => {
  return render(component);
};

/**
 * Mock localStorage
 */
export const mockLocalStorage = () => {
  const store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

/**
 * Wait for async operations
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Mock Firebase Auth user
 */
export const createMockAuthUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  ...overrides,
});

/**
 * Mock Firestore document
 */
export const createMockDoc = (data) => ({
  exists: () => true,
  data: () => data,
  id: data.id || 'mock-doc-id',
});

/**
 * Mock Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map(data => createMockDoc(data)),
  forEach: (callback) => docs.forEach((data, index) => callback(createMockDoc(data), index)),
});
