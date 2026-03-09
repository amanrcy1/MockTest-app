import { useCallback, useRef } from "react";

/**
 * Shared session persistence logic for all test modes.
 *
 * @param {string} sessionKey   – localStorage key for the full session payload
 * @param {string} activeKey    – localStorage key for the lightweight "active session" marker
 * @param {Object} opts
 * @param {string} opts.mode        – "mock" | "practice" | "custom"
 * @param {string} opts.examType    – exam type string
 * @param {string} opts.userId      – current user UID
 * @param {Object} [opts.settings]  – custom test settings (only for custom mode)
 */
export const useTestSession = (sessionKey, activeKey, opts = {}) => {
  const lastSavedRef = useRef(0);
  const { mode, examType, userId, settings } = opts;

  /** Persist session to localStorage (throttled to once per 5s) */
  const saveSession = useCallback(
    (payload) => {
      if (!payload) return;
      const now = Date.now();
      if (now - lastSavedRef.current < 5000) return;
      lastSavedRef.current = now;

      try {
        localStorage.setItem(
          sessionKey,
          JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })
        );
        localStorage.setItem(
          activeKey,
          JSON.stringify({
            mode,
            userId: userId || null,
            examType,
            ...(settings ? { settings } : {}),
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Handle localStorage quota exceeded — try clearing stale sessions
        if (error?.name === "QuotaExceededError" || error?.code === 22) {
          try {
            // Remove old test sessions to free space
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("mockTestSession") || key.startsWith("practiceSession") || key.startsWith("customTestSession")) && key !== sessionKey) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
            // Retry once after cleanup
            localStorage.setItem(
              sessionKey,
              JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })
            );
          } catch {
            // Storage is truly full — session won't be saved but test continues
            console.warn("localStorage quota exceeded. Session save skipped.");
          }
        }
      }
    },
    [sessionKey, activeKey, mode, examType, userId, settings]
  );

  /** Load a saved session from localStorage. Returns parsed data or null. */
  const loadSavedSession = useCallback(
    (matchFn) => {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return null;
      try {
        const saved = JSON.parse(raw);
        if (matchFn && !matchFn(saved)) return null;
        return saved;
      } catch {
        localStorage.removeItem(sessionKey);
        return null;
      }
    },
    [sessionKey]
  );

  /** Clear session data from localStorage */
  const clearSession = useCallback(() => {
    localStorage.removeItem(sessionKey);
    const activeRaw = localStorage.getItem(activeKey);
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        const isMatch =
          mode === "custom"
            ? active.mode === "custom"
            : active.mode === mode && active.examType === examType;
        if (isMatch) localStorage.removeItem(activeKey);
      } catch {
        localStorage.removeItem(activeKey);
      }
    }
  }, [sessionKey, activeKey, mode, examType]);

  return { saveSession, loadSavedSession, clearSession };
};

export default useTestSession;
