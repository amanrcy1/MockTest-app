import { collection, doc, getDocs, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

/**
 * Create user profile
 */
export const createUserProfile = async (userId, userData) => {
  await setDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...userData,
    userId,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    loginCount: 0,
  });
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Update login stats
 */
export const updateLoginStats = async (userId) => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const currentCount = docSnap.data().loginCount || 0;
    await updateDoc(docRef, {
      lastLoginAt: new Date().toISOString(),
      loginCount: currentCount + 1,
    });
  }
};

/**
 * Get all users (admin)
 */
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Toggle admin status
 */
export const toggleAdminStatus = async (userId, isAdmin) => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(docRef, { isAdmin });
};
