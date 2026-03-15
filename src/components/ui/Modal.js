import { useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Modal component with accessibility support
 */
const Modal = memo(
  ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
  }) => {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      full: 'max-w-full mx-4',
    };

    const handleEscape = useCallback(
      (e) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 transition-opacity"
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal Content */}
        <div
          className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              {title && (
                <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

/**
 * Confirmation Modal variant
 */
export const ConfirmModal = memo(
  ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger', // danger, primary, success
    loading = false,
  }) => {
    const variantClasses = {
      danger: 'bg-red-600 hover:bg-red-700',
      primary: 'bg-blue-600 hover:bg-blue-700',
      success: 'bg-green-600 hover:bg-green-700',
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${variantClasses[confirmVariant]}`}
          >
            {loading ? 'Loading...' : confirmText}
          </button>
        </div>
      </Modal>
    );
  }
);

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl']),
  showCloseButton: PropTypes.bool,
  closeOnOverlayClick: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
};

ConfirmModal.displayName = 'ConfirmModal';

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmButtonClass: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default Modal;
