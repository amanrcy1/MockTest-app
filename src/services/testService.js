import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import { testSubmitLimiter } from '../utils/securityUtils';

/**
 * Save test result with rate limiting
 */
export const saveTestResult = async (testData) => {
  // Rate limiting check
  const userId = testData.userId;
  if (!testSubmitLimiter.canMakeRequest(userId)) {
    throw new Error('Too many test submissions. Wait before submitting again.');
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.TESTS), {
    ...testData,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * Get test by ID
 */
export const getTestById = async (testId) => {
  const docRef = doc(db, COLLECTIONS.TESTS, testId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

/**
 * Get user's test history
 */
export const getUserTestHistory = async (userId, options = {}) => {
  let q = query(
    collection(db, COLLECTIONS.TESTS),
    where('userId', '==', userId),
    where('completed', '==', true)
  );

  if (options.examType) {
    q = query(q, where('examType', '==', options.examType));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
};

/**
 * Get leaderboard data
 * @param {string} examType - The exam type to filter by
 * @param {Object} dateRange - Optional date range filter
 * @param {number} limitCount - Maximum number of results (default 100)
 */
export const getLeaderboard = async (examType, dateRange = null, limitCount = 100) => {
  let q = query(
    collection(db, COLLECTIONS.TESTS),
    where('examType', '==', examType),
    where('completed', '==', true),
    firestoreLimit(limitCount * 2) // Fetch more to account for duplicates per user
  );

  const snapshot = await getDocs(q);
  let tests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Filter by date range if provided
  if (dateRange?.start && dateRange?.end) {
    tests = tests.filter((test) => {
      const endTime = test.endTime ? new Date(test.endTime) : null;
      return endTime && endTime >= dateRange.start && endTime <= dateRange.end;
    });
  }

  // Get best score per user
  const bestByUser = new Map();
  tests.forEach((test) => {
    if (test.score == null) return;
    const existing = bestByUser.get(test.userId);
    if (
      !existing ||
      test.score > existing.score ||
      (test.score === existing.score &&
        test.timeTaken != null &&
        existing.timeTaken != null &&
        test.timeTaken < existing.timeTaken)
    ) {
      bestByUser.set(test.userId, test);
    }
  });

  // Sort by score (desc) then time (asc) and limit results
  return Array.from(bestByUser.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeTaken == null || b.timeTaken == null) return 0;
      return a.timeTaken - b.timeTaken;
    })
    .slice(0, limitCount); // Limit final results
};

/**
 * Get user stats
 */
export const getUserStats = async (userId) => {
  const q = query(
    collection(db, COLLECTIONS.TESTS),
    where('userId', '==', userId),
    where('completed', '==', true)
  );

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map((doc) => doc.data());

  const attempted = tests.length;
  const averageAccuracy =
    attempted > 0 ? tests.reduce((sum, t) => sum + Number(t.accuracy || 0), 0) / attempted : 0;
  const totalTimeTaken = tests.reduce((sum, t) => sum + (t.timeTaken || 0), 0);

  return {
    attempted,
    averageAccuracy,
    totalTimeTaken,
    tests,
  };
};
