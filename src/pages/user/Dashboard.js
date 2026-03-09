import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { startOfWeek, getISOWeek, getISOWeekYear, formatDistanceToNow } from "date-fns";
import { db } from "../../config/firebase";
import { ThemeToggle } from "../../components";
import { BottomNav } from "../../components";
import { TopNav } from "../../components";
import { DashboardSkeleton } from "../../components/ui/LoadingSkeleton";
import logger from "../../utils/logger";
import { getSafePhotoURL } from "../../utils/avatarUtils";

// Cache for dashboard stats (5 minute TTL)
const statsCache = { data: null, timestamp: 0, userId: null, examType: null };
const CACHE_TTL = 5 * 60 * 1000;
const hideBrokenImage = (e) => { e.currentTarget.style.display = "none"; };

// ── Greeting helper ──
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ── Motivational line based on stats ──
const getMotivation = (attempted, accuracy) => {
  if (attempted === 0) return "Ready to start your journey?";
  if (accuracy >= 80) return "You're on fire. Keep it up.";
  if (accuracy >= 60) return "Solid progress. Push a little harder.";
  if (accuracy >= 40) return "Every test makes you sharper.";
  return "Consistency is key. Keep going.";
};

// ── Mini sparkline (last N accuracy values) ──
const Sparkline = ({ data, width = 120, height = 36 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`}
        fill="url(#sparkGrad)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(59,130,246)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      {data.length > 0 && (() => {
        const lastX = pad + ((data.length - 1) / (data.length - 1)) * (width - pad * 2);
        const lastY = height - pad - ((data[data.length - 1] - min) / range) * (height - pad * 2);
        return <circle cx={lastX} cy={lastY} r="3" fill="rgb(59,130,246)" />;
      })()}
    </svg>
  );
};

// ── Circular progress ring ──
const ProgressRing = ({ value, size = 56, stroke = 5, color = "text-blue-500" }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200 dark:text-gray-700" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={stroke} strokeLinecap="round"
        className={color}
        stroke="currentColor"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ strokeDasharray: circumference }}
      />
    </svg>
  );
};

// ── Subject performance bar ──
const SubjectBar = ({ subject, accuracy, count, delay = 0 }) => {
  const barColor = accuracy >= 70 ? "bg-emerald-500" : accuracy >= 45 ? "bg-amber-500" : "bg-red-400";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate font-medium">{subject}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(accuracy, 3)}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{accuracy.toFixed(0)}%</span>
      <span className="text-[10px] text-gray-400 w-6 text-right">{count}</span>
    </motion.div>
  );
};

// ── Recent test item ──
const RecentTestItem = ({ test, onClick, delay = 0 }) => {
  const acc = Number(test.accuracy || 0);
  const accColor = acc >= 70 ? "text-emerald-600 dark:text-emerald-400" : acc >= 45 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400";
  const timeAgo = test.endTime ? formatDistanceToNow(new Date(test.endTime), { addSuffix: true }) : "";

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors group"
    >
      {/* Accuracy ring */}
      <div className="relative flex-shrink-0">
        <ProgressRing
          value={acc}
          size={44}
          stroke={4}
          color={acc >= 70 ? "text-emerald-500" : acc >= 45 ? "text-amber-500" : "text-red-400"}
        />
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${accColor}`}>
          {acc.toFixed(0)}%
        </span>
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{test.examType}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {test.correct}/{(test.correct || 0) + (test.incorrect || 0) + (test.skipped || 0)} correct · {timeAgo}
        </p>
      </div>
      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
};

// ── Quick action card ──
const QuickActionCard = ({ title, subtitle, icon, gradient, onClick, delay = 0 }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 120 }}
    whileHover={{ scale: 1.02, y: -3 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-5 text-left text-white overflow-hidden shadow-lg group`}
  >
    <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
    <div className="relative z-10">
      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-xs text-white/75 mt-0.5">{subtitle}</p>
    </div>
  </motion.button>
);

// ── Quick link row ──
const QuickLink = ({ title, icon, iconBg, onClick, delay = 0 }) => (
  <motion.button
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors group w-full"
  >
    <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <span className="flex-1 text-left text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </motion.button>
);

// ============================================
// MAIN DASHBOARD
// ============================================
const Dashboard = () => {
  const { userDetails, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attempted: 0,
    averageAccuracy: 0,
    weeklyRank: null,
    recentTests: [],
    subjectBreakdown: [],
    accuracyTrend: [],
    bestScore: 0,
    totalCorrect: 0,
    streak: 0,
  });
  const [activeSession, setActiveSession] = useState(null);
  const [cdsPaperSession, setCdsPaperSession] = useState(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) { setLoading(false); return; }
      if (fetchingRef.current) return;

      const examTypeForRank = userDetails?.targetExam || null;
      const now = Date.now();

      // Check cache
      if (
        statsCache.data &&
        statsCache.userId === currentUser.uid &&
        statsCache.examType === examTypeForRank &&
        now - statsCache.timestamp < CACHE_TTL
      ) {
        setStats(statsCache.data);
        setLoading(false);
        return;
      }

      fetchingRef.current = true;

      try {
        const userTestsQuery = query(
          collection(db, "tests"),
          where("userId", "==", currentUser.uid),
          where("completed", "==", true),
        );
        const snapshot = await getDocs(userTestsQuery);
        const userTests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const attempted = userTests.length;
        const averageAccuracy = attempted > 0
          ? userTests.reduce((sum, t) => sum + Number(t.accuracy || 0), 0) / attempted
          : 0;

        // Recent tests (sorted by endTime desc, take 5)
        const sorted = [...userTests].sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
        const recentTests = sorted.slice(0, 5);

        // Accuracy trend (last 8 tests, oldest first)
        const accuracyTrend = sorted.slice(0, 8).reverse().map((t) => Number(t.accuracy || 0));

        // Best score
        const bestScore = attempted > 0 ? Math.max(...userTests.map((t) => Number(t.accuracy || 0))) : 0;

        // Total correct
        const totalCorrect = userTests.reduce((sum, t) => sum + (t.correct || 0), 0);

        // Subject breakdown
        const subjectMap = {};
        userTests.forEach((t) => {
          if (!t.responses) return;
          t.responses.forEach((r) => {
            const subj = r.subject || "General";
            if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
            subjectMap[subj].total++;
            if (r.selectedAnswer !== null && r.selectedAnswer === r.correctAnswer) {
              subjectMap[subj].correct++;
            }
          });
        });
        const subjectBreakdown = Object.entries(subjectMap)
          .map(([subject, d]) => ({
            subject,
            accuracy: d.total > 0 ? (d.correct / d.total) * 100 : 0,
            count: d.total,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Streak: consecutive days with at least one test (from today backwards)
        let streak = 0;
        if (sorted.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayMs = 86400000;
          const testDays = new Set(sorted.map((t) => {
            const d = new Date(t.endTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          }));
          // Check today or yesterday as starting point
          let checkDay = today.getTime();
          if (!testDays.has(checkDay)) {
            checkDay = checkDay - dayMs; // allow yesterday as start
          }
          while (testDays.has(checkDay)) {
            streak++;
            checkDay -= dayMs;
          }
        }

        // Weekly rank
        let weeklyRank = null;
        const targetExam = examTypeForRank || userTests[0]?.examType || null;
        if (targetExam) {
          try {
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const weekNumber = getISOWeek(weekStart);
            const yearNumber = getISOWeekYear(weekStart);
            const weekDocId = `${targetExam}_${yearNumber}_W${weekNumber}`;
            const weekDocSnap = await getDoc(doc(db, "leaderboard", weekDocId));
            if (weekDocSnap.exists()) {
              const entries = weekDocSnap.data().entries || [];
              const rankIndex = entries.findIndex((e) => e.userId === currentUser.uid);
              weeklyRank = rankIndex >= 0 ? rankIndex + 1 : null;
            }
          } catch (rankError) {
            logger.error("Error calculating rank:", rankError);
          }
        }

        const newStats = {
          attempted, averageAccuracy, weeklyRank,
          recentTests, subjectBreakdown, accuracyTrend,
          bestScore, totalCorrect, streak,
        };
        statsCache.data = newStats;
        statsCache.timestamp = now;
        statsCache.userId = currentUser.uid;
        statsCache.examType = examTypeForRank;
        setStats(newStats);
      } catch (error) {
        logger.error("Error loading dashboard stats:", error);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, userDetails?.targetExam]);

  useEffect(() => {
    const stored = localStorage.getItem("activeTestSession");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
      if (parsed.userId && parsed.userId !== currentUser?.uid) return;
      if (Date.now() - updatedAt > 6 * 60 * 60 * 1000) {
        localStorage.removeItem("activeTestSession");
        return;
      }
      setActiveSession(parsed);
    } catch {
      localStorage.removeItem("activeTestSession");
    }
  }, [currentUser]);

  // Detect active CDS multi-paper session
  useEffect(() => {
    if (!currentUser) return;
    const key = `mockPaperSession_CDS_${currentUser.uid}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { setCdsPaperSession(null); return; }
      const data = JSON.parse(raw);
      const sessionDate = new Date(data.createdAt).toDateString();
      const today = new Date().toDateString();
      if (sessionDate !== today) { setCdsPaperSession(null); return; }
      const completed = data.completed || {};
      const completedCount = Object.values(completed).filter(Boolean).length;
      if (completedCount === 0 || completedCount >= 3) { setCdsPaperSession(null); return; }
      // Check if next paper is on break
      const sections = ["cds_english", "cds_gk", "cds_math"];
      const completedAtMap = data.completedAt || {};
      const breakSkippedMap = data.breakSkipped || {};
      let nextPaperLabel = null;
      let breakRemaining = 0;
      for (let i = 0; i < sections.length; i++) {
        if (!completed[sections[i]]) {
          nextPaperLabel = ["English", "General Knowledge", "Mathematics"][i];
          if (i > 0 && completedAtMap[sections[i - 1]] && !breakSkippedMap[sections[i]]) {
            const elapsed = Date.now() - new Date(completedAtMap[sections[i - 1]]).getTime();
            breakRemaining = Math.max(0, 60 * 60 * 1000 - elapsed);
          }
          break;
        }
      }
      setCdsPaperSession({ completedCount, nextPaperLabel, breakRemaining });
    } catch {
      setCdsPaperSession(null);
    }
  }, [currentUser]);

  const rankDisplay = useMemo(() => {
    const r = stats.weeklyRank;
    if (!r) return { label: "Unranked", color: "text-gray-500", badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" };
    if (r === 1) return { label: `#${r} Champion`, color: "text-yellow-600", badge: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" };
    if (r <= 3) return { label: `#${r} Elite`, color: "text-purple-600", badge: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" };
    if (r <= 10) return { label: `#${r} Master`, color: "text-blue-600", badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" };
    return { label: `#${r}`, color: "text-gray-700", badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" };
  }, [stats.weeklyRank]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
        <TopNav />
        <header className="glass-card sticky top-0 z-40 md:hidden">
          <div className="px-4 py-3 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="px-4 py-5 max-w-7xl mx-auto"><DashboardSkeleton /></main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      <TopNav />

      {/* Mobile header */}
      <header className="glass-card sticky top-0 z-40 md:hidden">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                  {userDetails?.name?.charAt(0)?.toUpperCase() || "U"}
                  {getSafePhotoURL(userDetails?.photoURL) && (
                    <img src={getSafePhotoURL(userDetails?.photoURL)} alt="Profile" className="absolute inset-0 w-full h-full object-cover" onError={hideBrokenImage} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{getGreeting()}</p>
                <h1 className="font-semibold text-gray-900 dark:text-white">{userDetails?.name?.split(" ")[0]}</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-7xl mx-auto space-y-5">

        {/* ── Resume session banner ── */}
        <AnimatePresence>
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <motion.div className="p-1.5 bg-white/20 rounded-lg" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </motion.div>
                <p className="font-semibold text-white text-sm truncate">Continue {activeSession.mode} &middot; {activeSession.examType}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { localStorage.removeItem("activeTestSession"); setActiveSession(null); }} className="p-1.5 text-white/80 hover:bg-white/20 rounded-lg transition-colors" aria-label="Dismiss">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <button
                  onClick={() => {
                    if (activeSession.mode === "mock") navigate("/test/mock", { state: { examType: activeSession.examType, resume: true } });
                    else if (activeSession.mode === "practice") navigate("/test/practice", { state: { examType: activeSession.examType, resume: true } });
                    else if (activeSession.mode === "custom" && activeSession.settings) navigate("/test/custom", { state: { settings: activeSession.settings, resume: true } });
                  }}
                  className="px-4 py-1.5 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                >Resume</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CDS multi-paper session banner ── */}
        {cdsPaperSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">CDS Mock: {cdsPaperSession.completedCount}/3 papers done</p>
                <p className="text-xs text-white/80 truncate">
                  {cdsPaperSession.breakRemaining > 0
                    ? `Next: ${cdsPaperSession.nextPaperLabel} (break: ${Math.ceil(cdsPaperSession.breakRemaining / 60000)} min left)`
                    : `Next: ${cdsPaperSession.nextPaperLabel}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/test/paper-selection", { state: { examType: "CDS" } })}
              className="px-4 py-1.5 bg-white text-amber-600 text-sm font-semibold rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap"
            >Continue</button>
          </motion.div>
        )}

        {/* ── Desktop greeting (hidden on mobile, shown on md+) ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getGreeting()}, {userDetails?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{getMotivation(stats.attempted, stats.averageAccuracy)}</p>
          </div>
          {userDetails?.targetExam && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${rankDisplay.badge}`}>
              {userDetails.targetExam} &middot; {rankDisplay.label}
            </span>
          )}
        </motion.div>

        {/* ── Stats overview row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: stats.attempted, label: "Tests Taken", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, color: "blue" },
            { value: `${stats.averageAccuracy.toFixed(0)}%`, label: "Avg Accuracy", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "green" },
            { value: stats.totalCorrect, label: "Correct Answers", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>, color: "purple" },
            { value: stats.streak > 0 ? `${stats.streak}d` : "-", label: "Day Streak", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>, color: "orange" },
          ].map((s, i) => {
            const colors = {
              blue: { bg: "from-blue-500 to-blue-600", text: "text-blue-600 dark:text-blue-400" },
              green: { bg: "from-emerald-500 to-emerald-600", text: "text-emerald-600 dark:text-emerald-400" },
              purple: { bg: "from-purple-500 to-purple-600", text: "text-purple-600 dark:text-purple-400" },
              orange: { bg: "from-orange-500 to-orange-600", text: "text-orange-600 dark:text-orange-400" },
            }[s.color];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 120 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${colors.bg} text-white mb-2`}>
                  {s.icon}
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${colors.text}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Empty state ── */}
        {stats.attempted === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">No tests yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">Take your first mock test to unlock insights, rank, and performance tracking.</p>
            <button onClick={() => navigate("/test-selection")} className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Start First Test
            </button>
          </motion.div>
        )}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            title="Mock Test"
            subtitle="Full exam simulation"
            gradient="from-blue-500 via-blue-600 to-indigo-600"
            delay={0.15}
            onClick={() => navigate("/test-selection")}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          />
          <QuickActionCard
            title="Practice"
            subtitle="Topic-wise learning"
            gradient="from-emerald-500 via-emerald-600 to-teal-600"
            delay={0.2}
            onClick={() => navigate("/test-selection", { state: { mode: "practice" } })}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />
        </div>

        {/* ── Accuracy trend + Best score (side by side on desktop) ── */}
        {stats.attempted > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Accuracy trend */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accuracy Trend</p>
                <span className="text-[10px] text-gray-400">Last {stats.accuracyTrend.length} tests</span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <Sparkline data={stats.accuracyTrend} width={160} height={40} />
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.accuracyTrend[stats.accuracyTrend.length - 1]?.toFixed(0)}%</p>
                  <p className="text-[10px] text-gray-400">latest</p>
                </div>
              </div>
            </motion.div>

            {/* Best score */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
            >
              <div className="relative flex-shrink-0">
                <ProgressRing value={stats.bestScore} size={64} stroke={5} color="text-amber-500" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-400">{stats.bestScore.toFixed(0)}%</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personal Best</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{stats.bestScore.toFixed(0)}% accuracy</p>
                <p className="text-[10px] text-gray-400 mt-0.5">across {stats.attempted} tests</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Subject breakdown ── */}
        {stats.subjectBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject Performance</p>
              <span className="text-[10px] text-gray-400">accuracy / questions</span>
            </div>
            <div className="space-y-2.5">
              {stats.subjectBreakdown.map((s, i) => (
                <SubjectBar key={s.subject} subject={s.subject} accuracy={s.accuracy} count={s.count} delay={i * 0.04} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Recent tests ── */}
        {stats.recentTests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Tests</p>
              <button onClick={() => navigate("/test/history")} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {stats.recentTests.slice(0, 3).map((t, i) => (
                <RecentTestItem
                  key={t.id}
                  test={t}
                  delay={i * 0.05}
                  onClick={() => navigate(`/test/result/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Quick links ── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Quick Access</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <QuickLink title="Leaderboard" delay={0.4} onClick={() => navigate("/leaderboard")} iconBg="bg-purple-100 dark:bg-purple-900/30" icon={<svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <QuickLink title="Test History" delay={0.45} onClick={() => navigate("/test/history")} iconBg="bg-orange-100 dark:bg-orange-900/30" icon={<svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <QuickLink title="Bookmarks" delay={0.5} onClick={() => navigate("/bookmarks")} iconBg="bg-amber-100 dark:bg-amber-900/30" icon={<svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} />
            <QuickLink title="Custom Test" delay={0.55} onClick={() => navigate("/test/custom-setup")} iconBg="bg-cyan-100 dark:bg-cyan-900/30" icon={<svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>} />
            {userDetails?.isAdmin && (
              <QuickLink title="Admin Panel" delay={0.6} onClick={() => navigate("/admin/dashboard")} iconBg="bg-pink-100 dark:bg-pink-900/30" icon={<svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            )}
          </div>
        </div>

        {/* ── Target exam + rank badge (mobile) ── */}
        {userDetails?.targetExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="md:hidden bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Target Exam</p>
              <p className="font-bold text-gray-900 dark:text-white">{userDetails.targetExam}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rankDisplay.badge}`}>
              {rankDisplay.label}
            </span>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
