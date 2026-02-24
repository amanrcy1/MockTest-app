import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const SWIPE_THRESHOLD = 92;
const MAX_PULL = 150;
const MIN_REFRESH_MS = 700;

const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [data-no-pull-refresh='true'], [role='dialog']",
    ),
  );
};

const isLikelyMobile = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
};

const SwipeRefresh = ({ onRefresh }) => {
  const location = useLocation();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const thresholdHitRef = useRef(false);

  const excludedPaths = useMemo(
    () => ["/test/mock", "/test/practice", "/test/custom", "/admin", "/login"],
    [],
  );

  const isExcluded = useMemo(
    () => excludedPaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
    [excludedPaths, location.pathname],
  );

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    if (isExcluded || !isLikelyMobile()) return undefined;

    const handleTouchStart = (e) => {
      if (refreshing || e.touches.length !== 1 || window.scrollY > 0) return;
      if (isInteractiveTarget(e.target)) return;
      pullingRef.current = true;
      thresholdHitRef.current = false;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!pullingRef.current || refreshing) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0 || window.scrollY > 0) {
        setPullDistance(0);
        if (window.scrollY > 0) pullingRef.current = false;
        return;
      }

      const nextDistance = Math.min(MAX_PULL, delta * 0.65);
      setPullDistance(nextDistance);
      e.preventDefault();

      if (nextDistance >= SWIPE_THRESHOLD && !thresholdHitRef.current) {
        thresholdHitRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
      }
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current) {
        setPullDistance(0);
        return;
      }

      pullingRef.current = false;
      const shouldRefresh = pullDistanceRef.current >= SWIPE_THRESHOLD;
      setPullDistance(0);
      thresholdHitRef.current = false;

      if (!shouldRefresh || refreshing) return;

      setRefreshing(true);
      const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS));
      try {
        await Promise.all([onRefresh(), minDelay]);
      } finally {
        setRefreshing(false);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isExcluded, onRefresh, refreshing]);

  if (isExcluded) return null;

  const progress = Math.min(1, pullDistance / SWIPE_THRESHOLD);
  const visible = pullDistance > 1 || refreshing;
  const title = refreshing
    ? "Refreshing..."
    : progress >= 1
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.9 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[65] pointer-events-none"
        >
          <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 dark:border-blue-700/60 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-xl px-4 py-2 min-w-[220px]">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10"
              animate={{ x: ["-30%", "30%", "-30%"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex items-center gap-3">
              <motion.div
                className="w-7 h-7 rounded-full border-2 border-blue-400/80 dark:border-blue-400/70 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30"
                animate={refreshing ? { rotate: 360 } : { rotate: progress * 240 }}
                transition={refreshing ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.15 }}
              >
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-4-4l4 4-4 4" />
                </svg>
              </motion.div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{title}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {refreshing ? "Syncing latest data" : `${Math.round(progress * 100)}% ready`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

SwipeRefresh.propTypes = {
  onRefresh: PropTypes.func,
};

SwipeRefresh.defaultProps = {
  onRefresh: () => {
    window.location.reload();
    return Promise.resolve();
  },
};

export default SwipeRefresh;
