import { render, waitFor } from '@testing-library/react';
import MockTest from '../MockTest';
import { useAuth } from '../../../context/AuthContext';
import { getDocs } from 'firebase/firestore';

jest.mock('../../../context/AuthContext');

const routerMock = require('react-router-dom');
const mockNavigate = routerMock.__mockNavigate;

jest.mock('../../../hooks', () => ({
  useKeyboardShortcuts: jest.fn(),
  useNavigationBlock: jest.fn(),
  useAntiCheat: jest.fn(() => ({
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
    showViolationModal: false,
    resumeTest: jest.fn(),
    violationCount: 0,
    remainingWarnings: 3,
  })),
  randomizeTest: jest.fn((questions) => questions),
  useTestSession: jest.fn(() => ({
    saveSession: jest.fn(),
    loadSavedSession: jest.fn().mockReturnValue(null),
    clearSession: jest.fn(),
  })),
  useBookmarks: jest.fn(() => ({
    bookmarkedIds: new Set(),
    toggleBookmark: jest.fn(),
  })),
  useErrorReport: jest.fn(() => ({
    showReportModal: false,
    reportText: '',
    setReportText: jest.fn(),
    openReport: jest.fn(),
    closeReport: jest.fn(),
    submitReport: jest.fn(),
  })),
}));

const mockHooks = require('../../../hooks');

jest.mock('../../../utils/examPatterns', () => ({
  EXAM_PATTERNS: {
    CDS: {
      name: 'CDS',
      totalTime: 7200,
      sections: [
        { name: 'General Knowledge', totalQuestions: 10, marksPerQuestion: 1, negativeMarking: -0.33, timeLimit: 3600 },
      ],
    },
  },
}));

describe('MockTest Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { uid: 'user123' } });
    getDocs.mockResolvedValue({ docs: [], empty: true, size: 0, forEach: jest.fn() });
    routerMock.__mockLocation.state = { examType: 'CDS' };

    // Re-set mock implementations after clearAllMocks
    mockHooks.useAntiCheat.mockReturnValue({
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      showViolationModal: false,
      resumeTest: jest.fn(),
      violationCount: 0,
      remainingWarnings: 3,
    });
    mockHooks.useTestSession.mockReturnValue({
      saveSession: jest.fn(),
      loadSavedSession: jest.fn().mockReturnValue(null),
      clearSession: jest.fn(),
    });
    mockHooks.useBookmarks.mockReturnValue({
      bookmarkMap: {},
      loadBookmarks: jest.fn(),
      toggleBookmark: jest.fn(),
    });
    mockHooks.useErrorReport.mockReturnValue({
      showReportModal: false,
      reportText: '',
      setReportText: jest.fn(),
      openReport: jest.fn(),
      closeReport: jest.fn(),
      submitReport: jest.fn(),
    });
    mockHooks.randomizeTest.mockImplementation((questions) => questions);
  });

  it('should redirect if no examType', async () => {
    routerMock.__mockLocation.state = null;
    render(<MockTest />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/test-selection'));
  });

  it('should redirect if insufficient questions', async () => {
    getDocs.mockResolvedValue({ docs: [], empty: true, size: 0, forEach: jest.fn() });
    render(<MockTest />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/test-selection'));
  });

  it('should fetch questions from firestore', async () => {
    render(<MockTest />);
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
  });

  it('should use anti-cheat measures', () => {
    const hooks = require('../../../hooks');
    render(<MockTest />);
    expect(hooks.useAntiCheat).toHaveBeenCalled();
  });

  it('should use navigation block', () => {
    const hooks = require('../../../hooks');
    render(<MockTest />);
    expect(hooks.useNavigationBlock).toHaveBeenCalled();
  });
});
