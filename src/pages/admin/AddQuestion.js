import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import toast, { messages } from "../../utils/toast";
import {
  EXAM_PATTERNS,
  getSubjectsByExam,
  getTopicsBySubject,
  DIFFICULTY_LEVELS,
} from "../../utils/examPatterns";
import { sanitizeForStorage } from "../../utils/testUtils";
import { useAuth } from "../../context/AuthContext";
import { logAdminAction } from "../../utils/auditLog";
import logger from "../../utils/logger";

const AddQuestion = () => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    examType: "CDS",
    subject: "",
    topic: "",
    subtopic: "",
    difficulty: "Medium",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    solution: "",
    tags: "",
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);

  // Update subjects when exam type changes
  useEffect(() => {
    const subjects = getSubjectsByExam(formData.examType);
    setAvailableSubjects(subjects);
    if (subjects.length > 0) {
      setFormData((prev) => ({
        ...prev,
        subject: subjects[0].value,
        topic: "",
        subtopic: "",
      }));
    }
  }, [formData.examType]);

  // Update topics when subject changes
  useEffect(() => {
    if (formData.subject) {
      const topics = getTopicsBySubject(formData.subject);
      setAvailableTopics(topics);
      if (topics.length > 0) {
        setFormData((prev) => ({ ...prev, topic: topics[0], subtopic: "" }));
      }
    }
  }, [formData.subject]);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.questionText.trim()) {
      toast.error(messages.QUESTION_TEXT_REQUIRED);
      return;
    }

    if (
      !formData.optionA.trim() ||
      !formData.optionB.trim() ||
      !formData.optionC.trim() ||
      !formData.optionD.trim()
    ) {
      toast.error(messages.OPTIONS_REQUIRED);
      return;
    }

    if (!formData.solution.trim()) {
      toast.error(messages.SOLUTION_REQUIRED);
      return;
    }

    try {
      setLoading(true);

      // Prepare question data with sanitization
      const questionData = {
        examType: formData.examType,
        subject: formData.subject,
        topic: formData.topic,
        subtopic: formData.subtopic.trim() || null,
        difficulty: formData.difficulty,
        questionText: sanitizeForStorage(formData.questionText.trim()),
        options: {
          A: sanitizeForStorage(formData.optionA.trim()),
          B: sanitizeForStorage(formData.optionB.trim()),
          C: sanitizeForStorage(formData.optionC.trim()),
          D: sanitizeForStorage(formData.optionD.trim()),
        },
        correctAnswer: formData.correctAnswer,
        solution: sanitizeForStorage(formData.solution.trim()),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        createdAt: new Date().toISOString(),
        createdBy: "admin", // You can update this with actual user ID
        isActive: true,
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, "questions"), questionData);
      logAdminAction({ adminId: userDetails?.userId, action: "addQuestion", targetId: docRef.id });
      toast.success(messages.QUESTION_ADDED);

      // Reset form
      setFormData({
        ...formData,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "A",
        solution: "",
        subtopic: "",
        tags: "",
      });
    } catch (error) {
      logger.error("Error adding question:", error);
      toast.error(messages.QUESTION_ADD_FAILED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Add New Question
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mockzam Admin</p>
          </div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </nav>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Exam Type and Subject Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="examType"
                  value={formData.examType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  {Object.keys(EXAM_PATTERNS).map((key) => (
                    <option key={key} value={key}>
                      {EXAM_PATTERNS[key].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  {availableSubjects.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topic and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <select
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  {availableTopics.map((topic, index) => (
                    <option key={index} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtopic (Optional)
                </label>
                <input
                  type="text"
                  name="subtopic"
                  value={formData.subtopic}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Fundamental Rights"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty <span className="text-red-500">*</span>
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                name="questionText"
                value={formData.questionText}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter the question here..."
                disabled={loading}
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Options</h3>

              {["A", "B", "C", "D"].map((option) => (
                <div key={option}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Option {option} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={`option${option}`}
                    value={formData[`option${option}`]}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={`Enter option ${option}`}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correct Answer <span className="text-red-500">*</span>
              </label>
              <select
                name="correctAnswer"
                value={formData.correctAnswer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={loading}
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            {/* Solution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Solution/Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                name="solution"
                value={formData.solution}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why the correct answer is correct..."
                disabled={loading}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter tags separated by commas (e.g., important, previous-year, tricky)"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tags help in organizing and filtering questions
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? "Adding Question..." : "Add Question"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddQuestion;
