import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import {
  addWeeks,
  endOfWeek,
  getISOWeek,
  getISOWeekYear,
  startOfWeek,
} from "date-fns";
import { motion } from "framer-motion";
import { db } from "../../config/firebase";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import { TopNav, BottomNav } from "../../components";
import { LeaderboardSkeleton } from "../../components/ui/LoadingSkeleton";
import { getSafePhotoURL } from "../../utils/avatarUtils";

// Cache for leaderboard data (keyed by examType_weekOffset)
const leaderboardCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const getRefreshEpoch = () => (typeof window !== "undefined" ? Number(window.__APP_REFRESH_EPOCH__ || 0) : 0);
const hideBrokenImage = (e) => {
  e.currentTarget.style.display = "none";
};
const formatScore = (value) => Number(value || 0).toFixed(2);
const formatAccuracy = (value) => `${Math.round(Number(value || 0))}%`;

const Leaderboard = () => {
  const navigate = useNavigate();
  const { currentUser, userDetails } = useAuth();
  const [examType, setExamType] = useState("CDS");
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [myOutsideEntry, setMyOutsideEntry] = useState(null);
  const [error, setError] = useState("");
  const fetchingRef = useRef(false);

  const weekRange = useMemo(() => {
    const base = addWeeks(new Date(), -weekOffset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    return { start, end };
  }, [weekOffset]);

  const handleExamChange = useCallback((e) => setExamType(e.target.value), []);
  const handleWeekChange = useCallback((e) => setWeekOffset(Number(e.target.value)), []);
  const handleBack = useCallback(() => navigate("/dashboard"), [navigate]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (fetchingRef.current) return;
      
      const cacheKey = `${examType}_${weekOffset}`;
      const cached = leaderboardCache.get(cacheKey);
      const now = Date.now();
      const refreshEpoch = getRefreshEpoch();
      
      // Use cache if valid
      if (cached && cached.refreshEpoch === refreshEpoch && now - cached.timestamp < CACHE_TTL) {
        setEntries(cached.entries);
        if (currentUser) {
          const index = cached.allSorted.findIndex((e) => e.userId === currentUser.uid);
          setMyRank(index >= 0 ? index + 1 : null);
          if (index >= 100) {
            const mine = cached.allSorted[index];
            setMyOutsideEntry({
              ...mine,
              rank: index + 1,
              name: userDetails?.name || "You",
              photoURL: userDetails?.photoURL || null,
              isDeleted: false,
            });
          } else {
            setMyOutsideEntry(null);
          }
        }
        setLoading(false);
        return;
      }

      fetchingRef.current = true;

      try {
        setError("");
        setLoading(true);
        const weekNumber = getISOWeek(weekRange.start);
        const yearNumber = getISOWeekYear(weekRange.start);
        const weekDocId = `${examType}_${yearNumber}_W${weekNumber}`;
        const weekDocRef = doc(db, "leaderboard", weekDocId);

        // Check if we have a stored leaderboard for past weeks
        if (weekOffset > 0) {
          const weekDocSnap = await getDoc(weekDocRef);
          if (weekDocSnap.exists()) {
            const storedEntries = weekDocSnap.data()?.entries || [];
            setEntries(storedEntries);
            
            // Cache the result
            leaderboardCache.set(cacheKey, {
              entries: storedEntries,
              allSorted: storedEntries,
              timestamp: now,
              refreshEpoch,
            });
            
            if (currentUser) {
              const index = storedEntries.findIndex((e) => e.userId === currentUser.uid);
              setMyRank(index >= 0 ? index + 1 : null);
              setMyOutsideEntry(null);
            }
            return;
          }
        }

        const startIso = weekRange.start.toISOString();
        const endIso = weekRange.end.toISOString();

        let snapshot;
        try {
          const q = query(
            collection(db, "tests"),
            where("examType", "==", examType),
            where("completed", "==", true),
            where("endTime", ">=", startIso),
            where("endTime", "<=", endIso),
          );
          snapshot = await getDocs(q);
        } catch {
          // Index fallback: still functional, but more expensive.
          const fallbackQ = query(
            collection(db, "tests"),
            where("examType", "==", examType),
            where("completed", "==", true),
          );
          snapshot = await getDocs(fallbackQ);
        }

        const bestByUser = new Map();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const endTime = data.endTime ? new Date(data.endTime) : null;
          if (!endTime || endTime < weekRange.start || endTime > weekRange.end) return;
          if (data.score == null) return;

          const scoreData = {
            totalMarks: data.score,
            accuracy: data.accuracy ?? "0",
          };
          const timeTaken = data.timeTaken ?? null;
          const existing = bestByUser.get(data.userId);
          
          if (
            !existing ||
            scoreData.totalMarks > existing.score ||
            (scoreData.totalMarks === existing.score &&
              timeTaken !== null &&
              existing.timeTaken !== null &&
              timeTaken < existing.timeTaken)
          ) {
            bestByUser.set(data.userId, {
              userId: data.userId,
              score: scoreData.totalMarks,
              accuracy: scoreData.accuracy,
              timeTaken,
            });
          }
        });

        const sorted = Array.from(bestByUser.values()).sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.timeTaken === null || b.timeTaken === null) return 0;
          return a.timeTaken - b.timeTaken;
        });

        const topEntries = sorted.slice(0, 100);
        const userDocs = await Promise.all(
          topEntries.map((entry) => getDoc(doc(db, "users", entry.userId))),
        );

        const enriched = topEntries.map((entry, index) => {
          const userDoc = userDocs[index];
          const userData = userDoc.exists() ? userDoc.data() : {};
          return {
            ...entry,
            name: userData.name || (userDoc.exists() ? "User" : "[Deleted User]"),
            photoURL: userData.photoURL || null,
            rank: index + 1,
            isDeleted: !userDoc.exists(),
          };
        });

        setEntries(enriched);
        
        // Cache the result
        leaderboardCache.set(cacheKey, {
          entries: enriched,
          allSorted: sorted,
          timestamp: now,
          refreshEpoch,
        });

        if (currentUser) {
          const index = sorted.findIndex((entry) => entry.userId === currentUser.uid);
          setMyRank(index >= 0 ? index + 1 : null);
          if (index >= 100) {
            const mine = sorted[index];
            setMyOutsideEntry({
              ...mine,
              rank: index + 1,
              name: userDetails?.name || "You",
              photoURL: userDetails?.photoURL || null,
              isDeleted: false,
            });
          } else {
            setMyOutsideEntry(null);
          }
        }

        // Snapshot writes are server/admin responsibility only.
      } catch (err) {
        setEntries([]);
        setMyRank(null);
        setMyOutsideEntry(null);
        if (err?.code === "permission-denied") {
          setError("Leaderboard is temporarily unavailable due to access rules.");
        } else {
          setError("Failed to load leaderboard. Please try again.");
        }
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchLeaderboard();
  }, [currentUser, examType, userDetails?.name, userDetails?.photoURL, weekOffset, weekRange.end, weekRange.start]);

  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      <TopNav />
      <nav className="glass-card sticky top-0 md:top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                Weekly Leaderboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {weekRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={weekOffset}
                onChange={handleWeekChange}
                className="px-4 py-2.5 min-h-11 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
              >
                <option value={0}>This Week</option>
                <option value={1}>Last Week</option>
                <option value={2}>2 Weeks Ago</option>
                <option value={3}>3 Weeks Ago</option>
                <option value={4}>4 Weeks Ago</option>
              </select>
              <select
                value={examType}
                onChange={handleExamChange}
                className="px-4 py-2.5 min-h-11 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
              >
                {Object.keys(EXAM_PATTERNS).map((key) => (
                  <option key={key} value={key}>
                    {EXAM_PATTERNS[key].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold gradient-text">Leaderboard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {weekRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-2 min-h-11 min-w-11 bg-gray-100 dark:bg-gray-700 rounded-xl"
                  aria-label="Back"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={weekOffset}
                onChange={handleWeekChange}
                className="w-full px-3 py-2.5 min-h-11 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white truncate"
              >
                <option value={0}>This Week</option>
                <option value={1}>Last Week</option>
                <option value={2}>2 Weeks Ago</option>
                <option value={3}>3 Weeks Ago</option>
                <option value={4}>4 Weeks Ago</option>
              </select>
              <select
                value={examType}
                onChange={handleExamChange}
                className="w-full px-3 py-2.5 min-h-11 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white truncate"
              >
                {Object.keys(EXAM_PATTERNS).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {currentUser && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6"
          >
            <p className="text-blue-700 dark:text-blue-300 font-semibold text-sm sm:text-base flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {myRank ? `Your current rank: #${myRank}` : "You are not ranked this week yet."}
            </p>
          </motion.div>
        )}

        {loading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700"
          >
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Complete a test and refresh, or try again in a moment.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 min-h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No completed tests this week yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to take a test!</p>
          </motion.div>
        ) : (
          <>
            {/* Top 3 - Compact Highlight */}
            {entries.length >= 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4"
              >
                <div className="flex items-center justify-center gap-4">
                  {entries.slice(0, 3).map((entry, idx) => {
                    const medals = [<svg key="gold" className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>, <svg key="silver" className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>, <svg key="bronze" className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>];
                    return (
                      <div key={entry.userId} className="text-center">
                        <div className="flex justify-center mb-1">{medals[idx]}</div>
                        <div className={`relative w-12 h-12 rounded-full mx-auto mb-1 overflow-hidden ${
                          entry.isDeleted 
                            ? "bg-gray-400" 
                            : "bg-gradient-to-br from-blue-500 to-purple-600"
                        }`}>
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {entry.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          {getSafePhotoURL(entry.photoURL) && (
                            <img
                              src={getSafePhotoURL(entry.photoURL)}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={hideBrokenImage}
                            />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[80px]">
                          {entry.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatScore(entry.score)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Full Leaderboard Table */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/50 px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                <span>Rank</span>
                <span>Name</span>
                <span>Score</span>
                <span>Accuracy</span>
              </div>
              
              {/* Mobile Card / Desktop Row */}
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.userId}
                  className={`border-t border-gray-100 dark:border-gray-700 ${
                    entry.userId === currentUser?.uid 
                      ? "bg-blue-50 dark:bg-blue-900/20" 
                      : ""
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ backgroundColor: entry.userId === currentUser?.uid ? undefined : "rgba(59, 130, 246, 0.05)" }}
                >
                  {/* Desktop Row */}
                  <div className="hidden sm:grid grid-cols-4 gap-4 px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-bold flex items-center gap-2">
                      {entry.rank <= 3 && (
                        <span className="inline-flex">{entry.rank === 1 ? <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg> : entry.rank === 2 ? <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg> : <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>}</span>
                      )}
                      #{entry.rank}
                    </span>
                    <span className="truncate flex items-center gap-2">
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 ${
                        entry.isDeleted 
                          ? "bg-gray-400 dark:bg-gray-600" 
                          : "bg-gradient-to-br from-blue-500 to-purple-600"
                      }`}>
                        {entry.name?.charAt(0)?.toUpperCase() || "U"}
                        {getSafePhotoURL(entry.photoURL) && (
                          <img
                            src={getSafePhotoURL(entry.photoURL)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={hideBrokenImage}
                          />
                        )}
                      </div>
                      <span className={`truncate ${entry.isDeleted ? "text-gray-400 dark:text-gray-500 italic" : ""}`}>
                        {entry.name}
                      </span>
                      {entry.userId === currentUser?.uid && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatScore(entry.score)}</span>
                    <span className="text-green-600 dark:text-green-400">{formatAccuracy(entry.accuracy)}</span>
                  </div>
                  
                  {/* Mobile Card */}
                  <div className="sm:hidden p-4">
                    <div className="flex items-center gap-3">
                      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0 ${
                        entry.isDeleted 
                          ? "bg-gray-400 dark:bg-gray-600" 
                          : "bg-gradient-to-br from-blue-500 to-purple-600"
                      }`}>
                        {entry.name?.charAt(0)?.toUpperCase() || "U"}
                        {getSafePhotoURL(entry.photoURL) && (
                          <img
                            src={getSafePhotoURL(entry.photoURL)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={hideBrokenImage}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {entry.rank <= 3 && (
                                <span className="mr-1 inline-flex">{entry.rank === 1 ? <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg> : entry.rank === 2 ? <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg> : <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>}</span>
                              )}
                              #{entry.rank}
                            </span>
                            {entry.userId === currentUser?.uid && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-medium">You</span>
                            )}
                          </div>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatScore(entry.score)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span className={`truncate max-w-[60%] ${entry.isDeleted ? "text-gray-400 dark:text-gray-500 italic" : ""}`}>
                            {entry.name}
                          </span>
                          <span className="text-green-600 dark:text-green-400">{formatAccuracy(entry.accuracy)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {myOutsideEntry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sticky bottom-24 md:bottom-4 z-10 bg-blue-50 dark:bg-blue-900/25 border border-blue-200 dark:border-blue-800 rounded-2xl p-3"
              >
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Your Position</p>
                <div className="grid grid-cols-4 gap-3 items-center text-sm">
                  <span className="font-bold text-blue-700 dark:text-blue-300">#{myOutsideEntry.rank}</span>
                  <span className="truncate text-gray-800 dark:text-gray-100">{myOutsideEntry.name}</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{formatScore(myOutsideEntry.score)}</span>
                  <span className="text-green-600 dark:text-green-400">{formatAccuracy(myOutsideEntry.accuracy)}</span>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
