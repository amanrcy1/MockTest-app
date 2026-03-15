import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  calculateScore,
  formatTime,
  getQuestionStatus,
  getStatusColor,
  shuffleArray,
} from '../../utils/testUtils';
import {
  useAntiCheat,
  randomizeTest,
  useTestSession,
  useBookmarks,
  useErrorReport,
} from '../../hooks';
import { ViolationModal, PageSpinner, ResumePrompt, ReportModal } from '../../components';
import logger from '../../utils/logger';
import toast, { messages } from '../../utils/toast';
import { EXAM_PATTERNS } from '../../utils/examPatterns';

const CustomTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { settings } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Shared hooks
  const { saveSession, loadSavedSession, clearSession } = useTestSession(
    'customTestSession',
    'activeTestSession',
    { mode: 'custom', examType: settings?.examType, userId: currentUser?.uid, settings }
  );
  const { bookmarkMap, loadBookmarks, toggleBookmark } = useBookmarks(
    currentUser?.uid,
    settings?.examType
  );
  const {
    showReportModal,
    reportText,
    setReportText,
    reportSubmitting,
    openReport,
    closeReport,
    submitReport,
  } = useErrorReport(currentUser?.uid, settings?.examType);

  // Anti-cheat measures
  const isTestInProgress = !loading && !showResumePrompt && questions.length > 0;

  // Ref to store submit function for violation auto-submit
  const submitTestRef = React.useRef(null);

  // Auto-submit handler for violations
  const handleViolationAutoSubmit = React.useCallback(async () => {
    toast.error(messages.VIOLATION_AUTO_SUBMIT, { autoClose: 5000 });
    if (submitTestRef.current) {
      submitTestRef.current();
    }
  }, []);

  const {
    enterFullscreen,
    exitFullscreen,
    showViolationModal,
    resumeTest,
    violationCount,
    remainingWarnings,
  } = useAntiCheat(isTestInProgress, {
    onAutoSubmit: handleViolationAutoSubmit,
    maxFullscreenExits: 2,
  });

  const sectionMeta = React.useMemo(() => {
    const pattern = settings?.examType ? EXAM_PATTERNS[settings.examType] : null;
    if (!pattern || !questions.length) {
      return [];
    }
    return pattern.sections.map((section) => {
      const indices = questions
        .map((q, idx) => (q.subject === section.name ? idx : -1))
        .filter((idx) => idx >= 0);
      return {
        name: section.name,
        startIndex: indices[0] ?? null,
        count: indices.length,
      };
    });
  }, [questions, settings?.examType]);

  const currentSectionLabel = React.useMemo(() => {
    if (!sectionMeta.length) {
      return null;
    }
    const match = sectionMeta.find((section) => {
      if (section.startIndex === null) {
        return false;
      }
      const nextSection = sectionMeta.find(
        (other) => other.startIndex !== null && other.startIndex > section.startIndex
      );
      const endIndex = nextSection ? nextSection.startIndex - 1 : questions.length - 1;
      return currentQuestionIndex >= section.startIndex && currentQuestionIndex <= endIndex;
    });
    return match?.name || null;
  }, [currentQuestionIndex, questions.length, sectionMeta]);

  const timerRef = useRef(null);
  const questionStartRef = useRef(null);
  const lastQuestionIndexRef = useRef(null);
  const questionCardRef = useRef(null);
  const [palettePage, setPalettePage] = useState(0);
  const PALETTE_PAGE_SIZE = 30;

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      let q = query(collection(db, 'questions'), where('examType', '==', settings.examType));

      const snapshot = await getDocs(q);
      let allQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply filters
      if (settings.subjects.length > 0) {
        allQuestions = allQuestions.filter((q) => settings.subjects.includes(q.subject));
      }
      if (settings.topics.length > 0) {
        allQuestions = allQuestions.filter((q) => settings.topics.includes(q.topic));
      }
      if (settings.difficulty !== 'all') {
        allQuestions = allQuestions.filter((q) => q.difficulty === settings.difficulty);
      }

      // Shuffle if enabled
      if (settings.shuffleQuestions) {
        allQuestions = shuffleArray(allQuestions);
      }

      // Take required number
      const selectedQuestions = allQuestions.slice(0, settings.numberOfQuestions);

      // Randomize options for each question (anti-cheat measure)
      const randomizedQuestions = randomizeTest(selectedQuestions, currentUser?.uid);
      setQuestions(randomizedQuestions);

      // Initialize responses
      const initialResponses = randomizedQuestions.map((q, index) => ({
        questionId: q.id,
        selectedAnswer: null,
        markedForReview: false,
        timeTaken: 0,
        visited: index === 0,
        locked: false, // Once answered and navigated away, answer is locked
        marksPerQuestion: 1,
        negativeMarking: settings.negativeMarking ? -0.33 : 0,
      }));
      setResponses(initialResponses);

      // Set timer
      if (settings.hasTimer) {
        setTimeRemaining(settings.timeLimit * 60);
      }

      setLoading(false);
      // Enter fullscreen when test starts
      enterFullscreen();
    } catch (error) {
      logger.error('Error fetching questions:', error);
      toast.error(messages.TEST_LOAD_FAILED);
      navigate('/test-selection');
    }
  }, [navigate, settings, currentUser?.uid, enterFullscreen]);

  const restoreSession = useCallback((session) => {
    setQuestions(session.questions || []);
    setResponses(session.responses || []);
    setCurrentQuestionIndex(session.currentQuestionIndex || 0);
    setTimeRemaining(session.timeRemaining || 0);
    setShowInstantFeedback(Boolean(session.showInstantFeedback));
    setLoading(false);
  }, []);

  const recordTimeSpent = useCallback(() => {
    if (questionStartRef.current === null || lastQuestionIndexRef.current === null) {
      return;
    }
    const delta = Math.floor((Date.now() - questionStartRef.current) / 1000);
    if (delta <= 0) {
      questionStartRef.current = Date.now();
      return;
    }

    const indexToUpdate = lastQuestionIndexRef.current;
    setResponses((prev) => {
      const updated = [...prev];
      if (updated[indexToUpdate]) {
        updated[indexToUpdate] = {
          ...updated[indexToUpdate],
          timeTaken: (updated[indexToUpdate].timeTaken || 0) + delta,
        };
      }
      return updated;
    });
    questionStartRef.current = Date.now();
  }, []);

  const handleAnswerSelect = (answer) => {
    // Don't allow changing answer if already locked
    if (responses[currentQuestionIndex]?.locked) return;

    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = {
      ...newResponses[currentQuestionIndex],
      selectedAnswer: answer,
      visited: true,
    };
    setResponses(newResponses);

    if (settings.showInstantFeedback) {
      setShowInstantFeedback(true);
    }
  };

  const handleNext = () => {
    if (settings.showInstantFeedback) {
      setShowInstantFeedback(false);
    }

    // Lock the current answer if one was selected (skip if marked for review)
    if (
      responses[currentQuestionIndex]?.selectedAnswer &&
      !responses[currentQuestionIndex]?.markedForReview
    ) {
      const lockResponses = [...responses];
      lockResponses[currentQuestionIndex] = {
        ...lockResponses[currentQuestionIndex],
        locked: true,
      };
      setResponses(lockResponses);
    }

    if (currentQuestionIndex < questions.length - 1) {
      recordTimeSpent();
      const newIndex = currentQuestionIndex + 1;
      setResponses((prev) => {
        const newResponses = [...prev];
        newResponses[newIndex].visited = true;
        return newResponses;
      });
      setCurrentQuestionIndex(newIndex);
    }
  };

  const handlePrevious = () => {
    if (settings.showInstantFeedback) {
      setShowInstantFeedback(false);
    }

    // Lock the current answer if one was selected (skip if marked for review)
    if (
      responses[currentQuestionIndex]?.selectedAnswer &&
      !responses[currentQuestionIndex]?.markedForReview
    ) {
      const lockResponses = [...responses];
      lockResponses[currentQuestionIndex] = {
        ...lockResponses[currentQuestionIndex],
        locked: true,
      };
      setResponses(lockResponses);
    }

    if (currentQuestionIndex > 0) {
      recordTimeSpent();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleMarkForReview = () => {
    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = {
      ...newResponses[currentQuestionIndex],
      markedForReview: !newResponses[currentQuestionIndex].markedForReview,
      visited: true,
    };
    setResponses(newResponses);
  };

  const handleClearResponse = () => {
    if (responses[currentQuestionIndex]?.locked) return;

    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = {
      ...newResponses[currentQuestionIndex],
      selectedAnswer: null,
    };
    setResponses(newResponses);
    if (settings.showInstantFeedback) {
      setShowInstantFeedback(false);
    }
  };

  const handleSkip = () => {
    // Mark as visited but NOT locked - user can answer later
    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = {
      ...newResponses[currentQuestionIndex],
      selectedAnswer: null,
      visited: true,
      // Don't lock skipped questions - user can answer them later
    };
    setResponses(newResponses);
    if (settings.showInstantFeedback) {
      setShowInstantFeedback(false);
    }
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      recordTimeSpent();
      const newIndex = currentQuestionIndex + 1;
      setResponses((prev) => {
        const updated = [...prev];
        updated[newIndex].visited = true;
        return updated;
      });
      setCurrentQuestionIndex(newIndex);
    }
  };

  const goToQuestion = (index) => {
    if (settings.showInstantFeedback) {
      setShowInstantFeedback(false);
    }

    // Lock current question if answered and not marked (palette click = same as Next)
    const cur = responses[currentQuestionIndex];
    if (cur?.selectedAnswer && !cur?.locked && !cur?.markedForReview) {
      const lockResponses = [...responses];
      lockResponses[currentQuestionIndex] = { ...cur, locked: true };
      setResponses(lockResponses);
    }

    recordTimeSpent();
    setResponses((prev) => {
      const newResponses = [...prev];
      newResponses[index] = { ...newResponses[index], visited: true };
      return newResponses;
    });
    setCurrentQuestionIndex(index);
  };

  const handleGoToSection = (section) => {
    if (section.startIndex === null) {
      return;
    }
    recordTimeSpent();
    setCurrentQuestionIndex(section.startIndex);
  };

  const submitTest = useCallback(async () => {
    try {
      recordTimeSpent();
      clearInterval(timerRef.current);

      const scoreData = calculateScore(responses, questions);
      const testData = {
        userId: currentUser.uid,
        examType: settings.examType,
        testMode: 'custom',
        settings: settings,
        questions: questions.map((q) => q.id),
        responses: responses,
        startTime: new Date(
          Date.now() - (settings.timeLimit * 60 - timeRemaining) * 1000
        ).toISOString(),
        endTime: new Date().toISOString(),
        timeRemaining: timeRemaining,
        timeTaken: settings.hasTimer ? settings.timeLimit * 60 - timeRemaining : null,
        score: scoreData.totalMarks,
        accuracy: scoreData.accuracy,
        correct: scoreData.correct,
        incorrect: scoreData.incorrect,
        skipped: scoreData.skipped,
        completed: true,
      };

      const docRef = await addDoc(collection(db, 'tests'), testData);
      clearSession();

      // Exit fullscreen before navigating to results
      exitFullscreen();

      navigate('/test/result', {
        state: {
          testId: docRef.id,
          questions: questions,
          responses: responses,
          examType: settings.examType,
          testMode: 'custom',
        },
      });
    } catch (error) {
      logger.error('Error submitting test:', error);
      toast.error(messages.TEST_SUBMIT_FAILED);
    }
  }, [
    clearSession,
    currentUser,
    exitFullscreen,
    navigate,
    questions,
    recordTimeSpent,
    responses,
    settings,
    timeRemaining,
  ]);

  const handleAutoSubmit = useCallback(() => {
    toast.info(messages.TIME_UP);
    submitTest();
  }, [submitTest]);

  // Keep submitTestRef updated
  React.useEffect(() => {
    submitTestRef.current = submitTest;
  }, [submitTest]);

  useEffect(() => {
    if (!settings) {
      toast.error(messages.NO_TEST_CONFIG);
      navigate('/test-selection');
      return;
    }
    const saved = loadSavedSession(
      (s) => s.settings?.examType === settings.examType && s.questions?.length
    );
    if (saved) {
      if (location.state?.resume) {
        restoreSession(saved);
      } else {
        setResumeData(saved);
        setShowResumePrompt(true);
        setLoading(false);
      }
      return;
    }

    fetchQuestions();
  }, [fetchQuestions, restoreSession, loadSavedSession, location.state, navigate, settings]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    saveSession({
      settings,
      questions,
      responses,
      currentQuestionIndex,
      timeRemaining,
      showInstantFeedback,
    });
  }, [
    saveSession,
    loading,
    settings,
    questions,
    responses,
    currentQuestionIndex,
    timeRemaining,
    showInstantFeedback,
  ]);

  useEffect(() => {
    if (loading || questions.length === 0) {
      return;
    }
    if (lastQuestionIndexRef.current === null) {
      lastQuestionIndexRef.current = currentQuestionIndex;
      questionStartRef.current = Date.now();
      return;
    }
    if (lastQuestionIndexRef.current !== currentQuestionIndex) {
      lastQuestionIndexRef.current = currentQuestionIndex;
      questionStartRef.current = Date.now();
    }
  }, [currentQuestionIndex, loading, questions.length]);

  useEffect(() => {
    if (settings?.hasTimer && timeRemaining > 0 && !loading) {
      timerRef.current = setInterval(() => {
        let shouldAutoSubmit = false;

        setTimeRemaining((prev) => {
          if (prev <= 1) {
            shouldAutoSubmit = true;
            return 0;
          }
          return prev - 1;
        });

        // Call autosubmit outside of setState to avoid React warning
        if (shouldAutoSubmit) {
          setTimeout(() => handleAutoSubmit(), 0);
        }
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [handleAutoSubmit, loading, settings]);

  if (loading) {
    return <PageSpinner message="Loading custom test..." />;
  }

  if (showResumePrompt && resumeData) {
    return (
      <ResumePrompt
        title="Resume your custom test?"
        description={`You have an unfinished ${settings?.examType} custom test. Continue or start fresh.`}
        onResume={async () => {
          await enterFullscreen();
          restoreSession(resumeData);
          setShowResumePrompt(false);
        }}
        onStartFresh={async () => {
          await enterFullscreen();
          clearSession();
          setShowResumePrompt(false);
          fetchQuestions();
        }}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestionIndex];
  const isCorrect = currentResponse.selectedAnswer === currentQuestion.correctAnswer;
  const isBookmarked = Boolean(bookmarkMap[currentQuestion.id]);

  const statusCounts = {
    answered: responses.filter((r) => r.selectedAnswer && !r.markedForReview).length,
    notAnswered: responses.filter((r) => r.visited && !r.selectedAnswer && !r.markedForReview)
      .length,
    marked: responses.filter((r) => r.markedForReview && !r.selectedAnswer).length,
    answeredMarked: responses.filter((r) => r.selectedAnswer && r.markedForReview).length,
    notVisited: responses.filter((r) => !r.visited).length,
  };

  const progressPercent =
    responses.length > 0
      ? Math.round((responses.filter((r) => r.selectedAnswer).length / responses.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Violation Modal */}
      <ViolationModal
        isOpen={showViolationModal}
        onResume={resumeTest}
        remainingWarnings={remainingWarnings}
        violationCount={violationCount}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Custom Test</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{settings.examType}</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowExitModal(true)}
                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2 transition-colors"
                title="Exit test"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              {settings.hasTimer && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</p>
                  <p
                    className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`}
                  >
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowSubmitModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Submit Test
              </button>
            </div>
          </div>
          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Custom Test</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {settings.examType} · Q{currentQuestionIndex + 1}/{questions.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExitModal(true)}
                  className="p-2 text-gray-500 dark:text-gray-400"
                  aria-label="Exit test"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setShowMobilePalette(true);
                    setPalettePage(Math.floor(currentQuestionIndex / PALETTE_PAGE_SIZE));
                  }}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  {statusCounts.answered}/{questions.length}
                </button>
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </div>
            {settings.hasTimer && (
              <div className="flex justify-center items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p
                  className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}
                >
                  {formatTime(timeRemaining)}
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2" ref={questionCardRef}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 no-select">
              {sectionMeta.length > 1 && (
                <div className="mb-4 md:mb-6">
                  <div className="flex flex-wrap gap-2">
                    {sectionMeta.map((section) => (
                      <button
                        key={section.name}
                        onClick={() => handleGoToSection(section)}
                        disabled={section.startIndex === null}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          currentSectionLabel === section.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        } ${section.startIndex === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {section.name} ({section.count})
                      </button>
                    ))}
                  </div>
                  {currentSectionLabel && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Current section: {currentSectionLabel}
                    </p>
                  )}
                </div>
              )}
              {/* Question Header — Desktop */}
              <div className="hidden md:flex justify-between items-start mb-6">
                <div>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {currentQuestion.subject} | {currentQuestion.topic}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      isBookmarked
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  <button
                    onClick={openReport}
                    className="px-3 py-1 rounded text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    Report Error
                  </button>
                </div>
              </div>
              {/* Question Header — Mobile: single-line pill */}
              <div className="md:hidden mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      Q{currentQuestionIndex + 1}/{questions.length}
                    </span>
                    <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full truncate max-w-[55vw]">
                      {currentQuestion.subject}
                      {currentQuestion.topic ? ` · ${currentQuestion.topic}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleBookmark(currentQuestion.id)}
                      className={`p-1.5 rounded ${
                        isBookmarked
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={isBookmarked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={openReport}
                      className="p-1.5 rounded text-gray-400 dark:text-gray-500"
                      aria-label="Report error"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* Locked indicator */}
              {currentResponse.locked && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Answer locked - You cannot change your response
                  </span>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 mb-8">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const isSelected = currentResponse.selectedAnswer === option;
                  const isCorrectOption = option === currentQuestion.correctAnswer;
                  const showFeedback =
                    settings.showInstantFeedback && showInstantFeedback && isSelected;
                  const isLocked = currentResponse.locked;

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={isLocked}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        showFeedback && isCorrectOption
                          ? 'border-green-500 bg-green-50'
                          : showFeedback && !isCorrectOption
                            ? 'border-red-500 bg-red-50'
                            : isSelected
                              ? isLocked
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 cursor-not-allowed'
                                : 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                              : isLocked
                                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 cursor-not-allowed opacity-60'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {option}.
                          </span>{' '}
                          <span className="text-gray-800 dark:text-gray-200">
                            {currentQuestion.options[option]}
                          </span>
                        </div>
                        {showFeedback && isSelected && (
                          <span
                            className={`font-semibold ml-2 ${isCorrectOption ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {isCorrectOption ? 'Correct' : 'Wrong'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Instant Feedback */}
              {settings.showInstantFeedback &&
                showInstantFeedback &&
                currentResponse.selectedAnswer && (
                  <div
                    className={`mb-6 p-4 rounded-lg border-l-4 ${
                      isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <p
                      className={`font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}
                    >
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </p>
                    <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect
                        ? 'Well done!'
                        : `The correct answer is ${currentQuestion.correctAnswer}`}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm font-semibold text-gray-800 mb-1">Explanation:</p>
                      <p className="text-sm text-gray-700">{currentQuestion.solution}</p>
                    </div>
                  </div>
                )}

              {/* Action Buttons — Desktop */}
              <div className="hidden md:flex flex-wrap gap-3">
                <button
                  onClick={handleMarkForReview}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    currentResponse.markedForReview
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                  }`}
                >
                  {currentResponse.markedForReview ? 'Marked' : 'Mark for Review'}
                </button>
                <button
                  onClick={handleClearResponse}
                  disabled={!currentResponse.selectedAnswer || currentResponse.locked}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Response
                </button>
                <button
                  onClick={handleSkip}
                  disabled={currentResponse.locked || currentQuestionIndex === questions.length - 1}
                  className="px-6 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg font-semibold hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip
                </button>
              </div>
              {/* Action Buttons — Mobile: compact icon strip */}
              <div className="md:hidden flex items-center justify-between gap-2 mb-2">
                <button
                  onClick={handleMarkForReview}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    currentResponse.markedForReview
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                    />
                  </svg>
                  {currentResponse.markedForReview ? 'Marked' : 'Mark'}
                </button>
                <button
                  onClick={handleClearResponse}
                  disabled={!currentResponse.selectedAnswer || currentResponse.locked}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear
                </button>
              </div>
              {/* Navigation Buttons — Desktop only */}
              <div className="hidden md:flex justify-between mt-6 pt-6 border-t dark:border-gray-700">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar — Desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">Question Palette</h3>

              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                {questions.map((_, index) => {
                  const status = getQuestionStatus(responses[index]);
                  return (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`w-full aspect-square rounded flex items-center justify-center font-semibold text-sm transition-all ${getStatusColor(
                        status
                      )} ${
                        index === currentQuestionIndex ? 'ring-2 ring-offset-2 ring-blue-600' : ''
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Submit Test?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to submit? You cannot change answers after submission.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitTest}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        reportText={reportText}
        onChangeText={setReportText}
        onSubmit={() => submitReport(questions[currentQuestionIndex].id)}
        onClose={closeReport}
        submitting={reportSubmitting}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Exit Test?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Your progress is saved. You can resume this test later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => navigate('/test-selection')}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Question Palette Drawer */}
      {showMobilePalette && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowMobilePalette(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-white">Question Palette</h3>
              <button
                onClick={() => setShowMobilePalette(false)}
                className="text-gray-500 dark:text-gray-400 p-1"
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
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="flex justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
                <span className="text-gray-700 dark:text-gray-300">Answered</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusCounts.answered}
                </span>
              </div>
              <div className="flex justify-between bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                <span className="text-gray-700 dark:text-gray-300">Not Answered</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusCounts.notAnswered}
                </span>
              </div>
              <div className="flex justify-between bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
                <span className="text-gray-700 dark:text-gray-300">Marked</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusCounts.marked}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded">
                <span className="text-gray-700 dark:text-gray-300">Not Visited</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusCounts.notVisited}
                </span>
              </div>
            </div>
            {/* Marking Scheme */}
            <div className="flex items-center justify-center gap-4 mb-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                +{Number(currentResponse?.marksPerQuestion || 1).toFixed(2)} correct
              </span>
              <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                {Number(currentResponse?.negativeMarking || 0).toFixed(2)} wrong
              </span>
            </div>
            {/* Pagination Controls */}
            {questions.length > PALETTE_PAGE_SIZE && (
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPalettePage((p) => Math.max(0, p - 1))}
                  disabled={palettePage === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {palettePage * PALETTE_PAGE_SIZE + 1}-
                  {Math.min((palettePage + 1) * PALETTE_PAGE_SIZE, questions.length)} of{' '}
                  {questions.length}
                </span>
                <button
                  onClick={() =>
                    setPalettePage((p) =>
                      Math.min(Math.ceil(questions.length / PALETTE_PAGE_SIZE) - 1, p + 1)
                    )
                  }
                  disabled={palettePage >= Math.ceil(questions.length / PALETTE_PAGE_SIZE) - 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
            <div className="grid grid-cols-6 gap-2.5">
              {questions
                .slice(palettePage * PALETTE_PAGE_SIZE, (palettePage + 1) * PALETTE_PAGE_SIZE)
                .map((_, i) => {
                  const index = palettePage * PALETTE_PAGE_SIZE + i;
                  const status = getQuestionStatus(responses[index]);
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        goToQuestion(index);
                        setShowMobilePalette(false);
                        setTimeout(() => {
                          questionCardRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }, 100);
                      }}
                      className={`h-10 w-10 rounded-lg text-sm font-semibold ${getStatusColor(status)} ${
                        index === currentQuestionIndex ? 'ring-2 ring-blue-600' : ''
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Nav Bar — Mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20 px-4 py-2.5 safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Prev
          </button>
          <button
            onClick={handleSkip}
            disabled={currentResponse.locked || currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-1 px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
export default CustomTest;
