import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  EXAM_PATTERNS,
  getSubjectsByExam,
  getTopicsBySubject,
  DIFFICULTY_LEVELS,
} from "../../utils/examPatterns";
import toast, { messages } from "../../utils/toast";
import logger from "../../utils/logger";

const CustomTestSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const examType = location.state?.examType || "CDS";

  const [settings, setSettings] = useState({
    examType: examType,
    subjects: [],
    topics: [],
    difficulty: "all",
    numberOfQuestions: 20,
    timeLimit: 30, // minutes
    hasTimer: true,
    showInstantFeedback: false,
    shuffleQuestions: true,
    negativeMarking: true,
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    const subjects = getSubjectsByExam(settings.examType);
    setAvailableSubjects(subjects);
  }, [settings.examType]);

  useEffect(() => {
    // Update available topics based on selected subjects
    if (settings.subjects.length > 0) {
      const allTopics = new Set();
      settings.subjects.forEach((subject) => {
        const topics = getTopicsBySubject(subject);
        topics.forEach((topic) => allTopics.add(topic));
      });
      setAvailableTopics(Array.from(allTopics));
    } else {
      setAvailableTopics([]);
    }
  }, [settings.subjects]);

  const fetchQuestionCount = useCallback(async () => {
    try {
      let q = query(
        collection(db, "questions"),
        where("examType", "==", settings.examType),
      );

      const snapshot = await getDocs(q);
      let questions = snapshot.docs.map((doc) => doc.data());

      // Apply filters
      if (settings.subjects.length > 0) {
        questions = questions.filter((q) =>
          settings.subjects.includes(q.subject),
        );
      }
      if (settings.topics.length > 0) {
        questions = questions.filter((q) => settings.topics.includes(q.topic));
      }
      if (settings.difficulty !== "all") {
        questions = questions.filter(
          (q) => q.difficulty === settings.difficulty,
        );
      }

      setQuestionCount(questions.length);
    } catch (error) {
      logger.error("Error counting questions:", error);
    }
  }, [
    settings.difficulty,
    settings.examType,
    settings.subjects,
    settings.topics,
  ]);

  useEffect(() => {
    // Count available questions based on filters
    fetchQuestionCount();
  }, [fetchQuestionCount]);

  const handleSubjectToggle = (subject) => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleTopicToggle = (topic) => {
    setSettings((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleStartTest = () => {
    if (questionCount === 0) {
      toast.error(messages.NO_QUESTIONS_WITH_FILTERS);
      return;
    }

    if (settings.numberOfQuestions > questionCount) {
      toast.error(messages.REDUCE_QUESTIONS(questionCount));
      return;
    }

    if (settings.subjects.length === 0) {
      toast.error(messages.SELECT_SUBJECT);
      return;
    }

    navigate("/test/custom", { state: { settings } });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Custom Test Setup
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your personalized test
            </p>
          </div>
          <button
            onClick={() => navigate("/test-selection")}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Exam Type */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Exam Type
              </h3>
              <select
                value={settings.examType}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    examType: e.target.value,
                    subjects: [],
                    topics: [],
                  })
                }
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              >
                {Object.keys(EXAM_PATTERNS).map((key) => (
                  <option key={key} value={key}>
                    {EXAM_PATTERNS[key].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Select Subjects *
              </h3>
              <div className="space-y-2">
                {availableSubjects.map((subject) => (
                  <label
                    key={subject.value}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={settings.subjects.includes(subject.value)}
                      onChange={() => handleSubjectToggle(subject.value)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{subject.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            {availableTopics.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    Select Topics (Optional)
                  </h3>
                  <button
                    onClick={() => setSettings({ ...settings, topics: [] })}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Clear All
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Leave empty to include all topics
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {availableTopics.map((topic) => (
                    <label
                      key={topic}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={settings.topics.includes(topic)}
                        onChange={() => handleTopicToggle(topic)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{topic}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Test Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Test Settings
              </h3>

              <div className="space-y-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={settings.difficulty}
                    onChange={(e) =>
                      setSettings({ ...settings, difficulty: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="all">All Levels</option>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number of Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="5"
                    max={questionCount}
                    value={settings.numberOfQuestions}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        numberOfQuestions: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Available: {questionCount} questions
                  </p>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={settings.timeLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        timeLimit: parseInt(e.target.value),
                      })
                    }
                    disabled={!settings.hasTimer}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-gray-700 dark:text-gray-300">Enable Timer</span>
                    <input
                      type="checkbox"
                      checked={settings.hasTimer}
                      onChange={(e) =>
                        setSettings({ ...settings, hasTimer: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-gray-700 dark:text-gray-300">Show Instant Feedback</span>
                    <input
                      type="checkbox"
                      checked={settings.showInstantFeedback}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          showInstantFeedback: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-gray-700 dark:text-gray-300">Shuffle Questions</span>
                    <input
                      type="checkbox"
                      checked={settings.shuffleQuestions}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          shuffleQuestions: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-gray-700 dark:text-gray-300">Negative Marking</span>
                    <input
                      type="checkbox"
                      checked={settings.negativeMarking}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          negativeMarking: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Test Summary
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Exam Type</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {EXAM_PATTERNS[settings.examType].name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subjects Selected</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {settings.subjects.length > 0
                      ? settings.subjects.length
                      : "None"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Topics Selected</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {settings.topics.length > 0
                      ? settings.topics.length
                      : "All"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Difficulty</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {settings.difficulty === "all"
                      ? "All Levels"
                      : settings.difficulty}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {settings.numberOfQuestions} / {questionCount} available
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Time Limit</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {settings.hasTimer
                      ? `${settings.timeLimit} minutes`
                      : "Unlimited"}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Instant Feedback</span>
                      <span
                        className={
                          settings.showInstantFeedback
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400 dark:text-gray-500"
                        }
                      >
                        {settings.showInstantFeedback ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Shuffle Questions</span>
                      <span
                        className={
                          settings.shuffleQuestions
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400 dark:text-gray-500"
                        }
                      >
                        {settings.shuffleQuestions ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Negative Marking</span>
                      <span
                        className={
                          settings.negativeMarking
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400 dark:text-gray-500"
                        }
                      >
                        {settings.negativeMarking ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartTest}
                  disabled={
                    settings.subjects.length === 0 || questionCount === 0
                  }
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed mt-6"
                >
                  Start Custom Test
                </button>

                {questionCount === 0 && settings.subjects.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 text-center">
                    No questions available with current filters
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTestSetup;
