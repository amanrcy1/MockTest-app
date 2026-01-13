import React, { useCallback, useEffect, useState, useMemo } from "react";
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
import { calculateScore, shuffleArray } from "../../utils/testUtils";
import { useAuth } from "../../context/AuthContext";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import { useKeyboardShortcuts, useNavigationBlock, randomizeTest, useTestSession, useBookmarks, useErrorReport } from "../../hooks";
import { generateExplanation } from "../../services/aiService";
import { PageSpinner, ResumePrompt, ReportModal } from "../../components";
import logger from "../../utils/logger";
import ReactMarkdown from "react-markdown";

const PracticeMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const examType = location.state?.examType;
  const { currentUser } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Shared hooks
  const { saveSession, loadSavedSession, clearSession } = useTestSession(
    "practiceTestSession", "activeTestSession",
    { mode: "practice", examType, userId: currentUser?.uid }
  );
  const { bookmarkMap, loadBookmarks, toggleBookmark } = useBookmarks(currentUser?.uid, examType);
  const {
    showReportModal, reportText, setReportText, reportSubmitting,
    openReport, closeReport, submitReport,
  } = useErrorReport(currentUser?.uid, examType);

  // Block navigation when practice is in progress
  const isPracticeInProgress = !loading && !showResumePrompt && questions.length > 0;
  useNavigationBlock(isPracticeInProgress, 'You have an ongoing practice session. Your progress will be saved, but are you sure you want to leave?');

  // Ref to store submit function for violation auto-submit
  const submitPracticeRef = React.useRef(null);

  // Practice mode doesn't need strict anti-cheat - it's for learning
  // Just use empty functions for fullscreen (no enforcement)
  const enterFullscreen = useCallback(() => Promise.resolve(true), []);
  const exitFullscreen = useCallback(() => {}, []);

  const sectionMeta = React.useMemo(() => {
    const pattern = EXAM_PATTERNS[examType];
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
  }, [examType, questions]);

  const currentSectionLabel = React.useMemo(() => {
    if (!sectionMeta.length) {
      return null;
    }
    const match = sectionMeta.find((section) => {
      if (section.startIndex === null) {
        return false;
      }
      const nextSection = sectionMeta.find(
        (other) => other.startIndex !== null && other.startIndex > section.startIndex,
      );
      const endIndex = nextSection ? nextSection.startIndex - 1 : questions.length - 1;
      return currentQuestionIndex >= section.startIndex && currentQuestionIndex <= endIndex;
    });
    return match?.name || null;
  }, [currentQuestionIndex, questions.length, sectionMeta]);

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

      if (allQuestions.length === 0) {
        toast.error("No questions available for practice");
        navigate("/test-selection");
        return;
      }

      allQuestions = shuffleArray(allQuestions);
      
      // Randomize options for each question (anti-cheat measure)
      const randomizedQuestions = randomizeTest(allQuestions, currentUser?.uid);
      setQuestions(randomizedQuestions);
      
      setResponses(
        randomizedQuestions.map((question) => ({
          questionId: question.id,
          selectedAnswer: null,
          markedForReview: false,
          timeTaken: 0,
          visited: false,
          marksPerQuestion: 1,
          negativeMarking: 0,
        }))
      );
      setLoading(false);
      // Enter fullscreen when practice starts
      enterFullscreen();
    } catch (error) {
      logger.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
      navigate("/test-selection");
    }
  }, [examType, navigate, currentUser?.uid, enterFullscreen]);

  const restoreSession = useCallback((session) => {
    setQuestions(session.questions || []);
    setResponses(session.responses || []);
    setCurrentQuestionIndex(session.currentQuestionIndex || 0);
    setSelectedAnswer(session.selectedAnswer || null);
    setShowSolution(Boolean(session.showSolution));
    setScore(session.score || { correct: 0, incorrect: 0, total: 0 });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!examType) {
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
  }, [examType, fetchQuestions, restoreSession, loadSavedSession, location.state, navigate]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    saveSession({
      examType, questions, responses, currentQuestionIndex,
      selectedAnswer, showSolution, score,
    });
  }, [saveSession, loading, examType, questions, responses, currentQuestionIndex, selectedAnswer, showSolution, score]);

  const handleAnswerSelect = useCallback((answer) => {
    if (showSolution) return;

    setSelectedAnswer(answer);

    setResponses((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = {
        ...updated[currentQuestionIndex],
        selectedAnswer: answer,
        visited: true,
      };
      return updated;
    });

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion?.correctAnswer;
    setScore((prev) => ({
      ...prev,
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    setTimeout(() => setShowSolution(true), 300);
  }, [showSolution, currentQuestionIndex, questions]);

  const submitPracticeTest = useCallback(async () => {
    if (!currentUser) {
      toast.error("Please log in to save your result.");
      navigate("/login");
      return;
    }

    const scoreData = calculateScore(responses, questions);
    try {
      await addDoc(collection(db, "tests"), {
        userId: currentUser.uid,
        examType,
        testMode: "practice",
        questions: questions.map((q) => q.id),
        responses,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        timeRemaining: null,
        timeTaken: null,
        score: scoreData.totalMarks,
        accuracy: scoreData.accuracy,
        correct: scoreData.correct,
        incorrect: scoreData.incorrect,
        skipped: scoreData.skipped,
        completed: true,
      });
      clearSession();
      toast.success("Practice session completed!");
      exitFullscreen();
      navigate("/dashboard");
    } catch (error) {
      logger.error("Error saving practice test:", error);
      toast.error("Failed to save practice result");
    }
  }, [currentUser, examType, questions, responses, clearSession, exitFullscreen, navigate]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowSolution(false);
      setAiExplanation(null);
    } else {
      submitPracticeTest();
    }
  }, [currentQuestionIndex, questions.length, submitPracticeTest]);

  const handleGoToSection = (section) => {
    if (section.startIndex === null) {
      return;
    }
    setCurrentQuestionIndex(section.startIndex);
    setSelectedAnswer(responses[section.startIndex]?.selectedAnswer || null);
    setShowSolution(false);
  };

  // Keep submitPracticeRef updated
  React.useEffect(() => {
    submitPracticeRef.current = submitPracticeTest;
  }, [submitPracticeTest]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedAnswer(null);
      setShowSolution(false);
      setAiExplanation(null);
    }
  }, [currentQuestionIndex]);

  const handleGetAiExplanation = useCallback(async () => {
    if (aiExplanation || loadingAi) return;
    
    const question = questions[currentQuestionIndex];
    if (!question || selectedAnswer === question.correctAnswer) return;

    setLoadingAi(true);
    try {
      const explanation = await generateExplanation({
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: selectedAnswer,
        subject: question.subject,
        topic: question.topic,
        existingSolution: question.solution,
      });
      setAiExplanation(explanation);
    } catch (error) {
      toast.error("Failed to generate AI explanation");
      logger.error("AI explanation error:", error);
    } finally {
      setLoadingAi(false);
    }
  }, [aiExplanation, loadingAi, questions, currentQuestionIndex, selectedAnswer]);

  useEffect(() => {
    if (responses[currentQuestionIndex]) {
      setSelectedAnswer(responses[currentQuestionIndex].selectedAnswer);
    }
  }, [currentQuestionIndex, responses]);

  // Keyboard shortcuts for practice mode
  const keyboardShortcuts = useMemo(() => ({
    '1': () => !showSolution && handleAnswerSelect('A'),
    '2': () => !showSolution && handleAnswerSelect('B'),
    '3': () => !showSolution && handleAnswerSelect('C'),
    '4': () => !showSolution && handleAnswerSelect('D'),
    'a': () => !showSolution && handleAnswerSelect('A'),
    'b': () => !showSolution && handleAnswerSelect('B'),
    'c': () => !showSolution && handleAnswerSelect('C'),
    'd': () => !showSolution && handleAnswerSelect('D'),
    'n': () => showSolution && handleNext(),
    'ArrowRight': () => showSolution && handleNext(),
    'ArrowLeft': handlePrevious,
    'p': handlePrevious,
    '?': () => setShowShortcutsHelp(true),
    'Escape': () => {
      setShowShortcutsHelp(false);
      closeReport();
    },
  }), [showSolution, handleAnswerSelect, handleNext, handlePrevious, closeReport]);

  useKeyboardShortcuts(keyboardShortcuts, isPracticeInProgress && !showReportModal);

  if (loading) {
    return <PageSpinner message="Loading practice questions..." />;
  }

  if (showResumePrompt && resumeData) {
    return (
      <ResumePrompt
        title="Resume your practice session?"
        description={`You have an unfinished ${examType} practice session. Continue or start fresh.`}
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
  const isBookmarked = Boolean(bookmarkMap[currentQuestion.id]);
  const accuracy =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">
                Practice Mode
              </h1>
              <p className="text-sm text-gray-600">{examType}</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Keyboard shortcuts (?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-xl font-bold text-blue-600">
                  {currentQuestionIndex + 1} / {questions.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-xl font-bold text-green-600">
                  {score.correct} / {score.total}
                </p>
              </div>
              <button
                onClick={() => {
                  exitFullscreen();
                  navigate("/dashboard");
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 no-select">
          {sectionMeta.length > 1 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {sectionMeta.map((section) => (
                  <button
                    key={section.name}
                    onClick={() => handleGoToSection(section)}
                    disabled={section.startIndex === null}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      currentSectionLabel === section.name
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    } ${section.startIndex === null ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {section.name} ({section.count})
                  </button>
                ))}
              </div>
              {currentSectionLabel && (
                <p className="text-xs text-gray-500 mt-2">
                  Current section: {currentSectionLabel}
                </p>
              )}
            </div>
          )}
          {/* Question Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded">
                Question {currentQuestionIndex + 1}
              </span>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  {currentQuestion.subject}
                </span>
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  {currentQuestion.topic}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                  {currentQuestion.difficulty}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleBookmark(currentQuestion.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark question"}
              >
                <svg
                  className="w-6 h-6"
                  fill={isBookmarked ? "currentColor" : "none"}
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
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                title="Report error"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div className="mb-6">
            <p className="text-lg text-gray-800 leading-relaxed">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {["A", "B", "C", "D"].map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = currentQuestion.correctAnswer === option;
              const showCorrect = showSolution && isCorrect;
              const showWrong = showSolution && isSelected && !isCorrect;

              return (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showSolution}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    showCorrect
                      ? "border-green-500 bg-green-50"
                      : showWrong
                        ? "border-red-500 bg-red-50"
                        : isSelected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } ${showSolution ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-700">
                        {option}.
                      </span>{" "}
                      <span className="text-gray-800">
                        {currentQuestion.options?.[option] || "Option missing"}
                      </span>
                    </div>
                    {showCorrect && (
                      <span className="text-green-600 font-semibold ml-2">
                        Correct
                      </span>
                    )}
                    {showWrong && (
                      <span className="text-red-600 font-semibold ml-2">
                        Wrong
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instant Feedback */}
          {showSolution && (
            <div
              className={`mb-6 p-6 rounded-lg border-l-4 ${
                selectedAnswer === currentQuestion.correctAnswer
                  ? "bg-green-50 border-green-500"
                  : "bg-red-50 border-red-500"
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <>
                    <svg
                      className="w-6 h-6 text-green-600 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-800 text-lg mb-2">
                        Correct! Well done!
                      </h4>
                      <p className="text-green-700">
                        You selected the right answer.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6 text-red-600 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h4 className="font-bold text-red-800 text-lg mb-2">
                        Incorrect
                      </h4>
                      <p className="text-red-700">
                        The correct answer is{" "}
                        <span className="font-bold">
                          {currentQuestion.correctAnswer}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Solution */}
              <div className="bg-white p-4 rounded-lg mt-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Explanation:
                </h4>
                <p className="text-gray-700">{currentQuestion.solution}</p>
              </div>

              {/* AI Explanation - Only for incorrect answers */}
              {selectedAnswer !== currentQuestion.correctAnswer && (
                <div className="mt-4">
                  {!aiExplanation ? (
                    <button
                      onClick={handleGetAiExplanation}
                      disabled={loadingAi}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAi ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Get AI Explanation</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-l-4 border-purple-500 dark:border-purple-400 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="font-semibold text-purple-800 dark:text-purple-300">AI Explanation:</p>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {showSolution && (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {currentQuestionIndex === questions.length - 1
                  ? "Finish"
                  : "Next"}
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>
                {Math.round(
                  ((currentQuestionIndex + 1) / questions.length) * 100,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / questions.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {score.total > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-gray-800 mb-4">Session Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {score.correct}
                </p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">
                  {score.incorrect}
                </p>
                <p className="text-sm text-gray-600">Incorrect</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ReportModal
        isOpen={showReportModal}
        reportText={reportText}
        onChangeText={setReportText}
        onSubmit={() => submitReport(questions[currentQuestionIndex].id)}
        onClose={closeReport}
        submitting={reportSubmitting}
      />

      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                  <span className="ml-2">Next (after answer)</span>
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

export default PracticeMode;
