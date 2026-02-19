import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants";
import { logError } from "../utils/errorTracking";

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Limit cache entries

/**
 * Get cached data or fetch new
 */
const getCached = (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  
  return fetchFn().then((data) => {
    // Implement cache size limit (LRU-style)
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
};

/**
 * Clear cache for a specific key or all
 */
export const clearQuestionCache = (key = null) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

/**
 * Fetch questions by exam type (with caching)
 */
export const fetchQuestionsByExam = async (examType) => {
  const cacheKey = `questions_${examType}`;
  
  return getCached(cacheKey, async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("examType", "==", examType)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logError(error, { context: 'fetchQuestionsByExam', examType });
      throw error;
    }
  });
};

/**
 * Fetch questions with filters
 */
export const fetchQuestionsWithFilters = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.QUESTIONS);
  const constraints = [];

  if (filters.examType) {
    constraints.push(where("examType", "==", filters.examType));
  }
  if (filters.subject) {
    constraints.push(where("subject", "==", filters.subject));
  }
  if (filters.difficulty) {
    constraints.push(where("difficulty", "==", filters.difficulty));
  }
  if (filters.limit) {
    constraints.push(limit(filters.limit));
  }

  if (constraints.length > 0) {
    q = query(q, ...constraints);
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get question by ID
 */
export const getQuestionById = async (questionId) => {
  const docRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

/**
 * Add a new question
 */
export const addQuestion = async (questionData) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
    ...questionData,
    createdAt: new Date().toISOString(),
  });
  
  // Clear cache when adding new question
  clearQuestionCache();
  
  return docRef.id;
};

/**
 * Update a question
 */
export const updateQuestion = async (questionId, updates) => {
  const docRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  // Clear cache when updating question
  clearQuestionCache();
};

/**
 * Delete a question
 */
export const deleteQuestion = async (questionId) => {
  await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, questionId));
  
  // Clear cache when deleting question
  clearQuestionCache();
};

/**
 * Get question counts by exam type (optimized with server-side aggregation)
 * Uses a separate questionStats collection that's updated via Cloud Functions
 */
export const getQuestionCountsByExam = async () => {
  const cacheKey = 'question_counts_all';
  
  return getCached(cacheKey, async () => {
    try {
      // Try to get from stats collection first (requires Cloud Function setup)
      const statsDoc = await getDoc(doc(db, 'questionStats', 'counts'));
      if (statsDoc.exists()) {
        return statsDoc.data();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.warn('Stats collection not available, falling back to manual count');
      }
    }
    
    // Fallback: Manual count (less efficient but works without Cloud Functions)
    const snapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS));
    const counts = {};
    
    snapshot.forEach((doc) => {
      const examType = doc.data().examType;
      counts[examType] = (counts[examType] || 0) + 1;
    });
    
    return counts;
  });
};
