import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import { toast } from "react-toastify";
import { ThemeToggle } from "../../components";
import { BottomNav } from "../../components";
import logger from "../../utils/logger";

// Mode Card Component with 3D effect
const ModeCard = ({ mode, config, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const colorConfig = {
    mock: { gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    practice: { gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    custom: { gradient: "from-purple-500 to-pink-600", ring: "ring-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  };
  
  const colors = colorConfig[mode];

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden
        ${isSelected 
          ? `${colors.bg} border-transparent ring-2 ${colors.ring}` 
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
        }`}
    >
      {/* Background gradient on hover/select */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0`}
        animate={{ opacity: isSelected ? 0.05 : isHovered ? 0.03 : 0 }}
      />
      
      <div className="relative z-10">
        <motion.div 
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}
          animate={{ rotate: isSelected ? [0, -5, 5, 0] : 0 }}
          transition={{ duration: 0.5 }}
        >
          {config.icon}
        </motion.div>
        
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{config.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{config.desc}</p>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
};


// Exam Card Component
const ExamCard = ({ examKey, exam, questionCount, isSelected, onSelect, testMode }) => {
  const requiredQuestions = exam.sections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const hasEnough = questionCount >= requiredQuestions;
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(examKey)}
      className={`relative cursor-pointer rounded-2xl p-5 transition-all duration-300 overflow-hidden
        ${isSelected 
          ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ring-2 ring-blue-500" 
          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{exam.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {exam.sections.length} Section{exam.sections.length > 1 ? "s" : ""}
          </p>
        </div>
        <motion.div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
            ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600"}`}
          animate={{ scale: isSelected ? [1, 1.2, 1] : 1 }}
        >
          {isSelected && (
            <motion.svg 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </motion.div>
      </div>

      {/* Sections Info */}
      <div className="space-y-2 mb-4">
        {exam.sections.map((section, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{section.name}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {section.totalQuestions}Q • {section.duration}min
            </span>
          </div>
        ))}
      </div>

      {/* Question Availability */}
      <div className={`rounded-xl p-3 ${hasEnough 
        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
        : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
      }`}>
        <div className="flex justify-between items-center text-sm">
          <span className={hasEnough ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}>
            Available
          </span>
          <span className={`font-bold ${hasEnough ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
            {questionCount} questions
          </span>
        </div>
        {testMode === "mock" && (
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-500 dark:text-gray-400">Required</span>
            <span className="font-medium text-gray-600 dark:text-gray-300">{requiredQuestions}</span>
          </div>
        )}
      </div>

      {questionCount === 0 && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          No questions available
        </p>
      )}
    </motion.div>
  );
};


const TestSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const [selectedExam, setSelectedExam] = useState(userDetails?.targetExam || "CDS");
  const [testMode, setTestMode] = useState("mock");
  const [availableQuestions, setAvailableQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [initialStateApplied, setInitialStateApplied] = useState(false);

  const selectedExamPattern = EXAM_PATTERNS[selectedExam] || EXAM_PATTERNS.CDS;
  const selectedQuestionCount = availableQuestions[selectedExam] || 0;
  const requiredQuestions = selectedExamPattern.sections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const canStartMock = selectedQuestionCount >= requiredQuestions;
  const canStartPractice = selectedQuestionCount > 0;
  const canStartCustom = selectedQuestionCount > 0;
  const canStart = !loading && (
    (testMode === "mock" && canStartMock) ||
    (testMode === "practice" && canStartPractice) ||
    (testMode === "custom" && canStartCustom)
  );

  const modeConfig = {
    mock: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      title: "Mock Test",
      desc: "Full exam simulation with timer",
    },
    practice: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
      title: "Practice",
      desc: "Learn with instant feedback",
    },
    custom: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
      title: "Custom",
      desc: "Your own settings",
    },
  };

  useEffect(() => {
    if (initialStateApplied) return;
    if (location.state) {
      if (location.state.examType) setSelectedExam(location.state.examType);
      if (location.state.mode) setTestMode(location.state.mode);
    }
    setInitialStateApplied(true);
  }, [initialStateApplied, location.state]);

  useEffect(() => {
    fetchQuestionCounts();
  }, []);

  const fetchQuestionCounts = async () => {
    try {
      setLoadError("");
      const cached = sessionStorage.getItem("questionCounts");
      const cachedAt = sessionStorage.getItem("questionCountsAt");
      const now = Date.now();

      if (cached && cachedAt && now - Number(cachedAt) < 5 * 60 * 1000) {
        setAvailableQuestions(JSON.parse(cached));
        setLoading(false);
        return;
      }

      setLoading(true);
      const counts = {};
      for (const examType of Object.keys(EXAM_PATTERNS)) {
        const q = query(collection(db, "questions"), where("examType", "==", examType));
        const snapshot = await getDocs(q);
        counts[examType] = snapshot.size;
      }

      setAvailableQuestions(counts);
      sessionStorage.setItem("questionCounts", JSON.stringify(counts));
      sessionStorage.setItem("questionCountsAt", String(now));
      setLoading(false);
    } catch (error) {
      logger.error("Error fetching question counts:", error);
      toast.error("Failed to load question data");
      setLoadError("Failed to load question data. Please try again.");
      setLoading(false);
    }
  };

  const handleStartTest = (mode, exam) => {
    const questionCount = availableQuestions[exam] || 0;
    if (questionCount === 0) {
      toast.error("No questions available for this exam type");
      return;
    }

    if (mode === "mock") navigate("/test/mock", { state: { examType: exam } });
    else if (mode === "practice") navigate("/test/practice", { state: { examType: exam } });
    else if (mode === "custom") navigate("/test/custom-setup", { state: { examType: exam } });
  };


  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      {/* Header */}
      <header className="glass-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold gradient-text">Start Test</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Choose your test type and exam</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHelp(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it Works
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHelp(true)}
                className="md:hidden p-2 bg-gray-100 dark:bg-gray-700 rounded-xl"
                aria-label="Help"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/dashboard")}
                className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-xl"
                aria-label="Back"
              >
                <svg className="w-5 h-5 md:hidden text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden md:inline text-gray-700 dark:text-gray-200 text-sm font-medium">Back</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Test Mode Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-5 md:p-6 border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Test Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(modeConfig).map(([mode, config]) => (
              <ModeCard
                key={mode}
                mode={mode}
                config={config}
                isSelected={testMode === mode}
                onClick={() => setTestMode(mode)}
              />
            ))}
          </div>
        </motion.section>

        {/* Exam Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-5 md:p-6 border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Exam</h2>

          {loadError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4"
            >
              <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchQuestionCounts}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Retry
              </motion.button>
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5 animate-pulse">
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6" />
                  </div>
                  <div className="mt-4 h-16 bg-gray-200 dark:bg-gray-600 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(EXAM_PATTERNS).map(([key, exam]) => (
                <ExamCard
                  key={key}
                  examKey={key}
                  exam={exam}
                  questionCount={availableQuestions[key] || 0}
                  isSelected={selectedExam === key}
                  onSelect={setSelectedExam}
                  testMode={testMode}
                />
              ))}
            </div>
          )}

          {/* Start Test Button */}
          <div className="mt-8 flex flex-col items-center">
            <motion.button
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
              onClick={() => handleStartTest(testMode, selectedExam)}
              disabled={!canStart || Boolean(loadError)}
              className={`w-full md:w-auto px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300
                ${canStart 
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }`}
            >
              {testMode === "mock" && "Start Mock Test"}
              {testMode === "practice" && "Start Practice"}
              {testMode === "custom" && "Configure Custom Test"}
            </motion.button>
            
            {!loading && testMode === "mock" && !canStartMock && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-center text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Not enough questions. Try Practice or Custom mode.
              </motion.p>
            )}
          </div>
        </motion.section>
      </main>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">How Test Selection Works</h2>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>Choose a test mode first. Mock uses full exam timing and negative marking. Practice gives instant feedback. Custom lets you pick subjects and settings.</p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">{selectedExamPattern.name} Pattern</p>
                  {selectedExamPattern.sections.map((section) => (
                    <div key={section.name} className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>{section.name}</span>
                      <span>{section.totalQuestions}Q - {section.duration}min</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    Negative marking: {selectedExamPattern.sections[0].negativeMarking ?? 0}
                  </p>
                </div>
                <p>You need enough questions for mock tests. Practice and custom can run with fewer questions.</p>
              </div>
              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHelp(false)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Got it
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default TestSelection;
