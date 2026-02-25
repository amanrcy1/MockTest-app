import { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
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
const AUTH_REDIRECT_INTENT_KEY = "auth.google.redirect.intent";

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
    "auth/unauthorized-domain": "This domain is not authorized in Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized domains.",
    "auth/operation-not-supported-in-this-environment": "Google login is blocked in this browser context. Try normal Chrome window.",
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

const isPermissionDenied = (error) =>
  error?.code === "permission-denied" || error?.code === "firestore/permission-denied";

const shouldPreferRedirectAuth = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  // In-app browsers (Facebook, Instagram, Line, WebView) always need redirect
  if (/FBAN|FBAV|Instagram|Line|wv\)/i.test(ua)) return true;
  // Standalone PWA mode — popups are unreliable
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  // ALL mobile devices — popups are frequently blocked or cause UX issues
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) return true;
  return false;
};

// ============================================
// AUTH PROVIDER
// ============================================

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(() => {
    return !!sessionStorage.getItem(AUTH_REDIRECT_INTENT_KEY);
  });

  // Track whether redirect processing is done so onAuthStateChanged can coordinate
  const redirectProcessedRef = useRef(!sessionStorage.getItem(AUTH_REDIRECT_INTENT_KEY));

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

  const ensureGoogleUserProfile = useCallback(async (user) => {
    const googleEmail = user?.email;
    if (!googleEmail) {
      await signOut(auth);
      throw new Error("Could not retrieve email from Google.");
    }

    const userDocRef = doc(db, "users", user.uid);
    let userDoc = null;
    try {
      userDoc = await getDoc(userDocRef);
    } catch (readError) {
      if (!isPermissionDenied(readError)) throw readError;
      logger.warn("Permission denied reading user profile, attempting create/merge fallback.");
    }

    if (userDoc?.exists()) {
      const userData = userDoc.data();
      await setDoc(userDocRef, {
        lastLoginAt: new Date().toISOString(),
        loginCount: (userData.loginCount || 0) + 1,
      }, { merge: true });
      await fetchUserDetails(user.uid);
      return { isNewUser: false };
    }

    const displayName = user.displayName || googleEmail.split("@")[0];
    const createdDocs = [];

    try {
      const emailKey = sanitizeFirestoreKey(googleEmail.toLowerCase());
      const emailDocRef = doc(db, "emails", emailKey);
      try {
        await setDoc(emailDocRef, {
          userId: user.uid,
          email: googleEmail,
          createdAt: new Date().toISOString(),
        });
        createdDocs.push({ ref: emailDocRef, type: "email" });
      } catch (emailError) {
        if (!isPermissionDenied(emailError)) throw emailError;
        logger.warn("Email mapping write denied by rules, continuing without /emails mapping.");
      }

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
      for (const docInfo of createdDocs) {
        try { await deleteDoc(docInfo.ref); } catch { /* best effort */ }
      }
      throw docError;
    }

    await fetchUserDetails(user.uid);
    logger.info("Google sign-in new user created:", { userId: user.uid });
    return { isNewUser: true };
  }, [fetchUserDetails]);

  // ------------------------------------------
  // LOGIN WITH GOOGLE (sign-in / sign-up)
  // ------------------------------------------
  const loginWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      if (shouldPreferRedirectAuth()) {
        sessionStorage.setItem(AUTH_REDIRECT_INTENT_KEY, "1");
        await signInWithRedirect(auth, provider);
        return { success: true, redirected: true };
      }

      try {
        const result = await signInWithPopup(auth, provider);
        const profileResult = await ensureGoogleUserProfile(result.user);
        return { success: true, isNewUser: profileResult.isNewUser };
      } catch (popupError) {
        const popupFallbackCodes = new Set([
          "auth/popup-blocked",
          "auth/popup-closed-by-user",
          "auth/cancelled-popup-request",
          "auth/operation-not-supported-in-this-environment",
        ]);

        if (!popupFallbackCodes.has(popupError?.code)) {
          throw popupError;
        }

        sessionStorage.setItem(AUTH_REDIRECT_INTENT_KEY, "1");
        await signInWithRedirect(auth, provider);
        return { success: true, redirected: true };
      }
    } catch (error) {
      logger.error("Google sign-in error:", error);
      if (error.code === "auth/cancelled-popup-request") {
        return { success: false, error: "Sign-in cancelled." };
      }
      const code = error?.code ? ` [${error.code}]` : "";
      return { success: false, error: `${getErrorMessage(error)}${code}` };
    }
  }, [ensureGoogleUserProfile]);

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

  useEffect(() => {
    const setupPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (localErr) {
        logger.warn("Local auth persistence unavailable, falling back to session persistence.", localErr);
        try {
          await setPersistence(auth, browserSessionPersistence);
        } catch (sessionErr) {
          logger.error("Failed to configure Firebase auth persistence.", sessionErr);
        }
      }
    };

    setupPersistence();
  }, []);

  useEffect(() => {
    // Only process redirect if we actually initiated one
    if (!sessionStorage.getItem(AUTH_REDIRECT_INTENT_KEY)) {
      setRedirectLoading(false);
      return;
    }

    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await ensureGoogleUserProfile(result.user);
        }
      } catch (error) {
        logger.error("Google redirect result error:", error);
        try {
          const { toast } = await import("react-toastify");
          const code = error?.code ? ` [${error.code}]` : "";
          toast.error(`${getErrorMessage(error)}${code}`);
        } catch {
          // noop
        }
      } finally {
        redirectProcessedRef.current = true;
        sessionStorage.removeItem(AUTH_REDIRECT_INTENT_KEY);
        // If onAuthStateChanged already fired with a user but deferred,
        // fetch their details now that profile is guaranteed to exist
        if (auth.currentUser) {
          await fetchUserDetails(auth.currentUser.uid);
        }
        setRedirectLoading(false);
      }
    };

    // Safety timeout — if redirect result takes too long, unblock the UI
    const timeout = setTimeout(() => {
      redirectProcessedRef.current = true;
      sessionStorage.removeItem(AUTH_REDIRECT_INTENT_KEY);
      // If auth already resolved a user but we deferred, fetch now
      if (auth.currentUser) {
        fetchUserDetails(auth.currentUser.uid).finally(() => setRedirectLoading(false));
      } else {
        setRedirectLoading(false);
      }
    }, 8000);

    processRedirectResult().then(() => clearTimeout(timeout));
  }, [ensureGoogleUserProfile, fetchUserDetails]);

  // ------------------------------------------
  // AUTH STATE LISTENER
  // ------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // If a redirect is still being processed, don't fetch yet —
        // processRedirectResult will handle profile creation + fetch.
        // We'll get called again or redirectLoading will unblock the UI.
        if (!redirectProcessedRef.current) {
          logger.info("Auth state changed during redirect processing, deferring fetch");
          setAuthLoading(false);
          return;
        }
        await fetchUserDetails(user.uid);
      } else {
        setUserDetails(null);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [fetchUserDetails]);

  // ------------------------------------------
  // CONTEXT VALUE
  // ------------------------------------------
  const loading = authLoading || redirectLoading;

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
