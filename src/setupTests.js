// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// ============================================
// FIREBASE MOCKS
// ============================================

// Mock Firebase config
jest.mock('./config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
  },
  db: {},
  storage: {},
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(() => 
    Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  sendEmailVerification: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(),
  updateProfile: jest.fn(() => Promise.resolve()),
  updateEmail: jest.fn(() => Promise.resolve()),
  updatePassword: jest.fn(() => Promise.resolve()),
  reauthenticateWithCredential: jest.fn(() => Promise.resolve()),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((db, collectionName) => ({ _collectionName: collectionName })),
  doc: jest.fn((db, collectionName, docId) => ({ 
    _collectionName: collectionName, 
    _docId: docId 
  })),
  getDocs: jest.fn(() => 
    Promise.resolve({
      docs: [],
      empty: true,
      size: 0,
      forEach: jest.fn(),
    })
  ),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => false,
      data: () => ({}),
      id: 'test-id',
    })
  ),
  addDoc: jest.fn(() => 
    Promise.resolve({ id: 'new-doc-id' })
  ),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((...args) => ({ _query: args })),
  where: jest.fn((field, operator, value) => ({ 
    _where: { field, operator, value } 
  })),
  orderBy: jest.fn((field, direction) => ({ 
    _orderBy: { field, direction } 
  })),
  limit: jest.fn((count) => ({ _limit: count })),
  startAfter: jest.fn((doc) => ({ _startAfter: doc })),
  endBefore: jest.fn((doc) => ({ _endBefore: doc })),
  onSnapshot: jest.fn(() => jest.fn()), // Returns unsubscribe function
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date) => ({ 
      seconds: date.getTime() / 1000, 
      nanoseconds: 0 
    })),
  },
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
    increment: jest.fn((n) => n),
    arrayUnion: jest.fn((...elements) => elements),
    arrayRemove: jest.fn((...elements) => elements),
    delete: jest.fn(() => null),
  },
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn((storage, path) => ({ _path: path })),
  uploadBytes: jest.fn(() => 
    Promise.resolve({ 
      ref: { fullPath: 'test/path' },
      metadata: { size: 1024 }
    })
  ),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
  })),
  getDownloadURL: jest.fn(() => 
    Promise.resolve('https://example.com/test-image.jpg')
  ),
  deleteObject: jest.fn(() => Promise.resolve()),
  listAll: jest.fn(() =>
    Promise.resolve({
      items: [],
      prefixes: [],
    })
  ),
}));

// ============================================
// COMPONENT MOCKS
// ============================================

jest.mock('react-markdown', () => {
  return ({ children }) => <div data-testid="react-markdown">{children}</div>;
});

jest.mock('./components', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
  BottomNav: () => <div data-testid="bottom-nav">BottomNav</div>,
  ErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>,
  ViolationModal: () => <div data-testid="violation-modal">ViolationModal</div>,
  PageSpinner: ({ message }) => <div data-testid="page-spinner">{message}</div>,
  ResumePrompt: () => <div data-testid="resume-prompt">ResumePrompt</div>,
  ReportModal: () => <div data-testid="report-modal">ReportModal</div>,
  ConfirmModal: () => <div data-testid="confirm-modal">ConfirmModal</div>,
}));

jest.mock('./components/3d', () => ({
  CelebrationEffect: () => <div data-testid="celebration-effect">CelebrationEffect</div>,
  LeaderboardPodium: () => <div data-testid="leaderboard-podium">LeaderboardPodium</div>,
  Timer3D: () => <div data-testid="timer-3d">Timer3D</div>,
}));

// ============================================
// FRAMER MOTION MOCK
// ============================================

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>,
    input: ({ children, ...props }) => <input {...props}>{children}</input>,
    a: ({ children, ...props }) => <a {...props}>{children}</a>,
    svg: ({ children, ...props }) => <svg {...props}>{children}</svg>,
    path: ({ children, ...props }) => <path {...props}>{children}</path>,
    img: (props) => <img {...props} alt="" />, // eslint-disable-line jsx-a11y/alt-text
    nav: ({ children, ...props }) => <nav {...props}>{children}</nav>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    footer: ({ children, ...props }) => <footer {...props}>{children}</footer>,
    main: ({ children, ...props }) => <main {...props}>{children}</main>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useMotionValue: (initial) => ({
    get: () => initial,
    set: jest.fn(),
  }),
}));

// ============================================
// REACT TOASTIFY MOCK
// ============================================

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container">ToastContainer</div>,
}));

// ============================================
// BROWSER APIs
// ============================================

// Mock crypto for Node environment
global.crypto = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  // eslint-disable-next-line no-useless-constructor
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line no-useless-constructor
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn((_key) => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock scrollTo
global.scrollTo = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// ============================================
// CONSOLE SUPPRESSION
// ============================================

// Suppress console errors in tests
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

// Helper to wait for async updates
global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Helper to create mock Firestore docs
global.createMockFirestoreDoc = (id, data) => ({
  id,
  data: () => data,
  exists: () => true,
  ref: { id },
});

// Helper to create mock Firestore query snapshot
global.createMockQuerySnapshot = (docs) => ({
  docs: docs.map(doc => global.createMockFirestoreDoc(doc.id, doc.data)),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback) => docs.forEach((doc, index) => 
    callback(global.createMockFirestoreDoc(doc.id, doc.data), index)
  ),
});
