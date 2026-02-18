import { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import logger from "../utils/logger";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

// ============================================
// CONSTANTS & HELPERS
// ============================================

/**
 * Map Firebase error codes to user-friendly messages.
 */
const getErrorMessage = (error) => {
  const errorMessages = {
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
    "auth/popup-blocked": "Popup was blocked. Please allow popups and try again.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
    "auth/cancelled-popup-request": "Sign-in cancelled.",
    "permission-denied": "You do not have permission to perform this action.",
    "unavailable": "Service temporarily unavailable. Please try again later.",
  };

  return errorMessages[error.code] || "An unexpected error occurred. Please try again.";
};

/**
 * Sanitize Firestore key — strip characters that are illegal in doc IDs.
 */
const sanitizeFirestoreKey = (value) => {
  return value.replace(/[.#$[\]/]/g, "_");
};

// ============================================
// AUTH PROVIDER
// ============================================

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------
  // Fetch user details from Firestore
  // ------------------------------------------
  const fetchUserDetails = useCallback(async (uid, retries = 3) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserDetails(data);
        logger.info("User details fetched:", { name: data.name });
        return data;
      }

      // Retry for newly registered users where Firestore write may still be propagating
      if (retries > 0) {
        logger.info(`User doc not found, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 500));
        return await fetchUserDetails(uid, retries - 1);
      }

      logger.warn("User document not found after all retries");
      return null;
    } catch (error) {
      logger.error("Error fetching user details:", error);
      return null;
    }
  }, []);

  // ------------------------------------------
  // LOGIN WITH GOOGLE (sign-in / sign-up)
  // ------------------------------------------
  const loginWithGoogle = useCallback(async () => {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const googleEmail = user.email;

        if (!googleEmail) {
          await signOut(auth);
          return { success: false, error: "Could not retrieve email from Google." };
        }

        // Check if user profile already exists
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          // Existing user — update last login
          const userData = userDoc.data();
          await setDoc(doc(db, "users", user.uid), {
            lastLoginAt: new Date().toISOString(),
            loginCount: (userData.loginCount || 0) + 1,
          }, { merge: true });
          await fetchUserDetails(user.uid);
          return { success: true, isNewUser: false };
        }

        // New user — create profile with Google info
        const displayName = user.displayName || googleEmail.split("@")[0];

        const createdDocs = [];

        try {
          // Create email mapping
          const emailKey = sanitizeFirestoreKey(googleEmail.toLowerCase());
          const emailDocRef = doc(db, "emails", emailKey);
          await setDoc(emailDocRef, {
            userId: user.uid,
            email: googleEmail,
            createdAt: new Date().toISOString(),
          });
          createdDocs.push({ ref: emailDocRef, type: "email" });

          // Create user profile
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, {
            userId: user.uid,
            name: displayName,
            email: googleEmail,
            photoURL: user.photoURL || null,
            targetExam: "CDS",
            isAdmin: false,
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            loginCount: 1,
          });
          createdDocs.push({ ref: userDocRef, type: "user" });
        } catch (docError) {
          // Rollback created docs on failure
          for (const docInfo of createdDocs) {
            try { await deleteDoc(docInfo.ref); } catch { /* best effort */ }
          }
          throw docError;
        }

        await fetchUserDetails(user.uid);
        logger.info("Google sign-in new user created:", { userId: user.uid });
        return { success: true, isNewUser: true };
      } catch (error) {
        logger.error("Google sign-in error:", error);
        if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
          return { success: false, error: "Sign-in cancelled." };
        }
        return { success: false, error: getErrorMessage(error) };
      }
    }, [fetchUserDetails]);

  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUserDetails(null);
      localStorage.removeItem("rememberMe");
      return { success: true };
    } catch (error) {
      logger.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  // ------------------------------------------
  // REFRESH USER DETAILS
  // ------------------------------------------
  const refreshUserDetails = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await fetchUserDetails(auth.currentUser.uid);
  }, [fetchUserDetails]);

  // ------------------------------------------
  // SESSION TIMEOUT (auto-logout after 30 min inactivity)
  // ------------------------------------------
  const handleSessionTimeout = useCallback(async () => {
    logger.info("Session timed out due to inactivity");
    await signOut(auth);
    setUserDetails(null);
    localStorage.removeItem("rememberMe");
    const { toast } = await import("react-toastify");
    toast.info("You were logged out due to inactivity.");
  }, []);

  useSessionTimeout(handleSessionTimeout, !!currentUser);

  // ------------------------------------------
  // AUTH STATE LISTENER
  // ------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserDetails(user.uid);
      } else {
        setUserDetails(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserDetails]);

  // ------------------------------------------
  // CONTEXT VALUE
  // ------------------------------------------
  const value = useMemo(() => ({
    currentUser,
    userDetails,
    loading,
    logout,
    loginWithGoogle,
    refreshUserDetails,
  }), [currentUser, userDetails, loading, logout, loginWithGoogle, refreshUserDetails]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
