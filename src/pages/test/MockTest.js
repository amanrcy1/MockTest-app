import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import {
  calculateScore,
  formatTime,
  getQuestionStatus,
  getStatusColor,
  shuffleArray,
} from "../../utils/testUtils";
import { useKeyboardShortcuts, useNavigationBlock, useAntiCheat, randomizeTest, useTestSession, useBookmarks, useErrorReport } from "../../hooks";
import { ViolationModal, PageSpinner, ResumePrompt, ReportModal } from "../../components";
import { Timer3D } from "../../components/3d";
import logger from "../../utils/logger";

const MockTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const examType = location.state?.examType;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const timerRef = useRef(null);
  const questionStartRef = useRef(null);
  const lastQuestionIndexRef = useRef(null);

  const examPattern = EXAM_PATTERNS[examType];

  // Shared hooks
  const { saveSession, loadSavedSession, clearSession } = useTestSession(
    "mockTestSession", "activeTestSession",
    { mode: "mock", examType, userId: currentUser?.uid }
  );
  const { bookmarkMap, loadBookmarks, toggleBookmark } = useBookmarks(currentUser?.uid, examType);
  const {
    showReportModal, reportText, setReportText, reportSubmitting,
    openReport, closeReport, submitReport,
  } = useErrorReport(currentUser?.uid, examType);

  // Block navigation when test is in progress
  const isTestInProgress = !loading && !showInstructions && !showResumePrompt && questions.length > 0;
  useNavigationBlock(isTestInProgress, 'You have an ongoing test. Your progress will be saved, but are you sure you want to leave?');

  // Ref to store submit function for violation auto-submit
  const submitTestRef = useRef(null);

  // Auto-submit handler for violations
  const handleViolationAutoSubmit = useCallback(async () => {
    toast.error("Test auto-submitted due to multiple fullscreen violations", { autoClose: 5000 });
    if (submitTestRef.current) {
      submitTestRef.current();
    }
  }, []);

  // Anti-cheat measures
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

  const buildSectionedQuestions = useCallback(
    (allQuestions) => {
    if (!examPattern) return { selectedQuestions: [], sectionMeta: [] };
    const totalRequired = examPattern.sections.reduce(
      (sum, section) => sum + section.totalQuestions,
      0,
    );

    if (allQuestions.length < totalRequired) {
      return { selectedQuestions: [], sectionMeta: [] };
    }

    let remaining = [...allQuestions];
    const selectedQuestions = [];
    const sectionMeta = [];

    examPattern.sections.forEach((section) => {
      let sectionQuestions = remaining.filter(
        (question) => question.subject === section.name,
      );

      if (sectionQuestions.length > section.totalQuestions) {
        sectionQuestions = sectionQuestions.slice(0, section.totalQuestions);
      }

      const selectedIds = new Set(sectionQuestions.map((q) => q.id));
      remaining = remaining.filter((q) => !selectedIds.has(q.id));

      if (sectionQuestions.length < section.totalQuestions) {
        const needed = section.totalQuestions - sectionQuestions.length;
        const fallback = remaining.slice(0, needed);
        sectionQuestions = sectionQuestions.concat(fallback);
        const fallbackIds = new Set(fallback.map((q) => q.id));
        remaining = remaining.filter((q) => !fallbackIds.has(q.id));
      }

      const startIndex = selectedQuestions.length;
      selectedQuestions.push(...sectionQuestions);
      sectionMeta.push({
        ...section,
        startIndex,
        endIndex: selectedQuestions.length - 1,
      });
    });

    return { selectedQuestions, sectionMeta };
    },
    [examPattern?.sections] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "questions"),
        where("examType", "==", examType),
      );
      const snapshot = await getDocs(q);

      let allQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      allQuestions = shuffleArray(allQuestions);

      const { selectedQuestions, sectionMeta } =
        buildSectionedQuestions(allQuestions);

      if (selectedQuestions.length === 0) {
        const totalRequired = examPattern.sections.reduce(
          (sum, section) => sum + section.totalQuestions,
          0,
        );
        toast.error(
          `Insufficient questions. Need ${totalRequired}, have ${allQuestions.length}`,
        );
        navigate("/test-selection");
        return;
      }

      setSections(sectionMeta);
      
      // Randomize options for each question (anti-cheat measure)
      const randomizedQuestions = randomizeTest(selectedQuestions, currentUser?.uid);
      setQuestions(randomizedQuestions);
      
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(sectionMeta[0]?.startIndex || 0);

      const initialResponses = randomizedQuestions.map((question, index) => {
        const section = sectionMeta.find(
          (meta) => index >= meta.startIndex && index <= meta.endIndex,
        );
        return {
          questionId: question.id,
          selectedAnswer: null,
          markedForReview: false,
          timeTaken: 0,
          visited: false,
          locked: false, // Once answered and navigated away, answer is locked
          marksPerQuestion: section?.marksPerQuestion ?? 1,
          negativeMarking: section?.negativeMarking ?? 0,
        };
      });
      setResponses(initialResponses);

      const totalTime = examPattern.sections.reduce(
        (sum, section) => sum + section.duration * 60,
        0,
      );
      setTimeRemaining(totalTime);
      setSectionTimeRemaining(sectionMeta[0]?.duration * 60 || 0);

      setLoading(false);
    } catch (error) {
      logger.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
      navigate("/test-selection");
    }
  }, [buildSectionedQuestions, currentUser, examPattern, examType, navigate]);

  const restoreSession = useCallback((session) => {
    setQuestions(session.questions || []);
    setSections(session.sections || []);
    setResponses(session.responses || []);
    setCurrentSectionIndex(session.currentSectionIndex || 0);
    setCurrentQuestionIndex(session.currentQuestionIndex || 0);
    setTimeRemaining(session.timeRemaining || 0);
    setSectionTimeRemaining(session.sectionTimeRemaining || 0);
    setShowInstructions(false);
    setLoading(false);
  }, []);

  const recordTimeSpent = useCallback(() => {
    if (
      questionStartRef.current === null ||
      lastQuestionIndexRef.current === null
    ) {
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

  const submitTest = useCallback(async () => {
    try {
      recordTimeSpent();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const totalDurationSeconds = examPattern.sections.reduce(
        (sum, section) => sum + section.duration * 60,
        0,
      );

      const scoreData = calculateScore(responses, questions);
      const testData = {
        userId: currentUser.uid,
        examType,
        testMode: "mock",
        questions: questions.map((q) => q.id),
        responses,
        startTime: new Date(
          Date.now() - (totalDurationSeconds - timeRemaining) * 1000,
        ).toISOString(),
        endTime: new Date().toISOString(),
        timeRemaining,
        timeTaken: totalDurationSeconds - timeRemaining,
        score: scoreData.totalMarks,
        accuracy: scoreData.accuracy,
        correct: scoreData.correct,
        incorrect: scoreData.incorrect,
        skipped: scoreData.skipped,
        completed: true,
      };

      const docRef = await addDoc(collection(db, "tests"), testData);
      clearSession();
      
      // Exit fullscreen before navigating to results
      exitFullscreen();

      navigate("/test/result", {
        state: {
          testId: docRef.id,
          questions,
          responses,
          examType,
          testMode: "mock",
        },
      });
    } catch (error) {
      logger.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    }
  }, [
    clearSession,
    currentUser,
    examPattern,
    examType,
    exitFullscreen,
    navigate,
    questions,
    recordTimeSpent,
    responses,
    timeRemaining,
  ]);

  // Keep submitTestRef updated
  useEffect(() => {
    submitTestRef.current = submitTest;
  }, [submitTest]);

  const handleAutoSubmit = useCallback(() => {
    toast.info("Time is up! Auto-submitting test...");
    submitTest();
  }, [submitTest]);

  useEffect(() => {
    if (!examType || !examPattern) {
      toast.error("No exam type selected");
      navigate("/test-selection");
      return;
    }

    const saved = loadSavedSession(
      (s) => s.examType === examType && s.questions?.length
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
  }, [
    examPattern,
    examType,
    fetchQuestions,
    restoreSession,
    loadSavedSession,
    location.state,
    navigate,
  ]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    if (loading || showInstructions || questions.length === 0) return;
    saveSession({
      examType, questions, sections, responses,
      currentSectionIndex, currentQuestionIndex,
      timeRemaining, sectionTimeRemaining,
    });
  }, [saveSession, loading, showInstructions, examType, questions, sections, responses, currentSectionIndex, currentQuestionIndex, timeRemaining, sectionTimeRemaining]);

  useEffect(() => {
    if (!showInstructions && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });

        setSectionTimeRemaining((prev) => {
          if (prev <= 1) {
            if (currentSectionIndex < sections.length - 1) {
              setCurrentSectionIndex((index) => index + 1);
            } else {
              handleAutoSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    currentSectionIndex,
    handleAutoSubmit,
    sections.length,
    showInstructions,
    timeRemaining,
  ]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }
    const currentSection = sections[currentSectionIndex];
    setSectionTimeRemaining(currentSection.duration * 60);
    setCurrentQuestionIndex(currentSection.startIndex);
  }, [currentSectionIndex, sections]);

  useEffect(() => {
    if (showInstructions) {
      return;
    }
    if (lastQuestionIndexRef.current !== null) {
      recordTimeSpent();
    }
    lastQuestionIndexRef.current = currentQuestionIndex;
    questionStartRef.current = Date.now();
  }, [currentQuestionIndex, recordTimeSpent, showInstructions]);

  const handleAnswerSelect = useCallback((answer) => {
    setResponses(prev => {
      // Don't allow changing answer if already locked
      if (prev[currentQuestionIndex]?.locked) {
        return prev;
      }
      const newResponses = [...prev];
      newResponses[currentQuestionIndex] = {
        ...newResponses[currentQuestionIndex],
        selectedAnswer: answer,
        visited: true,
      };
      return newResponses;
    });
  }, [currentQuestionIndex]);

  const handleMarkForReview = useCallback(() => {
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[currentQuestionIndex] = {
        ...newResponses[currentQuestionIndex],
        markedForReview: !newResponses[currentQuestionIndex]?.markedForReview,
        visited: true,
      };
      return newResponses;
    });
  }, [currentQuestionIndex]);

  const handleClearResponse = useCallback(() => {
    setResponses(prev => {
      // Don't allow clearing if locked
      if (prev[currentQuestionIndex]?.locked) {
        return prev;
      }
      const newResponses = [...prev];
      newResponses[currentQuestionIndex] = {
        ...newResponses[currentQuestionIndex],
        selectedAnswer: null,
      };
      return newResponses;
    });
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index) => {
    const section = sections[currentSectionIndex];
    if (index < section.startIndex || index > section.endIndex) {
      return;
    }
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[index] = {
        ...newResponses[index],
        visited: true,
      };
      return newResponses;
    });
    setCurrentQuestionIndex(index);
  }, [sections, currentSectionIndex]);

  const handleNext = useCallback(() => {
    // Lock the current answer if one was selected
    setResponses(prev => {
      const newResponses = [...prev];
      if (newResponses[currentQuestionIndex]?.selectedAnswer) {
        newResponses[currentQuestionIndex] = {
          ...newResponses[currentQuestionIndex],
          locked: true,
        };
      }
      return newResponses;
    });
    
    const section = sections[currentSectionIndex];
    if (currentQuestionIndex < section.endIndex) {
      goToQuestion(currentQuestionIndex + 1);
      return;
    }
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((index) => index + 1);
    }
  }, [sections, currentSectionIndex, currentQuestionIndex, goToQuestion]);

  const handleSkip = useCallback(() => {
    // Mark as visited but NOT locked - user can answer later
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[currentQuestionIndex] = {
        ...newResponses[currentQuestionIndex],
        selectedAnswer: null,
        visited: true,
        // Don't lock skipped questions - user can answer them later
      };
      return newResponses;
    });
    // Move to next question
    const section = sections[currentSectionIndex];
    if (currentQuestionIndex < section.endIndex) {
      goToQuestion(currentQuestionIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((index) => index + 1);
    }
  }, [currentQuestionIndex, sections, currentSectionIndex, goToQuestion]);

  const handlePrevious = useCallback(() => {
    // Lock the current answer if one was selected before going back
    setResponses(prev => {
      const newResponses = [...prev];
      if (newResponses[currentQuestionIndex]?.selectedAnswer) {
        newResponses[currentQuestionIndex] = {
          ...newResponses[currentQuestionIndex],
          locked: true,
        };
      }
      return newResponses;
    });
    
    const section = sections[currentSectionIndex];
    if (currentQuestionIndex > section.startIndex) {
      goToQuestion(currentQuestionIndex - 1);
    }
  }, [sections, currentSectionIndex, currentQuestionIndex, goToQuestion]);

  const handleSaveAndNext = useCallback(() => {
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[currentQuestionIndex].visited = true;
      return newResponses;
    });
    handleNext();
  }, [currentQuestionIndex, handleNext]);

  const getStatusCounts = () => {
    return {
      answered: responses.filter((r) => r.selectedAnswer && !r.markedForReview)
        .length,
      notAnswered: responses.filter(
        (r) => r.visited && !r.selectedAnswer && !r.markedForReview,
      ).length,
      marked: responses.filter((r) => r.markedForReview && !r.selectedAnswer)
        .length,
      answeredMarked: responses.filter(
        (r) => r.selectedAnswer && r.markedForReview,
      ).length,
      notVisited: responses.filter((r) => !r.visited).length,
    };
  };

  // Keyboard shortcuts for test navigation
  const keyboardShortcuts = useMemo(() => ({
    '1': () => handleAnswerSelect('A'),
    '2': () => handleAnswerSelect('B'),
    '3': () => handleAnswerSelect('C'),
    '4': () => handleAnswerSelect('D'),
    'a': () => handleAnswerSelect('A'),
    'b': () => handleAnswerSelect('B'),
    'c': () => handleAnswerSelect('C'),
    'd': () => handleAnswerSelect('D'),
    'n': handleNext,
    'p': handlePrevious,
    's': handleSkip,
    'ArrowRight': handleNext,
    'ArrowLeft': handlePrevious,
    'm': handleMarkForReview,
    'r': handleClearResponse,
    '?': () => setShowShortcutsHelp(true),
    'Escape': () => {
      setShowShortcutsHelp(false);
      closeReport();
    },
  }), [handleAnswerSelect, handleClearResponse, handleMarkForReview, handleNext, handlePrevious, handleSkip, closeReport]);

  useKeyboardShortcuts(keyboardShortcuts, isTestInProgress && !showSubmitModal && !showReportModal);

  if (loading) {
    return <PageSpinner message="Loading test..." />;
  }

  if (showResumePrompt && resumeData) {
    return (
      <ResumePrompt
        title="Resume your last mock test?"
        description={`You have an unfinished ${examPattern?.name} mock test. You can continue or start a fresh attempt.`}
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

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
            {examPattern.name}
          </h1>

          {/* Key Info - Always Visible */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300"><strong>{questions.length}</strong> Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300"><strong>{examPattern.sections.reduce((sum, s) => sum + s.duration, 0)}</strong> Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300"><strong>+{examPattern.sections[0].marksPerQuestion}</strong> per correct</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300"><strong>{examPattern.sections[0].negativeMarking}</strong> per wrong</span>
              </div>
            </div>
          </div>

          {/* Important Rules - Compact */}
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-semibold">Fullscreen required • Auto-submit on time up</p>
              </div>
            </div>
          </div>

          {/* Collapsible Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <span>{showDetails ? "Hide" : "Show"} detailed instructions</span>
            <svg className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="space-y-3 mb-4 text-sm">
              {examPattern.sections.length > 1 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Sections:</p>
                  {examPattern.sections.map((section, idx) => (
                    <div key={idx} className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                      <span>{section.name}</span>
                      <span>{section.totalQuestions}Q • {section.duration}min</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Status Colors:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Marked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Not Visited</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/test-selection")}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await enterFullscreen();
                setShowInstructions(false);
                if (responses[0]) {
                  const newResponses = [...responses];
                  newResponses[0].visited = true;
                  setResponses(newResponses);
                  questionStartRef.current = Date.now();
                  lastQuestionIndexRef.current = 0;
                }
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-lg"
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestionIndex];
  const statusCounts = getStatusCounts();
  const currentSection = sections[currentSectionIndex];
  const isBookmarked = Boolean(bookmarkMap[currentQuestion?.id]);

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
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {examPattern.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Section: {currentSection?.name}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                title="Keyboard shortcuts (?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Section Time</p>
                <p
                  className={`text-2xl font-bold ${
                    sectionTimeRemaining < 60 ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {formatTime(sectionTimeRemaining)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Time</p>
                <p
                  className={`text-2xl font-bold ${
                    timeRemaining < 300 ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </p>
              </div>
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
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {examPattern.name}
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {currentSection?.name}
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Submit
              </button>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Section</p>
                <p className={`text-lg font-bold ${sectionTimeRemaining < 60 ? "text-red-600" : "text-blue-600"}`}>
                  {formatTime(sectionTimeRemaining)}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className={`text-lg font-bold ${timeRemaining < 300 ? "text-red-600" : "text-blue-600"}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2 order-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 no-select">
              {/* Question Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <p className="text-sm text-gray-600 mt-2">
                    {currentQuestion.subject} | {currentQuestion.topic}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-gray-600">
                  <div>
                    Marks: +{currentResponse.marksPerQuestion} |{" "}
                    {currentResponse.negativeMarking}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBookmark(currentQuestion.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        isBookmarked
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {isBookmarked ? "Bookmarked" : "Bookmark"}
                    </button>
                    <button
                      onClick={openReport}
                      className="px-3 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Report Error
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <p className="text-lg text-gray-800 leading-relaxed">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* Locked indicator */}
              {currentResponse.locked && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm text-amber-700 font-medium">
                    Answer locked - You cannot change your response
                  </span>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 mb-8">
                {["A", "B", "C", "D"].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={currentResponse.locked}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      currentResponse.selectedAnswer === option
                        ? currentResponse.locked
                          ? "border-blue-600 bg-blue-50 cursor-not-allowed"
                          : "border-blue-600 bg-blue-50"
                        : currentResponse.locked
                          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 cursor-not-allowed opacity-60"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="font-semibold text-gray-700">
                      {option}.
                    </span>{" "}
                    <span className="text-gray-800">
                      {currentQuestion.options?.[option] || "Option missing"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleMarkForReview}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    currentResponse.markedForReview
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  {currentResponse.markedForReview
                    ? "Marked for Review"
                    : "Mark for Review"}
                </button>
                <button
                  onClick={handleClearResponse}
                  disabled={!currentResponse.selectedAnswer || currentResponse.locked}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Response
                </button>
                <button
                  onClick={handleSkip}
                  disabled={currentResponse.locked || (currentQuestionIndex === currentSection?.endIndex && currentSectionIndex === sections.length - 1)}
                  className="px-6 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveAndNext}
                  disabled={currentQuestionIndex === currentSection?.endIndex && currentSectionIndex === sections.length - 1}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save & Next
                </button>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6 pt-6 border-t">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === currentSection?.startIndex}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    currentQuestionIndex === currentSection?.endIndex &&
                    currentSectionIndex === sections.length - 1
                  }
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestionIndex === currentSection?.endIndex &&
                  currentSectionIndex < sections.length - 1
                    ? "Next Section"
                    : "Next"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* 3D Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <Timer3D
                timeRemaining={timeRemaining}
                totalTime={examPattern?.duration * 60 || 7200}
                label="Time Left"
                size="md"
              />
            </div>

            {/* Question Palette */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Question Palette
              </h2>

            <div className="grid grid-cols-2 gap-2 text-sm mb-6">
              <div className="flex justify-between bg-green-50 px-3 py-2 rounded">
                <span>Answered</span>
                <span className="font-semibold">{statusCounts.answered}</span>
              </div>
              <div className="flex justify-between bg-red-50 px-3 py-2 rounded">
                <span>Not Answered</span>
                <span className="font-semibold">
                  {statusCounts.notAnswered}
                </span>
              </div>
              <div className="flex justify-between bg-purple-50 px-3 py-2 rounded">
                <span>Marked</span>
                <span className="font-semibold">{statusCounts.marked}</span>
              </div>
              <div className="flex justify-between bg-orange-50 px-3 py-2 rounded">
                <span>Ans + Mark</span>
                <span className="font-semibold">
                  {statusCounts.answeredMarked}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                <span>Not Visited</span>
                <span className="font-semibold">{statusCounts.notVisited}</span>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
              {questions.map((_, index) => {
                const status = getQuestionStatus(responses[index]);
                const baseStyle = getStatusColor(status);
                const isActive = index === currentQuestionIndex;
                const isInSection =
                  index >= currentSection.startIndex &&
                  index <= currentSection.endIndex;

                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    disabled={!isInSection}
                    className={`h-9 w-9 rounded text-sm font-semibold ${baseStyle} ${
                      isActive ? "ring-2 ring-blue-600" : ""
                    } ${!isInSection ? "opacity-40 cursor-not-allowed" : ""}`}
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

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Submit Test?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Review your status before submitting.
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div className="flex justify-between bg-green-50 px-3 py-2 rounded">
                <span>Answered</span>
                <span className="font-semibold">{statusCounts.answered}</span>
              </div>
              <div className="flex justify-between bg-red-50 px-3 py-2 rounded">
                <span>Not Answered</span>
                <span className="font-semibold">
                  {statusCounts.notAnswered}
                </span>
              </div>
              <div className="flex justify-between bg-purple-50 px-3 py-2 rounded">
                <span>Marked</span>
                <span className="font-semibold">{statusCounts.marked}</span>
              </div>
              <div className="flex justify-between bg-orange-50 px-3 py-2 rounded">
                <span>Ans + Mark</span>
                <span className="font-semibold">
                  {statusCounts.answeredMarked}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                <span>Not Visited</span>
                <span className="font-semibold">{statusCounts.notVisited}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitTest}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
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
        onSubmit={() => submitReport(currentQuestion?.id)}
        onClose={closeReport}
        submitting={reportSubmitting}
      />

      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">1-4</kbd>
                  <span className="ml-2">Select option A-D</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">A-D</kbd>
                  <span className="ml-2">Select option</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">N</kbd>
                  <span className="ml-2">Next question</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">P</kbd>
                  <span className="ml-2">Previous question</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">←/→</kbd>
                  <span className="ml-2">Navigate</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">M</kbd>
                  <span className="ml-2">Mark for review</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">R</kbd>
                  <span className="ml-2">Clear response</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">?</kbd>
                  <span className="ml-2">Show this help</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTest;
