import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

jest.mock('../../../context/AuthContext');

// Get the shared mock navigate from the auto-mock
const { __mockNavigate: mockNavigate } = require('react-router-dom');

describe('Login Page', () => {
  const mockLogin = jest.fn();
  const mockSendVerificationEmail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
      sendVerificationEmail: mockSendVerificationEmail,
    });
  });

  it('should render login form', () => {
    render(<Login />);
    expect(screen.getByText('UPSC Mock Test')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('should show error when fields are empty', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please fill all fields');
    });
  });

  it('should call login with correct credentials', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('should navigate to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error message on failed login', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', () => {
    render(<Login />);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should show verification resend when needed', async () => {
    mockLogin.mockResolvedValue({ success: false, needsVerification: true, email: 'a@b.com', error: 'Not verified' });
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/resend verification email/i)).toBeInTheDocument();
    });
  });

  it('should have links to register and forgot password', () => {
    render(<Login />);
    expect(screen.getByText(/register here/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should strip whitespace from inputs', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText(/username or email/i);
    fireEvent.change(input, { target: { value: 'test user' } });
    expect(input.value).toBe('testuser');
  });

  it('should show loading state during submission', async () => {
    mockLogin.mockImplementation(() => new Promise(r => setTimeout(() => r({ success: true }), 200)));
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });
});
