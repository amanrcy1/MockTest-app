import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import toast, { messages } from "../../utils/toast";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { BottomNav } from "../../components";
import { TopNav } from "../../components";
import logger from "../../utils/logger";

// Expandable Question Card Component
const BookmarkCard = ({ item, index, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const question = item.question;

  const optionLabels = ["A", "B", "C", "D"];
  
  // Handle different options formats
  const getOptionsArray = () => {
    if (Array.isArray(question.options)) {
      return question.options;
    }
    if (question.options && typeof question.options === 'object') {
      // Options stored as {A: "...", B: "...", C: "...", D: "..."}
      return [question.options.A, question.options.B, question.options.C, question.options.D].filter(Boolean);
    }
    // Options stored as separate fields
    return [question.optionA, question.optionB, question.optionC, question.optionD].filter(Boolean);
  };

  // Handle different correctAnswer formats
  const getCorrectIndex = () => {
    const answer = question.correctAnswer;
    if (typeof answer === 'number') return answer;
    if (typeof answer === 'string') {
      const letterIndex = ['A', 'B', 'C', 'D'].indexOf(answer.toUpperCase());
      if (letterIndex !== -1) return letterIndex;
      const numIndex = parseInt(answer);
      if (!isNaN(numIndex)) return numIndex;
    }
    return -1;
  };

  const options = getOptionsArray();
  const correctIndex = getCorrectIndex();
  const explanation = question.solution || question.explanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg">
            {item.examType}
          </span>
          <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-lg">
            {question.subject}
          </span>
          <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg">
            {question.topic}
          </span>
        </div>

        {/* Question Text */}
        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed pr-8">
          {question.questionText}
        </p>

        {/* Expand/Collapse indicator */}
        <motion.div
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3" />

              {/* Options */}
              <div className="space-y-2">
                {options.map((option, optIndex) => {
                  const isCorrect = optIndex === correctIndex;
                  return (
                    <div
                      key={optIndex}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                        isCorrect
                          ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
                          : "bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isCorrect
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {optionLabels[optIndex]}
                      </span>
                      <span
                        className={`text-sm pt-0.5 ${
                          isCorrect
                            ? "text-green-800 dark:text-green-200 font-medium"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {option}
                      </span>
                      {isCorrect && (
                        <svg className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {explanation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Explanation</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    {explanation}
                  </p>
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove Bookmark
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Remove when collapsed */}
      {!isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Tap to view answer</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </motion.div>
  );
};

const Bookmarks = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [filterExam, setFilterExam] = useState("all");

  const fetchBookmarks = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    try {
      setLoading(true);
      const q = query(
        collection(db, "bookmarks"),
        where("userId", "==", currentUser.uid),
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const questionDocs = await Promise.all(
        docs.map((item) => getDoc(doc(db, "questions", item.questionId))),
      );

      const merged = docs.map((item, index) => {
        const questionDoc = questionDocs[index];
        return {
          ...item,
          question: questionDoc.exists()
            ? { id: questionDoc.id, ...questionDoc.data() }
            : null,
        };
      });

      setBookmarks(merged.filter((item) => item.question));
    } catch (error) {
      logger.error("Error fetching bookmarks:", error);
      toast.error(messages.BOOKMARKS_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (filterExam === "all") {
      return bookmarks;
    }
    return bookmarks.filter((item) => item.examType === filterExam);
  }, [bookmarks, filterExam]);

  const examOptions = useMemo(() => {
    const set = new Set(bookmarks.map((item) => item.examType).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [bookmarks]);

  const handleRemove = async (bookmarkId) => {
    try {
      await deleteDoc(doc(db, "bookmarks", bookmarkId));
      setBookmarks((prev) =>
        prev.filter((item) => item.id !== bookmarkId),
      );
      toast.success(messages.BOOKMARK_REMOVED);
    } catch (error) {
      logger.error("Error removing bookmark:", error);
      toast.error(messages.BOOKMARK_REMOVE_FAILED);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      <TopNav />

      {/* Header */}
      <header className="glass-card sticky top-0 md:top-14 z-40">
        <div className="px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/dashboard")}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                aria-label="Back"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Bookmarks</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Saved questions for review</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm"
              >
                {examOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Exams" : option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No bookmarks yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Save questions during tests to review later</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item, index) => (
              <BookmarkCard
                key={item.id}
                item={item}
                index={index}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Bookmarks;
