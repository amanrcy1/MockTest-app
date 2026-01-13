import { memo } from "react";
import PropTypes from "prop-types";

/**
 * Reusable Stats Card component
 */
const StatsCard = memo(({
  title,
  value,
  icon,
  color = "blue", // blue, green, purple, red, yellow, orange
  trend,
  trendLabel,
  loading = false,
}) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      icon: "text-blue-600",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      icon: "text-green-600",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
      icon: "text-purple-600",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
      icon: "text-red-600",
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-600",
      icon: "text-yellow-600",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      icon: "text-orange-600",
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-14 w-14 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-1">
              <span className={`text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-gray-500 ml-1">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`${colors.bg} p-3 rounded-full`}>
            <div className={`w-8 h-8 ${colors.icon}`}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node,
  color: PropTypes.oneOf(['blue', 'green', 'purple', 'red', 'yellow', 'orange']),
  trend: PropTypes.number,
  trendLabel: PropTypes.string,
  loading: PropTypes.bool,
};

export default StatsCard;
