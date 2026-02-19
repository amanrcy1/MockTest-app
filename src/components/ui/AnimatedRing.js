import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

/**
 * Animated circular progress ring
 * Used for displaying accuracy, progress, or any percentage value
 */
const AnimatedRing = ({
  value = 0,
  size = 80,
  strokeWidth = 8,
  color = "blue",
  label = "",
  showValue = true,
  suffix = "%",
  delay = 0,
  className = "",
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Calculate dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  // Color configurations
  const colorConfig = {
    blue: {
      stroke: "stroke-blue-500",
      text: "text-blue-600 dark:text-blue-400",
      glow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]",
      gradient: ["#3b82f6", "#6366f1"],
    },
    green: {
      stroke: "stroke-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
      gradient: ["#10b981", "#14b8a6"],
    },
    purple: {
      stroke: "stroke-purple-500",
      text: "text-purple-600 dark:text-purple-400",
      glow: "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]",
      gradient: ["#a855f7", "#8b5cf6"],
    },
    orange: {
      stroke: "stroke-orange-500",
      text: "text-orange-600 dark:text-orange-400",
      glow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]",
      gradient: ["#f97316", "#fb923c"],
    },
    red: {
      stroke: "stroke-red-500",
      text: "text-red-600 dark:text-red-400",
      glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]",
      gradient: ["#ef4444", "#f87171"],
    },
  };

  const colors = colorConfig[color] || colorConfig.blue;
  const gradientId = `ring-gradient-${color}-${Math.random().toString(36).slice(2, 11)}`;

  // Animate value on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1000;
      const startTime = Date.now();
      const startValue = 0;
      const endValue = Math.min(Math.max(value, 0), 100);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * eased;
        
        setAnimatedValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${colors.glow}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <motion.span
            className={`text-lg md:text-xl font-bold ${colors.text}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {Math.round(animatedValue)}{suffix}
          </motion.span>
        )}
        {label && (
          <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </span>
        )}
      </div>
    </motion.div>
  );
};

AnimatedRing.propTypes = {
  value: PropTypes.number,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  color: PropTypes.oneOf(["blue", "green", "purple", "orange", "red"]),
  label: PropTypes.string,
  showValue: PropTypes.bool,
  suffix: PropTypes.string,
  delay: PropTypes.number,
  className: PropTypes.string,
};

export default AnimatedRing;
