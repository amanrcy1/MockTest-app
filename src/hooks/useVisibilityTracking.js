import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook to track tab visibility and window focus
 * Useful for anti-cheat measures
 */
export const useVisibilityTracking = (isActive = false, options = {}) => {
  const {
    onTabSwitch = null,
    onWindowBlur = null,
    maxViolations = 3,
    onMaxViolations = null,
  } = options;
  
  const [violations, setViolations] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  
  const violationsRef = useRef(0);
  const onTabSwitchRef = useRef(onTabSwitch);
  const onWindowBlurRef = useRef(onWindowBlur);
  const onMaxViolationsRef = useRef(onMaxViolations);
  
  useEffect(() => {
    onTabSwitchRef.current = onTabSwitch;
    onWindowBlurRef.current = onWindowBlur;
    onMaxViolationsRef.current = onMaxViolations;
  }, [onTabSwitch, onWindowBlur, onMaxViolations]);
  
  const handleViolation = useCallback((type) => {
    if (!isActive) return;
    
    const newCount = violationsRef.current + 1;
    violationsRef.current = newCount;
    setViolations(newCount);
    
    if (newCount >= maxViolations && onMaxViolationsRef.current) {
      onMaxViolationsRef.current({ type, count: newCount });
    }
  }, [isActive, maxViolations]);
  
  useEffect(() => {
    if (!isActive) return;
    
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (!visible && onTabSwitchRef.current) {
        onTabSwitchRef.current();
        handleViolation('tab_switch');
      }
    };
    
    const handleBlur = () => {
      setIsFocused(false);
      if (onWindowBlurRef.current) {
        onWindowBlurRef.current();
        handleViolation('window_blur');
      }
    };
    
    const handleFocus = () => {
      setIsFocused(true);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isActive, handleViolation]);
  
  const resetViolations = useCallback(() => {
    violationsRef.current = 0;
    setViolations(0);
  }, []);
  
  return {
    isVisible,
    isFocused,
    violations,
    resetViolations,
    remainingAttempts: Math.max(0, maxViolations - violations),
  };
};

export default useVisibilityTracking;
