import { useEffect, useCallback, useState, useRef } from "react";

/**
 * Anti-cheating hook for test pages
 * Features:
 * - Fullscreen enforcement with violation tracking
 * - Copy/paste/right-click prevention
 * - Question/option randomization utilities
 */
export const useAntiCheat = (isActive = false, options = {}) => {
  const { 
    onViolation = null,
    onAutoSubmit = null,
    maxFullscreenExits = 2,
  } = options;
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  
  // Use refs to avoid re-running effects on every render
  // Initialize isActiveRef with the initial value of isActive
  const isActiveRef = useRef(isActive);
  const hasAutoSubmittedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onViolationRef = useRef(onViolation);
  const violationCountRef = useRef(0);
  const maxFullscreenExitsRef = useRef(maxFullscreenExits);
  // Track if we were previously in fullscreen (to detect exits vs entries)
  const wasFullscreenRef = useRef(false);

  // Keep refs in sync (these don't cause re-renders)
  // IMPORTANT: Also update the ref immediately, not just in useEffect
  isActiveRef.current = isActive;
  
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { maxFullscreenExitsRef.current = maxFullscreenExits; }, [maxFullscreenExits]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      // Mark that we're now in fullscreen (the event handler will also do this,
      // but we set it here to ensure proper tracking)
      wasFullscreenRef.current = true;
      setIsFullscreen(true);
      setShowViolationModal(false);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.warn("Fullscreen request failed:", error);
      }
      return false;
    }
  }, []);

  // Exit fullscreen safely
  const exitFullscreen = useCallback(() => {
    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      
      if (!isCurrentlyFullscreen) {
        setIsFullscreen(false);
        return;
      }
      
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      setIsFullscreen(false);
    }
  }, []);

  // Resume test (re-enter fullscreen)
  const resumeTest = useCallback(async () => {
    setShowViolationModal(false);
    await enterFullscreen();
  }, [enterFullscreen]);

  // Handle fullscreen change - runs once on mount
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      
      const wasFullscreen = wasFullscreenRef.current;
      wasFullscreenRef.current = isCurrentlyFullscreen;
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Only count as violation if we WERE in fullscreen and now we're NOT
      // This prevents counting the initial entry or re-entries as violations
      const isExitingFullscreen = wasFullscreen && !isCurrentlyFullscreen;
      
      // User exited fullscreen while test is active
      if (isExitingFullscreen && isActiveRef.current && !hasAutoSubmittedRef.current) {
        const newCount = violationCountRef.current + 1;
        violationCountRef.current = newCount;
        
        setViolationCount(newCount);
        
        // maxFullscreenExits = 2 means: 1st exit shows warning, 2nd exit auto-submits
        if (newCount >= maxFullscreenExitsRef.current) {
          hasAutoSubmittedRef.current = true;
          setShowViolationModal(false);
          
          if (onAutoSubmitRef.current) {
            setTimeout(() => {
              onAutoSubmitRef.current({
                reason: "fullscreen_violations",
                violations: newCount,
              });
            }, 100);
          }
        } else {
          setShowViolationModal(true);
        }
        
        if (onViolationRef.current) {
          onViolationRef.current("fullscreen_exit", newCount);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, []); // Empty deps - only runs once

  // Prevent copy/paste/cut/right-click/keyboard shortcuts - single effect
  useEffect(() => {
    if (!isActive) return;

    const handleCopy = (e) => e.preventDefault();
    const handlePaste = (e) => e.preventDefault();
    const handleCut = (e) => e.preventDefault();
    const handleContextMenu = (e) => { e.preventDefault(); return false; };
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ["c", "v", "x", "a", "p", "s", "u"];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          return false;
        }
      }
      if (e.key === "F12" || e.key === "PrintScreen") {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]); // Only re-run when isActive changes

  // Prevent text selection - single effect
  useEffect(() => {
    if (!isActive) return;

    const style = document.createElement("style");
    style.id = "anti-cheat-styles";
    style.textContent = `
      .no-select {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById("anti-cheat-styles");
      if (existingStyle) existingStyle.remove();
    };
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasAutoSubmittedRef.current = false;
      violationCountRef.current = 0;
      wasFullscreenRef.current = false;
    };
  }, []);

  // Reset violations
  const resetViolations = useCallback(() => {
    setViolationCount(0);
    violationCountRef.current = 0;
    hasAutoSubmittedRef.current = false;
    wasFullscreenRef.current = false;
    setShowViolationModal(false);
  }, []);

  return {
    isFullscreen,
    violationCount,
    showViolationModal,
    enterFullscreen,
    exitFullscreen,
    resumeTest,
    resetViolations,
    remainingWarnings: maxFullscreenExits - violationCount,
  };
};

/**
 * Shuffle array using Fisher-Yates algorithm with seed
 */
export const shuffleWithSeed = (array, seed) => {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (currentIndex > 0) {
    const randomIndex = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex],
    ];
  }

  return shuffled;
};

/**
 * Randomize options for a question
 */
export const randomizeOptions = (question, seed) => {
  if (!question.options) return question;
  
  const optionKeys = ["A", "B", "C", "D"];
  const options = typeof question.options === "object" && !Array.isArray(question.options)
    ? optionKeys.map(key => ({ key, value: question.options[key] }))
    : question.options.map((value, index) => ({ key: optionKeys[index], value }));
  
  const shuffledOptions = shuffleWithSeed(options, seed);
  const originalCorrectKey = question.correctAnswer;
  const newCorrectIndex = shuffledOptions.findIndex(opt => opt.key === originalCorrectKey);
  const newCorrectAnswer = optionKeys[newCorrectIndex];
  
  const newOptions = {};
  shuffledOptions.forEach((opt, index) => {
    newOptions[optionKeys[index]] = opt.value;
  });
  
  return {
    ...question,
    options: newOptions,
    correctAnswer: newCorrectAnswer,
    _originalCorrectAnswer: originalCorrectKey,
  };
};

/**
 * Randomize all questions and their options
 */
export const randomizeTest = (questions, userId) => {
  const seed = userId 
    ? userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Date.now();
  
  return questions.map((question, index) => {
    const optionSeed = seed + index * 1000;
    return randomizeOptions(question, optionSeed);
  });
};

export default useAntiCheat;
