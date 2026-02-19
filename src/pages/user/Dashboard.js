import { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast, { messages } from "../../utils/toast";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { startOfWeek, endOfWeek, getISOWeek, getISOWeekYear } from "date-fns";
import { db } from "../../config/firebase";
import { ThemeToggle } from "../../components";
import { BottomNav } from "../../components";
import { TopNav } from "../../components";
import logger from "../../utils/logger";

// Cache for dashboard stats (5 minute TTL)
const statsCache = { data: null, timestamp: 0, userId: null, examType: null };
const CACHE_TTL = 5 * 60 * 1000;

// 3D Stats Card Component
const StatsCard3D = ({ value, label, icon, color, delay = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({ x: y * 10, y: -x * 10 });
  };

  const colorConfig = {
    blue: { bg: "from-blue-500 to-blue-600", glow: "shadow-blue-500/30", text: "text-blue-600" },
    green: { bg: "from-emerald-500 to-emerald-600", glow: "shadow-emerald-500/30", text: "text-emerald-600" },
    purple: { bg: "from-purple-500 to-purple-600", glow: "shadow-purple-500/30", text: "text-purple-600" },
    orange: { bg: "from-orange-500 to-orange-600", glow: "shadow-orange-500/30", text: "text-orange-600" },
  };

  const colors = colorConfig[color] || colorConfig.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setRotation({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-5 overflow-hidden
          border border-gray-100 dark:border-gray-700 cursor-default
          ${isHovered ? `shadow-xl ${colors.glow}` : 'shadow-lg shadow-gray-200/50 dark:shadow-none'}`}
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: rotation.x, rotateY: rotation.y }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Background gradient accent */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors.bg} opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`} />
        
        <div className="relative z-10 text-center" style={{ transform: "translateZ(20px)" }}>
          {icon && (
            <motion.div 
              className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${colors.bg} text-white mb-2`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {icon}
            </motion.div>
          )}
          <motion.p 
            className={`text-2xl md:text-3xl font-bold ${colors.text} dark:text-white`}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.1, type: "spring" }}
          >
            {value}
          </motion.p>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

StatsCard3D.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  color: PropTypes.oneOf(['blue', 'green', 'purple', 'orange']),
  delay: PropTypes.number,
};


// Quick Action Card Component
const QuickActionCard = ({ title, subtitle, icon, gradient, onClick, delay = 0 }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-5 md:p-6 text-left text-white 
        overflow-hidden shadow-xl group`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
      </div>
      
      <div className="relative z-10">
        <motion.div 
          className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4"
          whileHover={{ rotate: 10 }}
        >
          {icon}
        </motion.div>
        <h3 className="font-bold text-lg md:text-xl">{title}</h3>
        <p className="text-sm text-white/80 mt-1">{subtitle}</p>
      </div>
      
      {/* Arrow indicator */}
      <motion.div 
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ x: -10 }}
        whileHover={{ x: 0 }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </motion.div>
    </motion.button>
  );
};

QuickActionCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  gradient: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  delay: PropTypes.number,
};

// Quick Link Item Component
const QuickLinkItem = ({ title, subtitle, icon, iconBg, onClick, delay = 0 }) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 
        shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700
        active:bg-gray-50 dark:active:bg-gray-700 transition-all duration-200 group"
    >
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <motion.svg 
        className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </motion.svg>
    </motion.button>
  );
};

QuickLinkItem.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  iconBg: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  delay: PropTypes.number,
};


const Dashboard = () => {
  const { userDetails, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    attempted: 0,
    averageAccuracy: 0,
    weeklyRank: null,
  });
  const [activeSession, setActiveSession] = useState(null);
  const fetchingRef = useRef(false);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result?.success) {
      toast.success(messages.LOGOUT_SUCCESS);
      navigate("/", { replace: true });
    } else {
      toast.error(result?.error || messages.LOGOUT_FAILED);
    }
  }, [logout, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser || fetchingRef.current) return;

      const examTypeForRank = userDetails?.targetExam || null;
      const now = Date.now();
      
      if (
        statsCache.data &&
        statsCache.userId === currentUser.uid &&
        statsCache.examType === examTypeForRank &&
        now - statsCache.timestamp < CACHE_TTL
      ) {
        setStats(statsCache.data);
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
        const userTests = snapshot.docs.map((doc) => doc.data());

        const attempted = userTests.length;
        const averageAccuracy =
          attempted > 0
            ? userTests.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / attempted
            : 0;

        let weeklyRank = null;
        const targetExam = examTypeForRank || userTests[0]?.examType || null;

        if (targetExam) {
          const weeklyRange = {
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(), { weekStartsOn: 1 }),
          };

          try {
            // Try to get rank from leaderboard collection (pre-computed)
            const weekNumber = getISOWeek(weeklyRange.start);
            const yearNumber = getISOWeekYear(weeklyRange.start);
            const weekDocId = `${targetExam}_${yearNumber}_W${weekNumber}`;
            const weekDocRef = doc(db, "leaderboard", weekDocId);
            const weekDocSnap = await getDoc(weekDocRef);

            if (weekDocSnap.exists()) {
              const leaderboardData = weekDocSnap.data();
              const entries = leaderboardData.entries || [];
              const rankIndex = entries.findIndex((entry) => entry.userId === currentUser.uid);
              weeklyRank = rankIndex >= 0 ? rankIndex + 1 : null;
            } else {
              // Fallback: Calculate from user's own tests only
              const userWeeklyTests = userTests.filter((test) => {
                const endTime = test.endTime ? new Date(test.endTime) : null;
                return endTime && endTime >= weeklyRange.start && endTime <= weeklyRange.end && test.examType === targetExam;
              });
              
              // If user has tests this week, show a placeholder rank
              if (userWeeklyTests.length > 0) {
                weeklyRank = null; // Will show as "Unranked" until leaderboard is computed
              }
            }
          } catch (rankError) {
            logger.error("Error calculating rank:", rankError);
            // Silently fail - rank is optional
            weeklyRank = null;
          }
        }

        const newStats = { attempted, averageAccuracy, weeklyRank };
        statsCache.data = newStats;
        statsCache.timestamp = now;
        statsCache.userId = currentUser.uid;
        statsCache.examType = examTypeForRank;
        setStats(newStats);
      } catch (error) {
        logger.error("Error loading dashboard stats:", error);
      } finally {
        fetchingRef.current = false;
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

  const getRankTier = (rank) => {
    if (!rank) return { label: "Unranked", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-700" };
    if (rank === 1) return { label: "Champion", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/30" };
    if (rank <= 3) return { label: "Elite", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/30" };
    if (rank <= 10) return { label: "Master", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/30" };
    if (rank <= 50) return { label: "Expert", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/30" };
    return { label: "Rising", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30" };
  };

  const rankTier = getRankTier(stats.weeklyRank);


  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      <TopNav />

      {/* Header */}
      <header className="glass-card sticky top-0 z-40 md:hidden">
        <div className="px-4 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div 
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/profile")}
                >
                  {userDetails?.photoURL ? (
                    <img src={userDetails.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userDetails?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </motion.div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Welcome back,</p>
                <h1 className="font-semibold text-gray-900 dark:text-white">{userDetails?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-7xl mx-auto space-y-5">
        {/* Resume Session Card - Compact */}
        <AnimatePresence>
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <motion.div 
                  className="p-1.5 bg-white/20 rounded-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">Continue {activeSession.mode} • {activeSession.examType}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    localStorage.removeItem("activeTestSession");
                    setActiveSession(null);
                  }}
                  className="p-1.5 text-white/80 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (activeSession.mode === "mock") {
                      navigate("/test/mock", { state: { examType: activeSession.examType, resume: true } });
                    } else if (activeSession.mode === "practice") {
                      navigate("/test/practice", { state: { examType: activeSession.examType, resume: true } });
                    } else if (activeSession.mode === "custom" && activeSession.settings) {
                      navigate("/test/custom", { state: { settings: activeSession.settings, resume: true } });
                    }
                  }}
                  className="px-4 py-1.5 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  Resume
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <StatsCard3D
            value={stats.attempted}
            label="Tests"
            color="blue"
            delay={0.1}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatsCard3D
            value={`${stats.averageAccuracy.toFixed(0)}%`}
            label="Accuracy"
            color="green"
            delay={0.2}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard3D
            value={stats.weeklyRank ? `#${stats.weeklyRank}` : "-"}
            label="Rank"
            color="purple"
            delay={0.3}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <QuickActionCard
            title="Mock Test"
            subtitle="Full exam simulation"
            gradient="from-blue-500 via-blue-600 to-indigo-600"
            delay={0.2}
            onClick={() => navigate("/test-selection")}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
          <QuickActionCard
            title="Practice"
            subtitle="Topic-wise learning"
            gradient="from-emerald-500 via-emerald-600 to-teal-600"
            delay={0.3}
            onClick={() => navigate("/test-selection", { state: { mode: "practice" } })}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Quick Access</h2>
          
          <QuickLinkItem
            title="Leaderboard"
            subtitle="See weekly rankings"
            delay={0.4}
            onClick={() => navigate("/leaderboard")}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            icon={
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <QuickLinkItem
            title="Test History"
            subtitle="Review past attempts"
            delay={0.5}
            onClick={() => navigate("/test/history")}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            icon={
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <QuickLinkItem
            title="Bookmarks"
            subtitle="Your saved questions"
            delay={0.55}
            onClick={() => navigate("/bookmarks")}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            icon={
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            }
          />

          {userDetails?.isAdmin && (
            <QuickLinkItem
              title="Admin Panel"
              subtitle="Manage questions & users"
              delay={0.6}
              onClick={() => navigate("/admin/dashboard")}
              iconBg="bg-pink-100 dark:bg-pink-900/30"
              icon={
                <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          )}
        </div>

        {/* Target Exam Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Target Exam</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{userDetails?.targetExam}</p>
            </div>
            <motion.span 
              className={`px-4 py-1.5 rounded-full text-xs font-semibold ${rankTier.bg} ${rankTier.color}`}
              whileHover={{ scale: 1.05 }}
            >
              {rankTier.label}
            </motion.span>
          </div>
        </motion.div>

        {/* Admin & Logout for mobile */}
        <div className="md:hidden flex gap-3">
          {userDetails?.isAdmin && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => navigate("/admin/dashboard")}
              className="flex-1 py-3 text-purple-600 dark:text-purple-400 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors"
            >
              Admin Panel
            </motion.button>
          )}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={handleLogout}
            className={`${userDetails?.isAdmin ? 'flex-1' : 'w-full'} py-3 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors`}
          >
            Sign Out
          </motion.button>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
