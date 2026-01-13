import PropTypes from "prop-types";

/**
 * Shared "Resume or Start Fresh" prompt shown when a saved session exists.
 * Replaces the ~25-line pattern duplicated across 3 test pages.
 */
const ResumePrompt = ({ title, description, onResume, onStartFresh }) => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-xl w-full">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        {title}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {description}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onResume}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Resume
        </button>
        <button
          onClick={onStartFresh}
          className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Start Fresh
        </button>
      </div>
    </div>
  </div>
);

ResumePrompt.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onResume: PropTypes.func.isRequired,
  onStartFresh: PropTypes.func.isRequired,
};

export default ResumePrompt;
