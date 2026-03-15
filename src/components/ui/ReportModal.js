import PropTypes from 'prop-types';

/**
 * Shared error-report modal for test pages.
 * Replaces the ~40-line inline modal duplicated across 3 test pages.
 */
const ReportModal = ({ isOpen, reportText, onChangeText, onSubmit, onClose, submitting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Report an Error</h3>
        <textarea
          value={reportText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Describe the error..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 h-32 resize-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  reportText: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default ReportModal;
