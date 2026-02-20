import { vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MockTest from '../MockTest';
import { useAuth } from '../../../context/AuthContext';
import { getDocs } from 'firebase/firestore';
import { __mockNavigate as mockNavigate, __mockLocation } from 'react-router-dom';
import * as hooks from '../../../hooks';

vi.mock('react-router-dom');
vi.mock('../../../context/AuthContext');

vi.mock('../../../hooks', () => ({
  useKeyboardShortcuts: vi.fn(),
  useNavigationBlock: vi.fn(),
  useAntiCheat: vi.fn(() => ({
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    showViolationModal: false,
    resumeTest: vi.fn(),
    violationCount: 0,
    remainingWarnings: 3,
  })),
  randomizeTest: vi.fn((questions) => questions),
  useTestSession: vi.fn(() => ({
    saveSession: vi.fn(),
    loadSavedSession: vi.fn().mockReturnValue(null),
    clearSession: vi.fn(),
  })),
  useBookmarks: vi.fn(() => ({
    bookmarkedIds: new Set(),
    toggleBookmark: vi.fn(),
  })),
  useErrorReport: vi.fn(() => ({
    showReportModal: false,
    reportText: '',
    setReportText: vi.fn(),
    openReport: vi.fn(),
    closeReport: vi.fn(),
    submitReport: vi.fn(),
  })),
}));

vi.mock('../../../utils/examPatterns', () => ({
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
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { uid: 'user123' } });
    getDocs.mockResolvedValue({ docs: [], empty: true, size: 0, forEach: vi.fn() });
    __mockLocation.state = { examType: 'CDS' };

    hooks.useAntiCheat.mockReturnValue({
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      showViolationModal: false,
      resumeTest: vi.fn(),
      violationCount: 0,
      remainingWarnings: 3,
    });
    hooks.useTestSession.mockReturnValue({
      saveSession: vi.fn(),
      loadSavedSession: vi.fn().mockReturnValue(null),
      clearSession: vi.fn(),
    });
    hooks.useBookmarks.mockReturnValue({
      bookmarkMap: {},
      loadBookmarks: vi.fn(),
      toggleBookmark: vi.fn(),
    });
    hooks.useErrorReport.mockReturnValue({
      showReportModal: false,
      reportText: '',
      setReportText: vi.fn(),
      openReport: vi.fn(),
      closeReport: vi.fn(),
      submitReport: vi.fn(),
    });
    hooks.randomizeTest.mockImplementation((questions) => questions);
  });

  it('should redirect if no examType', async () => {
    __mockLocation.state = null;
    render(<MockTest />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/test-selection'));
  });

  it('should redirect if insufficient questions', async () => {
    getDocs.mockResolvedValue({ docs: [], empty: true, size: 0, forEach: vi.fn() });
    render(<MockTest />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/test-selection'));
  });

  it('should fetch questions from firestore', async () => {
    render(<MockTest />);
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
  });

  it('should use anti-cheat measures', () => {
    render(<MockTest />);
    expect(hooks.useAntiCheat).toHaveBeenCalled();
  });

  it('should use navigation block', () => {
    render(<MockTest />);
    expect(hooks.useNavigationBlock).toHaveBeenCalled();
  });
});
