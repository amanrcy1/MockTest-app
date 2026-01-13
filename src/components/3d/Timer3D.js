import { memo, useMemo } from "react";
import { formatTime } from "../../utils/testUtils";
import PropTypes from "prop-types";

/**
 * Optimized 3D circular timer - reduced animations for performance
 */
const Timer3D = memo(({
  timeRemaining,
  totalTime,
  label = "Time Remaining",
  warningThreshold = 300,
  criticalThreshold = 60,
  size = "md",
}) => {

  const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 100;
  const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold;
  const isCritical = timeRemaining > 0 && timeRemaining <= criticalThreshold;

  const config = useMemo(() => {
    const sizes = {
      sm: { container: "w-24 h-24", text: "text-lg", label: "text-xs", stroke: 4 },
      md: { container: "w-32 h-32", text: "text-2xl", label: "text-xs", stroke: 5 },
      lg: { container: "w-40 h-40", text: "text-3xl", label: "text-sm", stroke: 6 },
    };
    return sizes[size] || sizes.md;
  }, [size]);

  const colorConfig = useMemo(() => {
    if (isCritical) return { stroke: "#EF4444", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600" };
    if (isWarning) return { stroke: "#F97316", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-500" };
    return { stroke: "#3B82F6", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600" };
  }, [isCritical, isWarning]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative ${config.container} mx-auto`}
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${formatTime(timeRemaining)}`}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 rounded-full ${colorConfig.bg} blur-md ${isCritical ? 'animate-pulse' : ''}`} />

      {/* SVG Circle */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colorConfig.stroke}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
          style={{ filter: "drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))" }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${config.text} ${colorConfig.text} ${isCritical ? 'animate-pulse' : ''}`}>
          {formatTime(timeRemaining)}
        </span>
        {label && (
          <span className={`${config.label} text-gray-500 dark:text-gray-400 mt-1`}>
            {label}
          </span>
        )}
      </div>

      {/* Pulse effect for critical time */}
      {isCritical && (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />
      )}
    </div>
  );
});

Timer3D.displayName = "Timer3D";

Timer3D.propTypes = {
  timeRemaining: PropTypes.number.isRequired,
  totalTime: PropTypes.number.isRequired,
  label: PropTypes.string,
  warningThreshold: PropTypes.number,
  criticalThreshold: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default Timer3D;
