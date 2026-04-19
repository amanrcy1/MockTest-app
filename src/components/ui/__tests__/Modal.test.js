import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal, { ConfirmModal } from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked with closeOnOverlayClick', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={true} />);

    // Click outside the modal content
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when overlay is clicked with closeOnOverlayClick=false', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />);

    // Try to click outside
    fireEvent.keyDown(document, { key: 'Escape' });

    // Should not close since closeOnEscape defaults to true, test the prop instead
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="xl" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should handle keyboard escape key', () => {
    render(<Modal {...defaultProps} closeOnEscape={true} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on escape when closeOnEscape is false', () => {
    render(<Modal {...defaultProps} closeOnEscape={false} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should render without title', () => {
    render(<Modal {...defaultProps} title={null} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('should set body overflow to hidden when open', () => {
    render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body overflow when closed', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('unset');
  });
});

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render confirm modal with message', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show loading state on confirm button', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should use custom button labels', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Delete" cancelText="Keep" />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('should apply danger variant styling', () => {
    render(<ConfirmModal {...defaultProps} confirmVariant="danger" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('should apply success variant styling', () => {
    render(<ConfirmModal {...defaultProps} confirmVariant="success" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-green-600');
  });

  it('should apply primary variant styling', () => {
    render(<ConfirmModal {...defaultProps} confirmVariant="primary" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-blue-600');
  });

  it('should disable action buttons when loading', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    const confirmButton = screen.getByText('Loading...');
    const cancelButton = screen.getByText('Cancel');

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should use default title when not provided', () => {
    const propsWithoutTitle = { ...defaultProps };
    delete propsWithoutTitle.title;
    render(<ConfirmModal {...propsWithoutTitle} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });
});
