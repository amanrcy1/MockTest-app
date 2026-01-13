import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock Firebase modules
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Create mock functions
const mockOnAuthStateChanged = jest.fn((auth, callback) => {
  callback(null);
  return jest.fn();
});

const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  sendEmailVerification: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  updateEmail: jest.fn(),
}));

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(() => ({})),
  query: jest.fn((col) => col),
  where: jest.fn(() => ({})),
  getDocs: (...args) => mockGetDocs(...args),
  limit: jest.fn(() => ({})),
  runTransaction: jest.fn((db, fn) => fn({
    get: jest.fn(() => Promise.resolve({ exists: () => false })),
    set: jest.fn(),
  })),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Default mock implementations
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  describe('Initialization', () => {
    it('should provide auth context', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('currentUser');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
    });

    it('should start with null user when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentUser).toBeNull();
    });
  });

  describe('Password Reset', () => {
    it('should call sendPasswordResetEmail', async () => {
      mockSendPasswordResetEmail.mockResolvedValue();
      mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ email: 'test@example.com' }) });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const resetResult = await result.current.requestPasswordReset('test@example.com');

      expect(mockSendPasswordResetEmail).toHaveBeenCalled();
      expect(resetResult.success).toBe(true);
    });

    it('should handle password reset errors gracefully', async () => {
      mockSendPasswordResetEmail.mockRejectedValue(new Error('User not found'));
      mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ email: 'nonexistent@example.com' }) });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now always returns success to prevent user enumeration
      const resetResult = await result.current.requestPasswordReset('nonexistent@example.com');
      expect(resetResult.success).toBe(true);
    });
  });

  describe('Logout', () => {
    it('should call signOut when logging out', async () => {
      mockSignOut.mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.logout();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
