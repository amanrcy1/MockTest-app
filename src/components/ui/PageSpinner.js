import PropTypes from 'prop-types';

/**
 * Full-page centered loading spinner.
 * Replaces the ~7-line pattern duplicated across 9+ pages.
 */
const PageSpinner = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div
        className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
        aria-hidden="true"
      />
      <p className="mt-4 text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

PageSpinner.propTypes = {
  message: PropTypes.string,
};

export default PageSpinner;
