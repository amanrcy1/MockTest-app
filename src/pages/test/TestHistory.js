import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import toast, { messages } from "../../utils/toast";
import { motion } from "framer-motion";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { BottomNav } from "../../components";
import { TopNav } from "../../components";
import { TestHistorySkeleton } from "../../components/ui/LoadingSkeleton";
import logger from "../../utils/logger";

const TestHistory = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "tests"),
          where("userId", "==", currentUser.uid),
          where("completed", "==", true),
          orderBy("endTime", "desc"),
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTests(items);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchHistory();
    }
  }, [currentUser]);

  const handleViewResult = async (test) => {
    if (!test.questions || test.questions.length === 0) {
      toast.error(messages.TEST_DETAILS_INCOMPLETE);
      return;
    }

    try {
      setLoadingTestId(test.id);
      const questionDocs = await Promise.all(
        test.questions.map((questionId) =>
          getDoc(doc(db, "questions", questionId)),
        ),
      );
      const questions = questionDocs
        .filter((docSnap) => docSnap.exists())
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      navigate("/test/result", {
        state: {
          questions,
          responses: test.responses || [],
          examType: test.examType,
          testMode: test.testMode || "mock",
        },
      });
    } catch (error) {
      logger.error("Error loading test result:", error);
      toast.error(messages.TEST_RESULT_LOAD_FAILED);
    } finally {
      setLoadingTestId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-0">
      <TopNav />
      {/* Header - Mobile */}
      <header className="bg-white dark:bg-gray-900 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 md:hidden">
        <div className="px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Back"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Test History</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Your past attempts</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Header - Desktop */}
      <div className="hidden md:block px-4 pt-6 pb-2 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your past attempts</p>
      </div>

      <main className="px-4 py-4 max-w-5xl mx-auto">
        {loading ? (
          <TestHistorySkeleton />
        ) : tests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No tests completed yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Start a test to see your history here</p>
            <button
              onClick={() => navigate("/test-selection")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start a Test
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg">
                          {test.examType}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg capitalize">
                          {test.testMode || "mock"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {test.endTime ? new Date(test.endTime).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : "Date not available"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{test.score?.toFixed(1) ?? "N/A"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">score</p>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{test.accuracy ?? "N/A"}%</span>
                    </div>
                    <button
                      onClick={() => handleViewResult(test)}
                      disabled={loadingTestId === test.id}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {loadingTestId === test.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Loading
                        </>
                      ) : (
                        <>
                          View
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default TestHistory;
