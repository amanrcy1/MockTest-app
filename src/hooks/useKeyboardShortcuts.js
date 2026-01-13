import { useEffect, useCallback } from "react";

/**
 * Custom hook for keyboard shortcuts
 * @param {object} shortcuts - map of key combinations to handlers
 * @param {boolean} enabled - whether shortcuts are active
 */
export const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const tagName = event.target.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      return;
    }

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    // Build key combination string
    let combo = "";
    if (ctrl) combo += "ctrl+";
    if (shift) combo += "shift+";
    if (alt) combo += "alt+";
    combo += key;

    // Check for matching shortcut
    if (shortcuts[combo]) {
      event.preventDefault();
      shortcuts[combo](event);
    }

    // Also check for simple key matches (1, 2, 3, 4, n, p, m, etc.)
    if (!ctrl && !shift && !alt && shortcuts[key]) {
      event.preventDefault();
      shortcuts[key](event);
    }
    
    // Check for arrow keys
    if (shortcuts[event.key]) {
      event.preventDefault();
      shortcuts[event.key](event);
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};

/**
 * Custom hook to warn users before leaving a page with unsaved changes
 * @param {boolean} shouldBlock - Whether to show the warning
 * @param {string} message - Custom message (browsers may ignore this)
 */
export const useNavigationBlock = (shouldBlock, message = 'You have an ongoing test. Are you sure you want to leave?') => {
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock, message]);
};

/**
 * Test-specific keyboard shortcuts
 */
export const TEST_SHORTCUTS = {
  OPTION_A: "1",
  OPTION_B: "2",
  OPTION_C: "3",
  OPTION_D: "4",
  NEXT: "n",
  PREVIOUS: "p",
  MARK_REVIEW: "m",
  CLEAR: "c",
  SUBMIT: "ctrl+enter",
};

/**
 * Create test keyboard shortcuts object
 */
export const createTestShortcuts = ({
  onSelectOption,
  onNext,
  onPrevious,
  onMarkForReview,
  onClearResponse,
}) => ({
  '1': () => onSelectOption?.('A'),
  '2': () => onSelectOption?.('B'),
  '3': () => onSelectOption?.('C'),
  '4': () => onSelectOption?.('D'),
  'a': () => onSelectOption?.('A'),
  'b': () => onSelectOption?.('B'),
  'c': () => onSelectOption?.('C'),
  'd': () => onSelectOption?.('D'),
  'n': () => onNext?.(),
  'p': () => onPrevious?.(),
  'ArrowRight': () => onNext?.(),
  'ArrowLeft': () => onPrevious?.(),
  'm': () => onMarkForReview?.(),
  'r': () => onClearResponse?.(),
});

export default useKeyboardShortcuts;
