import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
} from "firebase/firestore";
import toast, { messages } from "../../utils/toast";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { logAdminAction } from "../../utils/auditLog";
import logger from "../../utils/logger";

const AdminBookmarks = () => {
  const navigate = useNavigate();
  const { currentUser, userDetails } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [notes, setNotes] = useState({});

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(query(collection(db, "bookmarks")));
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const questionDocs = await Promise.all(
        docs.map((item) => getDoc(doc(db, "questions", item.questionId))),
      );
      const userDocs = await Promise.all(
        docs.map((item) => getDoc(doc(db, "users", item.userId))),
      );

      const merged = docs.map((item, index) => {
        const questionDoc = questionDocs[index];
        const userDoc = userDocs[index];
        return {
          ...item,
          question: questionDoc.exists()
            ? { id: questionDoc.id, ...questionDoc.data() }
            : null,
          user: userDoc.exists() ? userDoc.data() : null,
          reviewed: Boolean(item.reviewed),
        };
      });

      const sorted = [...merged].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setBookmarks(sorted);
      const noteMap = {};
      sorted.forEach((item) => {
        noteMap[item.id] = item.adminNote || "";
      });
      setNotes(noteMap);
    } catch (error) {
      logger.error("Error loading bookmarks:", error);
      toast.error(messages.ADMIN_BOOKMARKS_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (statusFilter === "all") {
      return bookmarks;
    }
    const shouldBeReviewed = statusFilter === "reviewed";
    return bookmarks.filter((item) => item.reviewed === shouldBeReviewed);
  }, [bookmarks, statusFilter]);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  const handleSaveNote = async (bookmarkId) => {
    const existing = bookmarks.find((item) => item.id === bookmarkId);
    const history = Array.isArray(existing?.adminNoteHistory)
      ? existing.adminNoteHistory
      : [];
    const noteText = (notes[bookmarkId] || "").trim();
    if (!noteText) {
      toast.error(messages.NOTE_REQUIRED);
      return;
    }
    try {
      setUpdatingId(bookmarkId);
      await updateDoc(doc(db, "bookmarks", bookmarkId), {
        adminNote: noteText,
        adminNoteUpdatedAt: new Date().toISOString(),
        adminNoteHistory: [
          ...history,
          {
            note: noteText,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.uid || "unknown",
          },
        ],
      });
      setBookmarks((prev) =>
        prev.map((item) =>
          item.id === bookmarkId
            ? {
                ...item,
                adminNote: noteText,
                adminNoteUpdatedAt: new Date().toISOString(),
                adminNoteHistory: [
                  ...history,
                  {
                    note: noteText,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.uid || "unknown",
                  },
                ],
              }
            : item,
        ),
      );
      toast.success(messages.NOTE_SAVED);
    } catch (error) {
      logger.error("Error saving note:", error);
      toast.error(messages.NOTE_SAVE_FAILED);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkReviewed = async (bookmarkId) => {
    try {
      setUpdatingId(bookmarkId);
      await updateDoc(doc(db, "bookmarks", bookmarkId), {
        reviewed: true,
        reviewedAt: new Date().toISOString(),
      });
      setBookmarks((prev) =>
        prev.map((item) =>
          item.id === bookmarkId ? { ...item, reviewed: true } : item,
        ),
      );
      logAdminAction({ adminId: userDetails?.userId, action: "reviewBookmark", targetId: bookmarkId });
      toast.success(messages.BOOKMARK_REVIEWED);
    } catch (error) {
      logger.error("Error updating bookmark:", error);
      toast.error(messages.BOOKMARK_UPDATE_FAILED);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bookmarkId) => {
    if (!window.confirm("Are you sure you want to delete this bookmark? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(bookmarkId);
      await deleteDoc(doc(db, "bookmarks", bookmarkId));
      setBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
      logAdminAction({ adminId: userDetails?.userId, action: "deleteBookmark", targetId: bookmarkId });
      toast.success(messages.BOOKMARK_DELETED);
    } catch (error) {
      logger.error("Error deleting bookmark:", error);
      toast.error(messages.BOOKMARK_DELETE_FAILED);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Bookmarks Review
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review saved questions and add admin notes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={fetchBookmarks}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No bookmarks found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.examType || "Exam"} -{" "}
                        {item.question?.subject || "Subject"} -{" "}
                        {item.question?.topic || "Topic"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Saved by {item.user?.name || item.userId}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        item.reviewed
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      {item.reviewed ? "reviewed" : "pending"}
                    </span>
                  </div>

                  {item.question ? (
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {item.question.questionText}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Question not found (may have been deleted).
                    </p>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Admin Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes[item.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Add internal notes about this bookmark..."
                    />
                  </div>

                  {Array.isArray(item.adminNoteHistory) &&
                    item.adminNoteHistory.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Note History
                        </p>
                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                          {item.adminNoteHistory
                            .slice()
                            .reverse()
                            .slice(0, 3)
                            .map((entry, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{entry.note}</span>
                                <span>{new Date(entry.updatedAt).toLocaleString()}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSaveNote(item.id)}
                      disabled={updatingId === item.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {updatingId === item.id ? "Saving..." : "Save Note"}
                    </button>
                    {!item.reviewed && (
                      <button
                        onClick={() => handleMarkReviewed(item.id)}
                        disabled={updatingId === item.id}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Delete this bookmark"
                    >
                      {deletingId === item.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookmarks;
