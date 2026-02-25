import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";

const SWIPE_THRESHOLD = 96;
const MAX_PULL = 172;
const MIN_REFRESH_MS = 700;
const REFRESH_HOLD_OFFSET = 42;

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

const getMainContentNode = () => document.getElementById("main-content");
const getPageScrollTop = () => {
  if (typeof window === "undefined") return 0;
  const docTop = document.scrollingElement?.scrollTop ?? document.documentElement?.scrollTop ?? 0;
  return Math.max(window.scrollY || 0, docTop);
};

const applyContentOffset = (offset, animated = false) => {
  const node = getMainContentNode();
  if (!node) return;
  node.style.willChange = "transform";
  node.style.transition = animated ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
  node.style.transform = `translate3d(0, ${Math.max(0, Math.round(offset))}px, 0)`;
};

const clearContentOffset = () => {
  const node = getMainContentNode();
  if (!node) return;
  node.style.transform = "";
  node.style.transition = "";
  node.style.willChange = "";
};

const SwipeRefresh = ({ onRefresh }) => {
  const [isMobile, setIsMobile] = useState(isLikelyMobile());
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const thresholdHitRef = useRef(false);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    const onResize = () => setIsMobile(isLikelyMobile());
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return undefined;

    const handleTouchStart = (e) => {
      if (refreshing || e.touches.length !== 1 || getPageScrollTop() > 0) return;
      if (isInteractiveTarget(e.target)) return;
      pullingRef.current = true;
      thresholdHitRef.current = false;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!pullingRef.current || refreshing) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0 || getPageScrollTop() > 0) {
        setPullDistance(0);
        applyContentOffset(0);
        if (getPageScrollTop() > 0) pullingRef.current = false;
        return;
      }

      const elasticDistance = delta < 120 ? delta * 0.74 : 88 + Math.sqrt((delta - 120) * 98);
      const nextDistance = Math.min(MAX_PULL, elasticDistance);
      setPullDistance(nextDistance);
      applyContentOffset(nextDistance * 0.48);
      e.preventDefault();

      if (nextDistance >= SWIPE_THRESHOLD && !thresholdHitRef.current) {
        thresholdHitRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
      }
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current) {
        setPullDistance(0);
        applyContentOffset(0, true);
        return;
      }

      pullingRef.current = false;
      const shouldRefresh = pullDistanceRef.current >= SWIPE_THRESHOLD;
      setPullDistance(0);
      thresholdHitRef.current = false;

      if (!shouldRefresh || refreshing) {
        applyContentOffset(0, true);
        return;
      }

      setRefreshing(true);
      applyContentOffset(REFRESH_HOLD_OFFSET, true);
      const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS));
      try {
        await Promise.all([onRefresh(), minDelay]);
      } finally {
        setRefreshing(false);
        applyContentOffset(0, true);
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
      clearContentOffset();
    };
  }, [isMobile, onRefresh, refreshing]);

  if (!isMobile) return null;

  const progress = Math.min(1, pullDistance / SWIPE_THRESHOLD);
  const visible = pullDistance > 1 || refreshing;
  const sheetHeight = Math.round((refreshing ? REFRESH_HOLD_OFFSET : 0) + pullDistance * 0.72);
  const waveStrength = Math.round((refreshing ? 10 : 0) + pullDistance * 0.22);
  const title = refreshing
    ? "Refreshing..."
    : progress >= 1
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[64] pointer-events-none"
          >
            <motion.div
              className="relative overflow-hidden bg-gradient-to-b from-sky-300/35 via-blue-300/25 to-transparent dark:from-blue-500/30 dark:via-blue-500/10 dark:to-transparent backdrop-blur-[2px]"
              style={{ height: sheetHeight }}
            >
              <motion.div
                className="absolute -bottom-10 left-1/2 h-24 w-[120%] -translate-x-1/2 rounded-[100%] bg-blue-500/20 dark:bg-blue-400/20 blur-md"
                animate={{ scaleX: refreshing ? [1, 1.07, 1] : 1 + progress * 0.08, y: refreshing ? [0, -3, 0] : 0 }}
                transition={refreshing ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.12 }}
              />
              <svg
                className="absolute -bottom-6 left-0 w-full h-12 text-blue-500/20 dark:text-blue-400/25"
                viewBox="0 0 100 24"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d={`M0 0 H100 V14 Q50 ${14 + waveStrength} 0 14 Z`} fill="currentColor" />
              </svg>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.94 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-[65] pointer-events-none"
          >
            <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-700/60 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl shadow-lg px-4 py-2 min-w-[225px]">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-indigo-500/10"
                animate={{ x: ["-30%", "35%", "-30%"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative flex items-center gap-3">
                <motion.div
                  className="w-8 h-8 rounded-full border-2 border-blue-400/80 dark:border-blue-400/70 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 shadow-inner"
                  animate={refreshing ? { rotate: 360, scale: [1, 1.08, 1] } : { rotate: progress * 260, scale: 0.95 + progress * 0.1 }}
                  transition={refreshing ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.14 }}
                >
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 12h16m-4-4l4 4-4 4" />
                  </svg>
                </motion.div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{title}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {refreshing ? "Fetching latest updates" : `${Math.round(progress * 100)}% ready`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

SwipeRefresh.propTypes = {
  onRefresh: PropTypes.func,
};

SwipeRefresh.defaultProps = {
  // Default is a soft refresh animation only; callers can pass a hard reload if needed.
  onRefresh: () => Promise.resolve(),
};

export default SwipeRefresh;
