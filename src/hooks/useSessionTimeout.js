import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auto-logout after a period of inactivity.
 *
 * @param {Function} onTimeout  – called when the session expires (should logout + redirect)
 * @param {boolean}  isActive   – only track when user is authenticated
 * @param {number}   timeoutMs  – inactivity threshold in ms (default 30 min)
 */
export const useSessionTimeout = (onTimeout, isActive = false, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const timerRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep callback ref fresh without re-running the effect
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current?.();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!isActive) return;

    // Start the timer immediately
    resetTimer();

    // Reset on any user activity
    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
    };
  }, [isActive, resetTimer]);
};

export default useSessionTimeout;
