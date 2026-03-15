import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for countdown timer functionality
 * @param {number} initialSeconds - starting time in seconds
 * @param {function} onExpire - callback when timer reaches 0
 * @param {boolean} autoStart - whether to start immediately
 * @returns {object} - timer state and controls
 */
export const useTimer = (initialSeconds, onExpire, autoStart = false) => {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const timerRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  const timeRemainingRef = useRef(initialSeconds);

  // Keep refs updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Timer logic — only depend on isRunning to avoid recreating interval every tick
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newTime = initialSeconds) => {
      setIsRunning(false);
      setTimeRemaining(newTime);
    },
    [initialSeconds]
  );

  const setTime = useCallback((seconds) => {
    setTimeRemaining(seconds);
  }, []);

  // Format time as MM:SS or HH:MM:SS — stable reference, no deps needed
  const formatTime = useCallback((seconds) => {
    const s = seconds != null ? seconds : timeRemainingRef.current;
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining,
    isRunning,
    isExpired: timeRemaining === 0,
    isWarning: timeRemaining > 0 && timeRemaining < 300, // Less than 5 minutes
    isCritical: timeRemaining > 0 && timeRemaining < 60, // Less than 1 minute
    formattedTime: formatTime(),
    start,
    pause,
    reset,
    setTime,
    formatTime,
  };
};

export default useTimer;
