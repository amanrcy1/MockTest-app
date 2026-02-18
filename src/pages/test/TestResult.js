import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../config/firebase";
import { calculateScore, formatTime } from "../../utils/testUtils";
import { CelebrationEffect } from "../../components/3d";
import { generateExplanation } from "../../services/aiService";
import logger from "../../utils/logger";
import ReactMarkdown from "react-markdown";

const TestResult = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { questions, responses, examType, testMode } = location.state || {};
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutionFilter, setSolutionFilter] = useState("all"); // all, correct, incorrect, skipped
  const [percentile, setPercentile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(true);
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingAi, setLoadingAi] = useState({});

  const calculatePercentile = useCallback(async () => {
    try {
      const q = query(
        collection(db, "tests"),
        where("examType", "==", examType),
        where("completed", "==", true),
      );
      const snapshot = await getDocs(q);

      const allScores = [];
      snapshot.forEach((doc) => {
        const testData = doc.data();
        const score = calculateScore(testData.responses, questions);
        allScores.push(score.totalMarks);
      });

      const myScore = calculateScore(responses, questions).totalMarks;
      const belowMe = allScores.filter((score) => score < myScore).length;
      const computedPercentile =
        allScores.length > 0
          ? ((belowMe / allScores.length) * 100).toFixed(2)
          : 100;

      setPercentile(computedPercentile);
      setLoading(false);
    } catch (error) {
      logger.error("Error calculating percentile:", error);
      setLoading(false);
    }
  }, [examType, questions, responses]);

  useEffect(() => {
    if (!questions || !responses) {
      toast.error("No test data available");
      navigate("/dashboard");
      return;
    }
    calculatePercentile();
  }, [calculatePercentile, navigate, questions, responses]);

  const handleGetAiExplanation = async (index, question, response) => {
    if (aiExplanations[index] || loadingAi[index]) return;

    setLoadingAi((prev) => ({ ...prev, [index]: true }));

    try {
      const explanation = await generateExplanation({
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: response.selectedAnswer,
        subject: question.subject,
        topic: question.topic,
        existingSolution: question.solution,
      });

      setAiExplanations((prev) => ({ ...prev, [index]: explanation }));
    } catch (error) {
      toast.error("Failed to generate AI explanation");
      logger.error("AI explanation error:", error);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [index]: false }));
    }
  };

  if (!questions || !responses) {
    return null;
  }

  const scoreData = calculateScore(responses, questions);
  const accuracy = parseFloat(scoreData.accuracy) || 0;
  const totalAttempted =
    scoreData.correct + scoreData.incorrect + scoreData.skipped;
  const totalForBreakdown = totalAttempted || 1;

  const subjectPerformance = {};
  questions.forEach((question, index) => {
    const subject = question.subject;
    if (!subjectPerformance[subject]) {
      subjectPerformance[subject] = { correct: 0, total: 0 };
    }
    subjectPerformance[subject].total++;
    if (responses[index].selectedAnswer === question.correctAnswer) {
      subjectPerformance[subject].correct++;
    }
  });

  const topicPerformance = {};
  questions.forEach((question, index) => {
    const topic = question.topic;
    if (!topicPerformance[topic]) {
      topicPerformance[topic] = { correct: 0, total: 0 };
    }
    topicPerformance[topic].total++;
    if (responses[index].selectedAnswer === question.correctAnswer) {
      topicPerformance[topic].correct++;
    }
  });

  const timeEntries = responses
    .map((response, index) => ({
      index,
      timeTaken: response.timeTaken || 0,
    }))
    .filter((item) => item.timeTaken > 0);

  const timeSummary = timeEntries.length
    ? {
        average: Math.round(
          timeEntries.reduce((sum, item) => sum + item.timeTaken, 0) /
            timeEntries.length,
        ),
        fastest: timeEntries.reduce((min, item) =>
          item.timeTaken < min.timeTaken ? item : min,
        ),
        slowest: timeEntries.reduce((max, item) =>
          item.timeTaken > max.timeTaken ? item : max,
        ),
        slowestList: [...timeEntries]
          .sort((a, b) => b.timeTaken - a.timeTaken)
          .slice(0, 5),
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Celebration Effect */}
      <CelebrationEffect 
        show={showCelebration} 
        score={accuracy}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Test Results</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {examType} • {testMode || "mock"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSolutions(!showSolutions)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {showSolutions ? "Hide" : "View"} Solutions
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Score Card with Ring */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score Ring */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - accuracy / 100)}`}
                  style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{accuracy}%</span>
                <span className="text-xs opacity-80">Accuracy</span>
              </div>
            </div>

            {/* Score Details */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-1">Your Score</h2>
              <div className="text-5xl font-bold mb-2">
                {scoreData.totalMarks.toFixed(2)}
                <span className="text-xl opacity-70 ml-2">/ {questions.length * responses[0].marksPerQuestion}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{scoreData.correct}</div>
                  <div className="text-xs opacity-80">Correct</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{scoreData.incorrect}</div>
                  <div className="text-xs opacity-80">Incorrect</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{scoreData.skipped}</div>
                  <div className="text-xs opacity-80">Skipped</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{scoreData.attemptedAccuracy}%</div>
                  <div className="text-xs opacity-80">Attempted Acc.</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">
                    {loading ? "..." : percentile}
                    {!loading && "%"}
                  </div>
                  <div className="text-xs opacity-80">Percentile</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Score Breakdown
          </h3>
          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500"
              style={{
                width: `${(scoreData.correct / totalForBreakdown) * 100}%`,
              }}
            ></div>
            <div
              className="bg-red-500"
              style={{
                width: `${(scoreData.incorrect / totalForBreakdown) * 100}%`,
              }}
            ></div>
            <div
              className="bg-gray-300"
              style={{
                width: `${(scoreData.skipped / totalForBreakdown) * 100}%`,
              }}
            ></div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
              Correct
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500"></span>
              Incorrect
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              Skipped
            </span>
          </div>
        </div>

        {/* Performance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subject-wise Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Subject-wise Performance
            </h3>
            <div className="space-y-3">
              {Object.entries(subjectPerformance).map(([subject, data]) => {
                const percentage = ((data.correct / data.total) * 100).toFixed(
                  1,
                );
                return (
                  <div key={subject}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {subject}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {data.correct}/{data.total} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage >= 70
                            ? "bg-green-500"
                            : percentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Topic-wise Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Topic-wise Performance
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(topicPerformance)
                .sort(
                  (a, b) =>
                    a[1].correct / a[1].total - b[1].correct / b[1].total,
                )
                .map(([topic, data]) => {
                  const percentage = (
                    (data.correct / data.total) *
                    100
                  ).toFixed(1);
                  return (
                    <div key={topic}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {topic}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {data.correct}/{data.total} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage >= 70
                              ? "bg-green-500"
                              : percentage >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Time Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Time Analysis
          </h3>
          {!timeSummary ? (
            <p className="text-gray-600 dark:text-gray-400">
              Time tracking is not available for this test.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Time</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(timeSummary.average)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fastest Question</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Q{timeSummary.fastest.index + 1}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTime(timeSummary.fastest.timeTaken)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Slowest Question</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Q{timeSummary.slowest.index + 1}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTime(timeSummary.slowest.timeTaken)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Top 5 Slowest Questions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {timeSummary.slowestList.map((entry) => (
                    <div
                      key={entry.index}
                      className="flex justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded text-sm text-gray-800 dark:text-gray-200"
                    >
                      <span>Q{entry.index + 1}</span>
                      <span className="font-semibold">
                        {formatTime(entry.timeTaken)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weak Areas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Areas to Improve
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(topicPerformance)
              .filter(([_, data]) => data.correct / data.total < 0.5)
              .slice(0, 3)
              .map(([topic, data]) => (
                <div
                  key={topic}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-red-800 mb-2">{topic}</h4>
                  <p className="text-sm text-red-600">
                    {data.correct} correct out of {data.total} questions
                  </p>
                  <p className="text-xs text-red-500 mt-2">
                    Accuracy: {((data.correct / data.total) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            {Object.entries(topicPerformance).filter(
              ([_, data]) => data.correct / data.total < 0.5,
            ).length === 0 && (
              <div className="col-span-3 text-center text-green-600 py-4">
                <svg
                  className="w-12 h-12 mx-auto mb-2"
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
                <p className="font-semibold">Great job! No weak areas found.</p>
                <p className="text-sm">You scored above 50% in all topics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Solutions Section */}
        {showSolutions && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Detailed Solutions
              </h3>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "all", label: "All", count: questions.length },
                  { key: "correct", label: "Correct", count: scoreData.correct },
                  { key: "incorrect", label: "Incorrect", count: scoreData.incorrect },
                  { key: "skipped", label: "Skipped", count: scoreData.skipped },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setSolutionFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      solutionFilter === key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              {questions.map((question, index) => {
                const response = responses[index];
                const isCorrect =
                  response.selectedAnswer === question.correctAnswer;
                const isSkipped = !response.selectedAnswer;

                // Apply filter
                if (solutionFilter === "correct" && !isCorrect) return null;
                if (solutionFilter === "incorrect" && (isCorrect || isSkipped)) return null;
                if (solutionFilter === "skipped" && !isSkipped) return null;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-6 ${
                      isCorrect
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                        : isSkipped
                          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                            isCorrect
                              ? "bg-green-500 text-white"
                              : isSkipped
                                ? "bg-gray-500 text-white"
                                : "bg-red-500 text-white"
                          }`}
                        >
                          Question {index + 1} -{" "}
                          {isCorrect
                            ? "Correct"
                            : isSkipped
                              ? "Skipped"
                              : "Incorrect"}
                        </span>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {question.subject}
                          </span>
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            {question.topic}
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            {question.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCorrect && (
                          <span className="text-green-600 font-semibold">
                            +{response.marksPerQuestion}
                          </span>
                        )}
                        {!isCorrect && !isSkipped && (
                          <span className="text-red-600 font-semibold">
                            {response.negativeMarking}
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-gray-600 dark:text-gray-400 font-semibold">0</span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <p className="text-gray-800 dark:text-gray-200 font-medium mb-4">
                      {question.questionText}
                    </p>

                    {/* Options */}
                    <div className="space-y-2 mb-4">
                      {["A", "B", "C", "D"].map((option) => {
                        const isUserAnswer = response.selectedAnswer === option;
                        const isCorrectAnswer =
                          question.correctAnswer === option;

                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectAnswer
                                ? "border-green-500 bg-green-100 dark:bg-green-900/30"
                                : isUserAnswer
                                  ? "border-red-500 bg-red-100 dark:bg-red-900/30"
                                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{option}.</span>
                              <span className="flex-1 text-gray-800 dark:text-gray-200">
                                {question.options[option]}
                              </span>
                              {isCorrectAnswer && (
                                <span className="text-green-600 font-semibold">
                                  Correct
                                </span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="text-red-600 font-semibold">
                                  Your Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Solution */}
                    <div className="bg-white dark:bg-gray-800 border-l-4 border-blue-500 p-4 rounded">
                      <p className="font-semibold text-gray-800 dark:text-white mb-2">
                        Solution:
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">{question.solution}</p>
                    </div>

                    {/* AI Explanation - Only for incorrect answers */}
                    {!isCorrect && !isSkipped && (
                      <div className="mt-4">
                        {!aiExplanations[index] ? (
                          <button
                            onClick={() => handleGetAiExplanation(index, question, response)}
                            disabled={loadingAi[index]}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingAi[index] ? (
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
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-l-4 border-purple-500 p-4 rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <p className="font-semibold text-purple-800 dark:text-purple-300">AI Explanation:</p>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{aiExplanations[index]}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
          <button
            onClick={() =>
              navigate("/test-selection", {
                state: {
                  examType,
                  mode: testMode || "mock",
                },
              })
            }
            className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
          >
            Retake Same Exam
          </button>
          <button
            onClick={() => navigate("/test-selection")}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Take Another Test
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResult;
