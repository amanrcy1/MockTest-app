import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants";

/**
 * Get user bookmarks
 */
export const getUserBookmarks = async (userId, examType = null) => {
  let q = query(
    collection(db, COLLECTIONS.BOOKMARKS),
    where("userId", "==", userId)
  );

  if (examType) {
    q = query(q, where("examType", "==", examType));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get bookmark map (questionId -> bookmarkId)
 */
export const getBookmarkMap = async (userId, examType) => {
  const bookmarks = await getUserBookmarks(userId, examType);
  const map = {};
  bookmarks.forEach((b) => {
    map[b.questionId] = b.id;
  });
  return map;
};

/**
 * Add bookmark
 */
export const addBookmark = async (userId, questionId, examType, note = "") => {
  const docRef = await addDoc(collection(db, COLLECTIONS.BOOKMARKS), {
    userId,
    questionId,
    examType,
    note,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * Remove bookmark
 */
export const removeBookmark = async (bookmarkId) => {
  await deleteDoc(doc(db, COLLECTIONS.BOOKMARKS, bookmarkId));
};

/**
 * Toggle bookmark
 */
export const toggleBookmark = async (userId, questionId, examType, existingId = null) => {
  if (existingId) {
    await removeBookmark(existingId);
    return { action: "removed", id: null };
  }
  
  const id = await addBookmark(userId, questionId, examType);
  return { action: "added", id };
};

/**
 * Submit error report
 */
export const submitErrorReport = async (userId, questionId, examType, reportText) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.ERROR_REPORTS), {
    userId,
    questionId,
    examType,
    reportText: reportText.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * Get error reports (admin)
 */
export const getErrorReports = async (status = null) => {
  let q = collection(db, COLLECTIONS.ERROR_REPORTS);
  
  if (status) {
    q = query(q, where("status", "==", status));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
