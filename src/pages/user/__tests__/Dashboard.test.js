import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { useAuth } from '../../../context/AuthContext';
import { getDocs, getDoc } from 'firebase/firestore';

jest.mock('../../../context/AuthContext');

// Mock components that use framer-motion or other complex dependencies
jest.mock('../../../components', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
  BottomNav: () => <nav data-testid="bottom-nav">BottomNav</nav>,
  TopNav: () => <nav data-testid="top-nav">TopNav</nav>,
}));

// Mock LoadingSkeleton
jest.mock('../../../components/ui/LoadingSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>,
}));

const { __mockNavigate: mockNavigate } = require('react-router-dom');

describe('Dashboard Page', () => {
  const mockLogout = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset module to clear statsCache and fetchingRef between tests
    jest.resetModules();
    
    useAuth.mockReturnValue({
      currentUser: { uid: `user-${Date.now()}`, email: 'test@example.com', emailVerified: true },
      userDetails: { name: 'Test User', targetExam: 'CDS', isAdmin: false },
      logout: mockLogout,
    });
    getDocs.mockResolvedValue({ docs: [], empty: true, size: 0, forEach: jest.fn() });
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
  });

  // Helper to render and wait for loading to complete
  const renderAndWait = async () => {
    render(<Dashboard />);
    // Wait for content to appear (indicates loading is done)
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    }, { timeout: 3000 });
  };

  it('should render user name', async () => {
    await renderAndWait();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display stats cards', async () => {
    await renderAndWait();
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Rank')).toBeInTheDocument();
  });

  it('should show quick action cards', async () => {
    await renderAndWait();
    expect(screen.getByText('Mock Test')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
  });

  it('should navigate to test selection on mock test click', async () => {
    await renderAndWait();
    const mockTestBtn = screen.getByText('Mock Test');
    fireEvent.click(mockTestBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/test-selection');
  });

  it('should show quick links', async () => {
    await renderAndWait();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Test History')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
  });

  it('should display target exam', async () => {
    await renderAndWait();
    expect(screen.getByText('Target Exam')).toBeInTheDocument();
    expect(screen.getByText('CDS')).toBeInTheDocument();
  });

  it('should call logout', async () => {
    mockLogout.mockResolvedValue({ success: true });
    await renderAndWait();
    const signOutBtn = screen.getByText('Sign Out');
    fireEvent.click(signOutBtn);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it('should show admin panel for admins', async () => {
    useAuth.mockReturnValue({
      currentUser: { uid: `admin-${Date.now()}`, emailVerified: true },
      userDetails: { name: 'Admin', targetExam: 'CDS', isAdmin: true },
      logout: mockLogout,
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    }, { timeout: 3000 });
    const adminElements = screen.getAllByText('Admin Panel');
    expect(adminElements.length).toBeGreaterThan(0);
  });

  it('should hide admin panel for regular users', async () => {
    await renderAndWait();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should navigate to leaderboard', async () => {
    await renderAndWait();
    const leaderboardBtn = screen.getByText('Leaderboard');
    fireEvent.click(leaderboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  it('should navigate to bookmarks', async () => {
    await renderAndWait();
    const bookmarksBtn = screen.getByText('Bookmarks');
    fireEvent.click(bookmarksBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/bookmarks');
  });

  it('should display user avatar initial', async () => {
    await renderAndWait();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should load test stats', async () => {
    useAuth.mockReturnValue({
      currentUser: { uid: `stats-user-${Date.now()}`, email: 'stats@example.com', emailVerified: true },
      userDetails: { name: 'Stats User', targetExam: 'NDA', isAdmin: false },
      logout: mockLogout,
    });
    getDocs.mockResolvedValue({
      docs: [
        { id: 'test1', data: () => ({ accuracy: 80, timeTaken: 3600, completed: true, userId: 'stats-user-999' }) },
        { id: 'test2', data: () => ({ accuracy: 90, timeTaken: 3000, completed: true, userId: 'stats-user-999' }) },
      ],
      empty: false,
      size: 2,
      forEach: jest.fn((cb) => {
        [
          { id: 'test1', data: () => ({ accuracy: 80 }) },
          { id: 'test2', data: () => ({ accuracy: 90 }) },
        ].forEach(cb);
      }),
    });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Stats User')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show skeleton while loading', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });
});
