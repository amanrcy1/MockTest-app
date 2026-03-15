import { useCallback, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import toast, { messages } from '../utils/toast';
import { db } from '../config/firebase';

/**
 * Shared bookmark + error-report logic for test pages.
 *
 * @param {string} userId    – current user UID
 * @param {string} examType  – exam type string
 */
export const useBookmarks = (userId, examType) => {
  const [bookmarkMap, setBookmarkMap] = useState({});

  /** Fetch existing bookmarks into a questionId → bookmarkDocId map */
  const loadBookmarks = useCallback(async () => {
    if (!userId || !examType) return;
    const q = query(
      collection(db, 'bookmarks'),
      where('userId', '==', userId),
      where('examType', '==', examType)
    );
    const snapshot = await getDocs(q);
    const map = {};
    snapshot.forEach((docSnap) => {
      map[docSnap.data().questionId] = docSnap.id;
    });
    setBookmarkMap(map);
  }, [userId, examType]);

  /** Toggle bookmark for a question */
  const toggleBookmark = useCallback(
    async (questionId) => {
      if (!userId) return;
      const existingId = bookmarkMap[questionId];
      if (existingId) {
        await deleteDoc(doc(db, 'bookmarks', existingId));
        setBookmarkMap((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        toast.success(messages.BOOKMARK_REMOVED);
      } else {
        const docRef = await addDoc(collection(db, 'bookmarks'), {
          userId,
          questionId,
          examType,
          createdAt: new Date().toISOString(),
        });
        setBookmarkMap((prev) => ({ ...prev, [questionId]: docRef.id }));
        toast.success(messages.BOOKMARK_ADDED);
      }
    },
    [userId, examType, bookmarkMap]
  );

  return { bookmarkMap, loadBookmarks, toggleBookmark };
};

export default useBookmarks;
