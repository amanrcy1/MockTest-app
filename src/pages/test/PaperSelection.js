import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import toast, { messages } from '../../utils/toast';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { EXAM_PATTERNS } from '../../utils/examPatterns';
import { PageSpinner } from '../../components';
import logger from '../../utils/logger';

const BREAK_DURATION_MS = 60 * 60 * 1000; // 1 hour in ms

const PAPER_ICONS = {
  English: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  'General Knowledge': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  'Elementary Mathematics': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),
};

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'M5 13l4 4L19 7',
  },
  available: {
    label: 'Ready',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  },
  'on-break': {
    label: 'On Break',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  locked: {
    label: 'Locked',
    color: 'text-gray-400 dark:text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
};

// Format seconds into MM:SS
const formatBreakTime = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PaperSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const examType = location.state?.examType;
  const examPattern = EXAM_PATTERNS[examType];

  const [loading, setLoading] = useState(true);
  const [questionCounts, setQuestionCounts] = useState({});
  const [completedPapers, setCompletedPapers] = useState({});
  const [completedAt, setCompletedAt] = useState({});
  const [breakSkipped, setBreakSkipped] = useState({});
  const [paperScores, setPaperScores] = useState({});
  const [now, setNow] = useState(Date.now());
  const breakTimerRef = useRef(null);

  // Load completed papers from localStorage for this exam session
  const sessionKey = `mockPaperSession_${examType}_${currentUser?.uid}`;

  const loadSessionData = useCallback(() => {
    try {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      // Check if session is from today (papers should be done in one sitting)
      const sessionDate = new Date(data.createdAt).toDateString();
      const today = new Date().toDateString();
      if (sessionDate !== today) {
        localStorage.removeItem(sessionKey);
        return;
      }
      setCompletedPapers(data.completed || {});
      setCompletedAt(data.completedAt || {});
      setBreakSkipped(data.breakSkipped || {});
      setPaperScores(data.scores || {});
    } catch {
      localStorage.removeItem(sessionKey);
    }
  }, [sessionKey]);

  const saveSessionData = useCallback(
    (completed, scores, timestamps, skipped) => {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          completed,
          scores,
          completedAt: timestamps,
          breakSkipped: skipped,
          createdAt: new Date().toISOString(),
        })
      );
    },
    [sessionKey]
  );

  // Check if returning from a completed paper
  // Read existing session from localStorage directly to avoid stale closure state
  useEffect(() => {
    if (!location.state?.completedPaper) return;
    const { sectionId, score, correct, incorrect, skipped, accuracy } =
      location.state.completedPaper;
    const timestamp = new Date().toISOString();

    // Read persisted session so we merge with ALL previously completed papers
    let existing = { completed: {}, scores: {}, completedAt: {}, breakSkipped: {} };
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        existing = {
          completed: parsed.completed || {},
          scores: parsed.scores || {},
          completedAt: parsed.completedAt || {},
          breakSkipped: parsed.breakSkipped || {},
        };
      }
    } catch {
      /* ignore */
    }

    const updated = { ...existing.completed, [sectionId]: true };
    const newScores = {
      ...existing.scores,
      [sectionId]: { score, correct, incorrect, skipped, accuracy },
    };
    const newTimestamps = { ...existing.completedAt, [sectionId]: timestamp };
    const newSkipped = existing.breakSkipped;

    setCompletedPapers(updated);
    setPaperScores(newScores);
    setCompletedAt(newTimestamps);
    setBreakSkipped(newSkipped);
    saveSessionData(updated, newScores, newTimestamps, newSkipped);
  }, [location.state?.completedPaper, sessionKey, saveSessionData]);

  useEffect(() => {
    if (!examType || !examPattern?.multiPaper) {
      navigate('/test-selection');
      return;
    }
    loadSessionData();
    fetchQuestionCounts();
  }, [examType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick every second while any paper is on break (for live countdown)
  useEffect(() => {
    // Only compute break status when we have the data
    if (!examPattern?.sections) return;

    const hasActiveBreak = examPattern.sections.some((section, index) => {
      if (index === 0) return false;
      const prevSection = examPattern.sections[index - 1];
      if (!completedPapers[prevSection.id] || completedPapers[section.id]) return false;
      if (breakSkipped[section.id]) return false;
      const prevCompletedAt = completedAt[prevSection.id];
      if (!prevCompletedAt) return false;
      const elapsed = Date.now() - new Date(prevCompletedAt).getTime();
      return elapsed < BREAK_DURATION_MS;
    });

    if (hasActiveBreak) {
      // Find the shortest remaining break to schedule a precise re-render when it expires
      let shortestBreakMs = BREAK_DURATION_MS;
      examPattern.sections.forEach((section, index) => {
        if (index === 0) return;
        const prevSection = examPattern.sections[index - 1];
        if (!completedPapers[prevSection.id] || completedPapers[section.id]) return;
        if (breakSkipped[section.id]) return;
        const prevCompletedTime = completedAt[prevSection.id];
        if (!prevCompletedTime) return;
        const remaining = BREAK_DURATION_MS - (Date.now() - new Date(prevCompletedTime).getTime());
        if (remaining > 0 && remaining < shortestBreakMs) shortestBreakMs = remaining;
      });

      breakTimerRef.current = setInterval(() => setNow(Date.now()), 1000);

      // Schedule a guaranteed tick right when the break expires so status flips to "available"
      const expiryTimeout = setTimeout(() => setNow(Date.now()), shortestBreakMs + 100);

      return () => {
        clearInterval(breakTimerRef.current);
        clearTimeout(expiryTimeout);
      };
    }
  }, [completedPapers, completedAt, breakSkipped, examPattern]);

  const fetchQuestionCounts = async () => {
    try {
      setLoading(true);
      const counts = {};
      for (const section of examPattern.sections) {
        const q = query(
          collection(db, 'questions'),
          where('examType', '==', examType),
          where('subject', '==', section.name)
        );
        const snapshot = await getDocs(q);
        counts[section.id] = snapshot.size;
      }
      setQuestionCounts(counts);
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching paper question counts:', error);
      toast.error(messages.QUESTIONS_LOAD_FAILED);
      setLoading(false);
    }
  };

  const getPaperStatus = (section, index) => {
    if (completedPapers[section.id]) return 'completed';
    const count = questionCounts[section.id] || 0;
    if (count < section.totalQuestions) return 'locked';

    // Check if previous paper was completed recently (on-break)
    if (index > 0) {
      const prevSection = examPattern.sections[index - 1];
      if (!completedPapers[prevSection.id]) return 'locked'; // previous not done yet
      // If break was skipped for this paper, it's available
      if (!breakSkipped[section.id]) {
        const prevCompletedTime = completedAt[prevSection.id];
        if (prevCompletedTime) {
          const elapsed = now - new Date(prevCompletedTime).getTime();
          if (elapsed < BREAK_DURATION_MS) return 'on-break';
        }
      }
    }
    return 'available';
  };

  const getBreakRemaining = (index) => {
    if (index === 0) return 0;
    const prevSection = examPattern.sections[index - 1];
    const prevCompletedTime = completedAt[prevSection.id];
    if (!prevCompletedTime) return 0;
    const elapsed = now - new Date(prevCompletedTime).getTime();
    return Math.max(0, BREAK_DURATION_MS - elapsed);
  };

  const handleSkipBreak = (section) => {
    const updated = { ...breakSkipped, [section.id]: true };
    setBreakSkipped(updated);
    saveSessionData(completedPapers, paperScores, completedAt, updated);
    toast.success(`Break skipped. You can start ${section.name} now.`);
  };

  const handleStartPaper = (section, index) => {
    const status = getPaperStatus(section, index);
    if (status === 'locked') {
      toast.error(
        `Not enough questions for ${section.name}. Need ${section.totalQuestions}, have ${questionCounts[section.id] || 0}.`
      );
      return;
    }
    if (status === 'completed') {
      toast.info(`You've already completed ${section.name} in this session.`);
      return;
    }
    if (status === 'on-break') {
      toast.info("You're on a break. Skip the break or wait for it to end.");
      return;
    }
    navigate('/test/mock', {
      state: {
        examType,
        singlePaper: true,
        sectionId: section.id,
        sectionName: section.name,
      },
    });
  };

  const handleViewResults = () => {
    navigate('/test/history', { state: { examType } });
  };

  const handleResetSession = () => {
    localStorage.removeItem(sessionKey);
    setCompletedPapers({});
    setCompletedAt({});
    setBreakSkipped({});
    setPaperScores({});
    toast.success('Session reset. You can attempt all papers again.');
  };

  const allCompleted = examPattern?.sections.every((s) => completedPapers[s.id]);
  const completedCount = examPattern?.sections.filter((s) => completedPapers[s.id]).length || 0;
  const totalMarksScored = Object.values(paperScores).reduce((sum, s) => sum + (s.score || 0), 0);
  const totalMaxMarks = examPattern?.sections.reduce((sum, s) => sum + s.totalMarks, 0) || 0;

  if (loading) return <PageSpinner message="Loading papers..." />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {examPattern.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mock Test - Select a paper to begin
              </p>
            </div>
            <button
              onClick={() => navigate('/test-selection')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Back to test selection"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Exam Day Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-200">Real CDS Exam Format</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                The CDS written exam has 3 separate papers conducted in 3 shifts on the same day.
                Each paper has its own timer. A 1-hour break is given between papers, but you can
                skip it and start early.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Summary (if any papers completed) */}
        {completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Session Progress
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{examPattern.sections.length} papers done
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / examPattern.sections.length) * 100}%` }}
              />
            </div>
            {allCompleted && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  All papers completed! Total: {totalMarksScored.toFixed(1)}/{totalMaxMarks} marks
                </p>
                <button
                  onClick={handleResetSession}
                  className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                >
                  Reset Session
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Paper Cards */}
        <div className="space-y-4">
          {examPattern.sections.map((section, index) => {
            const status = getPaperStatus(section, index);
            const config = STATUS_CONFIG[status];
            const count = questionCounts[section.id] || 0;
            const score = paperScores[section.id];
            const icon = PAPER_ICONS[section.name];
            const breakRemaining = status === 'on-break' ? getBreakRemaining(index) : 0;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  role={status === 'available' ? 'button' : undefined}
                  tabIndex={status === 'available' ? 0 : undefined}
                  onClick={() => {
                    if (status === 'available') handleStartPaper(section, index);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && status === 'available') {
                      e.preventDefault();
                      handleStartPaper(section, index);
                    }
                  }}
                  className={`w-full text-left rounded-xl border-2 p-5 transition-all duration-200 ${config.border} ${config.bg}
                    ${status === 'available' ? 'hover:shadow-lg hover:scale-[1.01] cursor-pointer' : 'cursor-default opacity-80'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`p-3 rounded-xl ${status === 'available' ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : status === 'completed' ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-bold text-lg ${status === 'locked' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
                        >
                          {section.shortName || `Paper ${index + 1}`}: {section.name}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}
                        >
                          {config.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {section.shift}
                      </p>

                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>{section.totalQuestions}</strong> Questions
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>{section.totalMarks}</strong> Marks
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>{section.duration}</strong> Minutes
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>{Math.abs(section.negativeMarking).toFixed(2)}</strong> Negative
                        </span>
                      </div>

                      {/* Question availability */}
                      {status === 'locked' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Need {section.totalQuestions} questions, only {count} available
                        </p>
                      )}

                      {/* Score display for completed papers */}
                      {status === 'completed' && score && (
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            Score: {score.score.toFixed(1)}/{section.totalMarks}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {score.correct} correct, {score.incorrect} wrong, {score.skipped}{' '}
                            skipped
                          </span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {parseFloat(score.accuracy).toFixed(1)}% accuracy
                          </span>
                        </div>
                      )}

                      {/* Break timer for on-break papers */}
                      {status === 'on-break' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-amber-500 animate-pulse"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                              Break: {formatBreakTime(breakRemaining)} remaining
                            </span>
                          </div>
                          <div className="w-full bg-amber-100 dark:bg-amber-900/30 rounded-full h-1.5">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.max(0, 1 - breakRemaining / BREAK_DURATION_MS) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow / Check / Break actions */}
                    <div className="flex-shrink-0 mt-2 flex flex-col items-center gap-2">
                      {status === 'available' && (
                        <svg
                          className="w-6 h-6 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                      {status === 'completed' && (
                        <svg
                          className="w-6 h-6 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={config.icon}
                          />
                        </svg>
                      )}
                      {status === 'on-break' && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkipBreak(section);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              handleSkipBreak(section);
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Start Now
                        </div>
                      )}
                      {status === 'locked' && (
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={config.icon}
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {allCompleted && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleViewResults}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-center shadow-lg shadow-blue-500/25"
            >
              View Test History
            </motion.button>
          )}
          {completedCount > 0 && !allCompleted && (
            <button
              onClick={handleResetSession}
              className="py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-center border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Reset & Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperSelection;
