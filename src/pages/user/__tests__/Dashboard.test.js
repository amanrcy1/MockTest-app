import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { useAuth } from '../../../context/AuthContext';
import { getDocs, getDoc } from 'firebase/firestore';

jest.mock('../../../context/AuthContext');

const { __mockNavigate: mockNavigate } = require('react-router-dom');

describe('Dashboard Page', () => {
  const mockLogout = jest.fn();
  const mockSendVerificationEmail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      currentUser: { uid: 'user123', email: 'test@example.com', emailVerified: true },
      userDetails: { name: 'Test User', targetExam: 'CDS', isAdmin: false, hasRealEmail: true },
      logout: mockLogout,
      sendVerificationEmail: mockSendVerificationEmail,
    });
    getDocs.mockResolvedValue({ docs: [] });
    getDoc.mockResolvedValue({ exists: () => false });
  });

  it('should render user name', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Test User')).toBeInTheDocument();
  });

  it('should display stats cards', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Rank')).toBeInTheDocument();
  });

  it('should show quick action cards', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Mock Test')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
  });

  it('should navigate to test selection on mock test click', async () => {
    render(<Dashboard />);
    const mockTestBtn = await screen.findByText('Mock Test');
    fireEvent.click(mockTestBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/test-selection');
  });

  it('should show quick links', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Test History')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
  });

  it('should display target exam', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Target Exam')).toBeInTheDocument();
    expect(screen.getByText('CDS')).toBeInTheDocument();
  });

  it('should call logout', async () => {
    mockLogout.mockResolvedValue({ success: true });
    render(<Dashboard />);
    const signOutBtn = await screen.findByText('Sign Out');
    fireEvent.click(signOutBtn);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it('should show admin panel for admins', async () => {
    useAuth.mockReturnValue({
      currentUser: { uid: 'u1', emailVerified: true },
      userDetails: { name: 'Admin', targetExam: 'CDS', isAdmin: true, hasRealEmail: true },
      logout: mockLogout,
      sendVerificationEmail: mockSendVerificationEmail,
    });
    render(<Dashboard />);
    expect(await screen.findByText('Admin Panel')).toBeInTheDocument();
  });

  it('should hide admin panel for regular users', async () => {
    render(<Dashboard />);
    await screen.findByText('Test User');
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should show verification banner when email not verified', async () => {
    useAuth.mockReturnValue({
      currentUser: { uid: 'u1', emailVerified: false },
      userDetails: { name: 'Test', targetExam: 'CDS', isAdmin: false, hasRealEmail: true },
      logout: mockLogout,
      sendVerificationEmail: mockSendVerificationEmail,
    });
    render(<Dashboard />);
    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
  });

  it('should navigate to leaderboard', async () => {
    render(<Dashboard />);
    const leaderboardBtn = await screen.findByText('Leaderboard');
    fireEvent.click(leaderboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  it('should navigate to bookmarks', async () => {
    render(<Dashboard />);
    const bookmarksBtn = await screen.findByText('Bookmarks');
    fireEvent.click(bookmarksBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/bookmarks');
  });

  it('should display user avatar initial', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('T')).toBeInTheDocument();
  });

  it('should load test stats', async () => {
    useAuth.mockReturnValue({
      currentUser: { uid: 'stats-user-999', email: 'stats@example.com', emailVerified: true },
      userDetails: { name: 'Stats User', targetExam: 'NDA', isAdmin: false, hasRealEmail: true },
      logout: mockLogout,
      sendVerificationEmail: mockSendVerificationEmail,
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
    expect(await screen.findByText('2', {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
