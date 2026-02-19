import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import toast, { messages } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { logAdminAction } from "../../utils/auditLog";
import logger from "../../utils/logger";
import {
  EXAM_PATTERNS,
  getSubjectsByExam,
  DIFFICULTY_LEVELS,
} from "../../utils/examPatterns";

const ITEMS_PER_PAGE = 20;

const ManageQuestions = () => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    examType: "all",
    subject: "all",
    difficulty: "all",
    searchText: "",
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Fetch all questions
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "questions"));
      const questionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuestions(questionsData);
      setFilteredQuestions(questionsData);
      setLoading(false);
    } catch (error) {
      logger.error("Error fetching questions:", error);
      toast.error(messages.QUESTIONS_LOAD_FAILED);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...questions];

    // Filter by exam type
    if (filters.examType !== "all") {
      filtered = filtered.filter((q) => q.examType === filters.examType);
    }

    // Filter by subject
    if (filters.subject !== "all") {
      filtered = filtered.filter((q) => q.subject === filters.subject);
    }

    // Filter by difficulty
    if (filters.difficulty !== "all") {
      filtered = filtered.filter((q) => q.difficulty === filters.difficulty);
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.questionText.toLowerCase().includes(searchLower) ||
          q.topic.toLowerCase().includes(searchLower) ||
          (q.subtopic && q.subtopic.toLowerCase().includes(searchLower)),
      );
    }

    setFilteredQuestions(filtered);
  }, [filters, questions]);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Delete question
  const handleDelete = async (questionId) => {
    try {
      await deleteDoc(doc(db, "questions", questionId));
      logAdminAction({ adminId: userDetails?.userId, action: "deleteQuestion", targetId: questionId });
      toast.success(messages.QUESTION_DELETED);
      setShowDeleteModal(false);
      setSelectedQuestion(null);
      fetchQuestions(); // Refresh list
    } catch (error) {
      logger.error("Error deleting question:", error);
      toast.error(messages.QUESTION_DELETE_FAILED);
    }
  };

  // Open edit modal
  const openEditModal = (question) => {
    setSelectedQuestion(question);
    setShowEditModal(true);
  };

  // Open delete confirmation
  const openDeleteModal = (question) => {
    setSelectedQuestion(question);
    setShowDeleteModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Manage Questions
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View, Edit, and Delete Questions
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Exam Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exam Type
              </label>
              <select
                name="examType"
                value={filters.examType}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Exams</option>
                {Object.keys(EXAM_PATTERNS).map((key) => (
                  <option key={key} value={key}>
                    {EXAM_PATTERNS[key].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects</option>
                {filters.examType !== "all" &&
                  getSubjectsByExam(filters.examType).map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                name="difficulty"
                value={filters.difficulty}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Levels</option>
                {DIFFICULTY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                name="searchText"
                value={filters.searchText}
                onChange={handleFilterChange}
                placeholder="Search questions..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredQuestions.length} of {questions.length} questions
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              No questions found
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Try adjusting your filters or add new questions
            </p>
            <button
              onClick={() => navigate("/admin/add-question")}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Question
            </button>
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {paginatedQuestions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                {/* Question Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded">
                        {question.examType}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded">
                        {question.subject}
                      </span>
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold px-2 py-1 rounded">
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {question.topic}{" "}
                      {question.subtopic && `| ${question.subtopic}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(question)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(question)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="mb-4">
                  <p className="text-gray-800 dark:text-gray-200 font-medium">
                    Q{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}. {question.questionText}
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {["A", "B", "C", "D"].map((option) => (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border-2 ${
                        question.correctAnswer === option
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                      }`}
                    >
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{option}.</span>{" "}
                      <span className="text-gray-700 dark:text-gray-300">{question.options[option]}</span>
                      {question.correctAnswer === option && (
                        <span className="ml-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Solution */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Solution:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{question.solution}</p>
                </div>

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {question.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-semibold ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedQuestion && (
        <EditQuestionModal
          question={selectedQuestion}
          userDetails={userDetails}
          onClose={() => {
            setShowEditModal(false);
            setSelectedQuestion(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedQuestion(null);
            fetchQuestions();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Delete Question
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this question? This action cannot
              be undone.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                {selectedQuestion.questionText.substring(0, 100)}...
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedQuestion(null);
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedQuestion.id)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Question Modal Component
const EditQuestionModal = ({ question, userDetails, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    questionText: question.questionText,
    optionA: question.options.A,
    optionB: question.options.B,
    optionC: question.options.C,
    optionD: question.options.D,
    correctAnswer: question.correctAnswer,
    solution: question.solution,
    difficulty: question.difficulty,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatedData = {
        questionText: formData.questionText,
        options: {
          A: formData.optionA,
          B: formData.optionB,
          C: formData.optionC,
          D: formData.optionD,
        },
        correctAnswer: formData.correctAnswer,
        solution: formData.solution,
        difficulty: formData.difficulty,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "questions", question.id), updatedData);
      logAdminAction({ adminId: userDetails?.userId, action: "updateQuestion", targetId: question.id });
      toast.success(messages.QUESTION_UPDATED);
      onSave();
    } catch (error) {
      logger.error("Error updating question:", error);
      toast.error(messages.QUESTION_UPDATE_FAILED);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-3xl w-full my-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Edit Question</h2>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Text
            </label>
            <textarea
              name="questionText"
              value={formData.questionText}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Options */}
          {["A", "B", "C", "D"].map((option) => (
            <div key={option}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Option {option}
              </label>
              <input
                type="text"
                name={`option${option}`}
                value={formData[`option${option}`]}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          ))}

          {/* Correct Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correct Answer
            </label>
            <select
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Solution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solution
            </label>
            <textarea
              name="solution"
              value={formData.solution}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageQuestions;
