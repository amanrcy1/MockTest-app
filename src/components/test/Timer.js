import { memo } from "react";
import PropTypes from "prop-types";
import { formatTime } from "../../utils/testUtils";

/**
 * Reusable Timer display component
 */
const Timer = memo(({
  timeRemaining,
  label = "Time Remaining",
  warningThreshold = 300, // 5 minutes
  criticalThreshold = 60, // 1 minute
  size = "md",
  showIcon = false,
}) => {

  const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold;
  const isCritical = timeRemaining > 0 && timeRemaining <= criticalThreshold;

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const colorClass = isCritical
    ? "text-red-600"
    : isWarning
      ? "text-orange-500"
      : "text-blue-600";

  return (
    <div className="text-center" role="timer" aria-live="polite" aria-label={`${label}: ${formatTime(timeRemaining)}`}>
      {label && <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>}
      <div className={`font-bold ${sizeClasses[size]} ${colorClass} ${isCritical ? "animate-pulse" : ""}`}>
        {showIcon && (
          <svg
            className="w-5 h-5 inline-block mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {formatTime(timeRemaining)}
      </div>
    </div>
  );
});

Timer.displayName = 'Timer';

Timer.propTypes = {
  timeRemaining: PropTypes.number.isRequired,
  label: PropTypes.string,
  warningThreshold: PropTypes.number,
  criticalThreshold: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showIcon: PropTypes.bool,
};

export default Timer;
