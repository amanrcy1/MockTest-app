import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../Register';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';
import { getDoc } from 'firebase/firestore';

jest.mock('../../../context/AuthContext');

const { __mockNavigate: mockNavigate } = require('react-router-dom');

describe('Register Page', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ register: mockRegister });
    getDoc.mockResolvedValue({ exists: () => false });
  });

  it('should render registration form', () => {
    render(<Register />);
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/unique username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
  });

  it('should show error when required fields are empty', async () => {
    render(<Register />);
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please fill all required fields');
    });
  });

  it('should validate username minimum length', async () => {
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/use a strong password/i), { target: { value: 'Test123!@#' } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: 'Test123!@#' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Username must be at least 3 characters');
    });
  });

  it('should check username availability', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'testuser' } });
    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show unavailable when username taken', async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'taken' } });
    await waitFor(() => {
      expect(screen.getByText(/not available/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show password strength indicators when typing', () => {
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/use a strong password/i), { target: { value: 'a' } });
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
  });

  it('should reject weak password', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/use a strong password/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please use a stronger password');
    });
  });

  it('should reject mismatched passwords', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/use a strong password/i), { target: { value: 'Test123!@#' } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
    });
  });

  it('should register and navigate on success', async () => {
    mockRegister.mockResolvedValue({ success: true });
    getDoc.mockResolvedValue({ exists: () => false });
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText(/unique username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/use a strong password/i), { target: { value: 'Test123!@#' } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter/i), { target: { value: 'Test123!@#' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should toggle password visibility', () => {
    render(<Register />);
    const input = screen.getByPlaceholderText(/use a strong password/i);
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getAllByLabelText(/show password/i)[0]);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should have link to login page', () => {
    render(<Register />);
    expect(screen.getByText(/login here/i)).toBeInTheDocument();
  });

  it('should default target exam to CDS', () => {
    render(<Register />);
    expect(screen.getByRole('combobox').value).toBe('CDS');
  });
});
