import { memo } from 'react';

/**
 * Fullscreen Violation Warning Modal - Optimized without Framer Motion
 */
const ViolationModal = memo(({ isOpen, onResume, remainingWarnings = 1, violationCount = 1 }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-bounce-in">
        {/* Warning Header - Compact */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Fullscreen Required</h2>
          <p className="text-white/90 text-sm font-medium">Warning {violationCount}/2</p>
        </div>

        {/* Content - Minimal */}
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              {remainingWarnings > 0
                ? `${remainingWarnings} warning${remainingWarnings > 1 ? 's' : ''} left`
                : 'Next exit will auto-submit test'}
            </p>
          </div>

          {/* Resume Button */}
          <button
            onClick={onResume}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Resume Test
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
            Stay in fullscreen to continue
          </p>
        </div>
      </div>
    </div>
  );
});

ViolationModal.displayName = 'ViolationModal';

export default ViolationModal;
