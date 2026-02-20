// Vitest setup — replaces jest globals with vi equivalents
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// ============================================
// FIREBASE MOCKS
// ============================================

vi.mock('./config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendEmailVerification: vi.fn(),
  },
  db: {},
  storage: {},
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  })),
  signInWithEmailAndPassword: vi.fn(() =>
    Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
  ),
  createUserWithEmailAndPassword: vi.fn(() =>
    Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
  ),
  signOut: vi.fn(() => Promise.resolve()),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendEmailVerification: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(() => Promise.resolve()),
  updateEmail: vi.fn(() => Promise.resolve()),
  updatePassword: vi.fn(() => Promise.resolve()),
  reauthenticateWithCredential: vi.fn(() => Promise.resolve()),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((_db, collectionName) => ({ _collectionName: collectionName })),
  doc: vi.fn((_db, collectionName, docId) => ({
    _collectionName: collectionName,
    _docId: docId,
  })),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [],
      empty: true,
      size: 0,
      forEach: vi.fn(),
    })
  ),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => false,
      data: () => ({}),
      id: 'test-id',
    })
  ),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn((...args) => ({ _query: args })),
  where: vi.fn((field, operator, value) => ({
    _where: { field, operator, value },
  })),
  orderBy: vi.fn((field, direction) => ({
    _orderBy: { field, direction },
  })),
  limit: vi.fn((count) => ({ _limit: count })),
  startAfter: vi.fn((doc) => ({ _startAfter: doc })),
  endBefore: vi.fn((doc) => ({ _endBefore: doc })),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date) => ({
      seconds: date.getTime() / 1000,
      nanoseconds: 0,
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => new Date()),
    increment: vi.fn((n) => n),
    arrayUnion: vi.fn((...elements) => elements),
    arrayRemove: vi.fn((...elements) => elements),
    delete: vi.fn(() => null),
  },
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn((_storage, path) => ({ _path: path })),
  uploadBytes: vi.fn(() =>
    Promise.resolve({
      ref: { fullPath: 'test/path' },
      metadata: { size: 1024 },
    })
  ),
  uploadBytesResumable: vi.fn(() => ({
    on: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  })),
  getDownloadURL: vi.fn(() =>
    Promise.resolve('https://example.com/test-image.jpg')
  ),
  deleteObject: vi.fn(() => Promise.resolve()),
  listAll: vi.fn(() =>
    Promise.resolve({
      items: [],
      prefixes: [],
    })
  ),
}));

// ============================================
// COMPONENT MOCKS
// ============================================

vi.mock('react-markdown', () => ({
  default: ({ children }) => children,
}));

vi.mock('./components', () => {
  const React = require('react');
  return {
    ThemeToggle: () => React.createElement('div', { 'data-testid': 'theme-toggle' }, 'ThemeToggle'),
    BottomNav: () => React.createElement('div', { 'data-testid': 'bottom-nav' }, 'BottomNav'),
    ErrorBoundary: ({ children }) => children,
    ViolationModal: () => React.createElement('div', { 'data-testid': 'violation-modal' }, 'ViolationModal'),
    PageSpinner: ({ message }) => message || '',
    ResumePrompt: () => React.createElement('div', { 'data-testid': 'resume-prompt' }, 'ResumePrompt'),
    ReportModal: () => React.createElement('div', { 'data-testid': 'report-modal' }, 'ReportModal'),
    ConfirmModal: () => React.createElement('div', { 'data-testid': 'confirm-modal' }, 'ConfirmModal'),
  };
});

vi.mock('./components/3d', () => {
  const React = require('react');
  return {
    CelebrationEffect: () => React.createElement('div', { 'data-testid': 'celebration-effect' }, 'CelebrationEffect'),
    LeaderboardPodium: () => React.createElement('div', { 'data-testid': 'leaderboard-podium' }, 'LeaderboardPodium'),
    Timer3D: () => React.createElement('div', { 'data-testid': 'timer-3d' }, 'Timer3D'),
  };
});

// ============================================
// FRAMER MOTION MOCK
// ============================================

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: (_target, prop) => {
        const MotionComponent = React.forwardRef(({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, whileFocus: _whileFocus, whileDrag: _whileDrag, whileInView: _whileInView, variants: _variants, layout: _layout, layoutId: _layoutId, ...rest }, ref) => {
          return React.createElement(prop, { ...rest, ref }, children);
        });
        MotionComponent.displayName = `motion.${prop}`;
        return MotionComponent;
      },
    }),
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    }),
    useMotionValue: (initial) => ({
      get: () => initial,
      set: vi.fn(),
    }),
  };
});

// ============================================
// REACT TOASTIFY MOCK
// ============================================

vi.mock('react-toastify', () => {
  const React = require('react');
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      warn: vi.fn(),
    },
    ToastContainer: () => React.createElement('div', { 'data-testid': 'toast-container' }, 'ToastContainer'),
  };
});

// ============================================
// TOAST UTILITY MOCK
// ============================================

vi.mock('./utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    messages: {
      LOGIN_REQUIRED: "Please log in to continue",
      LOGOUT_SUCCESS: "Logged out successfully",
      LOGOUT_FAILED: "Failed to log out",
      PROFILE_UPDATED: "Profile updated",
      PROFILE_UPDATE_FAILED: "Failed to update profile",
      PHOTO_UPDATED: "Photo updated",
      PHOTO_REMOVED: "Photo removed",
      PHOTO_SAVE_FAILED: "Failed to save photo",
      PHOTO_REMOVE_FAILED: "Failed to remove photo",
      INVALID_IMAGE: "Please select a valid image file",
      IMAGE_TOO_LARGE: "Image must be less than 5MB",
      NAME_REQUIRED: "Please enter your name (at least 2 characters)",
      EXAM_REQUIRED: "Please select your target exam",
      ONBOARDING_SUCCESS: "You're all set! Let's go!",
      ONBOARDING_FAILED: "Something went wrong. Please try again",
      TEST_SUBMIT_FAILED: "Failed to submit test",
      TEST_LOAD_FAILED: "Failed to load questions",
      NO_TEST_CONFIG: "No test configuration found",
      NO_EXAM_SELECTED: "No exam type selected",
      TIME_UP: "Time's up! Auto-submitting test...",
      VIOLATION_AUTO_SUBMIT: "Test auto-submitted due to multiple fullscreen violations",
      INSUFFICIENT_QUESTIONS: vi.fn((need, have) => `Insufficient questions. Need ${need}, have ${have}`),
      NO_QUESTIONS_AVAILABLE: "No questions available for this exam type",
      NO_PRACTICE_QUESTIONS: "No practice questions available for this exam type",
      ANSWER_LOCKED: vi.fn((num) => `Answer locked for Q${num}`),
      NO_TEST_DATA: "No test data available",
      TEST_DETAILS_INCOMPLETE: "Test details are incomplete",
      TEST_RESULT_LOAD_FAILED: "Failed to load test result",
      NO_QUESTIONS_WITH_FILTERS: "No questions available with selected filters",
      REDUCE_QUESTIONS: vi.fn((available) => `Only ${available} questions available. Please reduce the number`),
      SELECT_SUBJECT: "Please select at least one subject",
      BOOKMARK_ADDED: "Question bookmarked",
      BOOKMARK_REMOVED: "Bookmark removed",
      BOOKMARKS_LOAD_FAILED: "Failed to load bookmarks",
      BOOKMARK_REMOVE_FAILED: "Failed to remove bookmark",
      REPORT_EMPTY: "Please enter a report message",
      REPORT_SUBMITTED: "Report submitted",
      REPORT_FAILED: "Failed to submit report",
      AI_EXPLANATION_FAILED: "Failed to generate AI explanation",
      QUESTION_ADDED: "Question added successfully",
      QUESTION_ADD_FAILED: "Failed to add question",
      QUESTION_UPDATED: "Question updated successfully",
      QUESTION_UPDATE_FAILED: "Failed to update question",
      QUESTION_DELETED: "Question deleted successfully",
      QUESTION_DELETE_FAILED: "Failed to delete question",
      QUESTIONS_LOAD_FAILED: "Failed to load questions",
      QUESTION_TEXT_REQUIRED: "Question text is required",
      OPTIONS_REQUIRED: "All options are required",
      SOLUTION_REQUIRED: "Solution is required",
      CSV_REQUIRED: "Please upload a CSV file",
      CSV_PARSE_FAILED: "Failed to parse CSV file",
      NO_VALID_QUESTIONS: "No valid questions to upload",
      BULK_UPLOAD_SUCCESS: vi.fn((count) => `Successfully uploaded ${count} questions`),
      BULK_UPLOAD_PARTIAL: vi.fn((failed) => `Failed to upload ${failed} questions`),
      BULK_UPLOAD_FAILED: "Failed to upload questions",
      TEMPLATE_DOWNLOADED: "Template downloaded",
      USERS_LOAD_FAILED: "Failed to load users",
      USER_PROMOTED: "User promoted to admin",
      USER_DEMOTED: "User demoted from admin",
      USER_UPDATE_FAILED: "Failed to update user",
      USER_DELETED: "User deleted. Remember to also delete from Firebase Authentication console",
      USER_DELETE_FAILED: "Failed to delete user",
      CANNOT_DEMOTE_SELF: "You cannot demote yourself",
      CANNOT_DELETE_SELF: "You cannot delete yourself",
      CANNOT_DEMOTE_SUPER_ADMIN: "Cannot demote the super admin",
      CANNOT_DELETE_SUPER_ADMIN: "Cannot delete the super admin",
      ADMIN_ONLY: "Only super admin can manage user roles",
      DELETE_ADMIN_ONLY: "Only super admin can delete users",
      REPORTS_LOAD_FAILED: "Failed to load error reports",
      REPORT_RESOLVED: "Report marked as resolved",
      REPORT_UPDATE_FAILED: "Failed to update report",
      NOTE_REQUIRED: "Please enter a note before saving",
      NOTE_SAVED: "Note saved",
      NOTE_SAVE_FAILED: "Failed to save note",
      REPORT_DELETED: "Error report deleted",
      REPORT_DELETE_FAILED: "Failed to delete report",
      ADMIN_BOOKMARKS_LOAD_FAILED: "Failed to load bookmarks",
      BOOKMARK_REVIEWED: "Bookmark marked as reviewed",
      BOOKMARK_UPDATE_FAILED: "Failed to update bookmark",
      BOOKMARK_DELETED: "Bookmark deleted",
      BOOKMARK_DELETE_FAILED: "Failed to delete bookmark",
    },
  },
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn(),
  messages: {},
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// ============================================
// BROWSER APIs
// ============================================

// In jsdom, crypto is read-only, so use Object.defineProperty
if (!global.crypto?.getRandomValues) {
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 11),
    },
    writable: true,
    configurable: true,
  });
}

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
};

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const _storage = {};
const localStorageMock = (() => {
  const store = _storage;
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    length: 0,
    key: vi.fn(),
  };
})();
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// Re-apply localStorage mock implementations after vi.clearAllMocks()
afterEach(() => {
  localStorageMock.getItem.mockImplementation((key) => (key in _storage ? _storage[key] : null));
  localStorageMock.setItem.mockImplementation((key, value) => { _storage[key] = String(value); });
  localStorageMock.removeItem.mockImplementation((key) => { delete _storage[key]; });
  localStorageMock.clear.mockImplementation(() => { Object.keys(_storage).forEach(k => delete _storage[k]); });
});

global.scrollTo = vi.fn();
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// ============================================
// CONSOLE SUPPRESSION
// ============================================

const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
       args[0].includes('Warning: useLayoutEffect') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)') ||
       args[0].includes('React does not recognize the'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ============================================
// TEST UTILITIES
// ============================================

global.flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

global.createMockFirestoreDoc = (id, data) => ({
  id,
  data: () => data,
  exists: () => true,
  ref: { id },
});

global.createMockQuerySnapshot = (docs) => ({
  docs: docs.map(doc => global.createMockFirestoreDoc(doc.id, doc.data)),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback) => docs.forEach((doc, index) =>
    callback(global.createMockFirestoreDoc(doc.id, doc.data), index)
  ),
});
