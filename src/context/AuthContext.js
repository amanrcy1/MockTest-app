import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  linkWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { authLimiter } from "../utils/securityUtils";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import logger from "../utils/logger";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

// ============================================
// CONSTANTS & HELPERS
// ============================================

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_EMAIL_DOMAIN = "@upscmocktest.local";

/**
 * Map Firebase error codes to user-friendly messages.
 * Intentionally vague for auth errors to prevent user enumeration.
 */
const getErrorMessage = (error) => {
  const errorMessages = {
    "auth/email-already-in-use": "Registration failed. Please try a different username or email.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols.",
    "auth/user-not-found": "Invalid credentials. Please check your username/email and password.",
    "auth/wrong-password": "Invalid credentials. Please check your username/email and password.",
    "auth/invalid-email": "Invalid credentials. Please check your username/email and password.",
    "auth/invalid-credential": "Invalid credentials. Please check your username/email and password.",
    "auth/too-many-requests": "Too many failed attempts. Please wait a few minutes and try again.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
    "auth/operation-not-allowed": "This operation is not allowed. Please contact support.",
    "permission-denied": "You do not have permission to perform this action.",
    "unavailable": "Service temporarily unavailable. Please try again later.",
  };

  return errorMessages[error.code] || "An unexpected error occurred. Please try again.";
};

/**
 * Normalize username: trim + lowercase. Only allow safe characters.
 */
const normalizeUsername = (value) => {
  return value.trim().toLowerCase();
};

/**
 * Validate username format.
 */
const validateUsername = (username) => {
  if (!username || username.length < 3 || username.length > 20) {
    return "Username must be 3-20 characters.";
  }
  if (!USERNAME_REGEX.test(username)) {
    return "Username can only contain letters, numbers, and underscores.";
  }
  return null;
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
        logger.info("User details fetched:", { username: data.username, name: data.name });
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
  // REGISTER
  // ------------------------------------------
  const register = useCallback(async (username, name, email, password, targetExam) => {
    // --- Input validation ---
    const usernameError = validateUsername(username);
    if (usernameError) return { success: false, error: usernameError };

    if (!name || name.trim().length < 1 || name.trim().length > 100) {
      return { success: false, error: "Name must be 1-100 characters." };
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    // --- Rate limiting ---
    const rateLimitKey = email || username;
    if (!authLimiter.canMakeRequest(rateLimitKey)) {
      return { success: false, error: "Too many registration attempts. Please wait a few minutes." };
    }

    const usernameKey = normalizeUsername(username);
    const actualEmail = email || `${usernameKey}${LOCAL_EMAIL_DOMAIN}`;
    const hasRealEmail = !!email;

    let userCredential = null;
    const createdDocs = [];

    try {
      // --- Step 1: Create Firebase Auth user FIRST ---
      // This must happen before any Firestore writes because our security
      // rules require `request.auth != null` (isSignedIn) for all writes.
      userCredential = await createUserWithEmailAndPassword(auth, actualEmail, password);
      const user = userCredential.user;

      // --- Step 2: Atomic username reservation via Firestore transaction ---
      // Now that we're authenticated, Firestore rules will allow the write.
      const usernameDocRef = doc(db, "usernames", usernameKey);

      const conflict = await runTransaction(db, async (transaction) => {
        const usernameSnap = await transaction.get(usernameDocRef);
        if (usernameSnap.exists()) return "username_taken";

        // If real email provided, check email uniqueness too
        if (hasRealEmail) {
          const emailKey = sanitizeFirestoreKey(email.toLowerCase());
          const emailSnap = await transaction.get(doc(db, "emails", emailKey));
          if (emailSnap.exists()) return "email_taken";
        }

        // Reserve the username with the real userId
        transaction.set(usernameDocRef, {
          userId: user.uid,
          username: username,
          email: actualEmail,
          hasRealEmail,
          createdAt: new Date().toISOString(),
        });

        return false;
      });

      if (conflict === "username_taken") {
        // Rollback: delete the auth user we just created
        await user.delete();
        return { success: false, error: "Username already exists." };
      }
      if (conflict === "email_taken") {
        await user.delete();
        return { success: false, error: "This email is already registered. Please login instead." };
      }

      // Username reserved successfully. Track for rollback.
      createdDocs.push({ ref: usernameDocRef, type: "username" });

      // --- Step 3: Create remaining Firestore documents ---
      // Email mapping (only for real emails)
      if (hasRealEmail) {
        const emailKey = sanitizeFirestoreKey(email.toLowerCase());
        const emailDocRef = doc(db, "emails", emailKey);
        await setDoc(emailDocRef, {
          userId: user.uid,
          email: email,
          createdAt: new Date().toISOString(),
        });
        createdDocs.push({ ref: emailDocRef, type: "email" });
      }

      // User profile
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        userId: user.uid,
        username: username,
        name: name.trim(),
        email: actualEmail,
        hasRealEmail,
        targetExam,
        isAdmin: false,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        loginCount: 0,
      });
      createdDocs.push({ ref: userDocRef, type: "user" });

      logger.info("User registered:", { userId: user.uid, username, hasRealEmail });

      return {
        success: true,
        message: hasRealEmail
          ? "Registration successful! Welcome!"
          : "Registration successful! Add your email later for account recovery.",
      };
    } catch (error) {
      logger.error("Registration error:", error);

      // --- Rollback all created Firestore docs ---
      for (const docInfo of createdDocs) {
        try {
          await deleteDoc(docInfo.ref);
          logger.info(`Rolled back ${docInfo.type} document`);
        } catch (delErr) {
          logger.error(`Failed to rollback ${docInfo.type}:`, delErr);
        }
      }

      // Rollback Firebase Auth user
      if (userCredential?.user) {
        try {
          await userCredential.user.delete();
          logger.info("Rolled back Firebase Auth user");
        } catch (delErr) {
          logger.error("Failed to delete Firebase Auth user:", delErr);
        }
      }

      return { success: false, error: getErrorMessage(error) };
    }
  }, []);

  // ------------------------------------------
  // LOGIN
  // ------------------------------------------
  const login = useCallback(async (usernameOrEmail, password, rememberMe = false) => {
    if (!usernameOrEmail || !password) {
      return { success: false, error: "Please enter your username/email and password." };
    }

    // --- Rate limiting ---
    if (!authLimiter.canMakeRequest(usernameOrEmail)) {
      return { success: false, error: "Too many login attempts. Please wait a few minutes and try again." };
    }

    try {
      let email = usernameOrEmail;
      let isUsernameLogin = false;
      let expectedUserId = null;

      // Determine if input is username or email
      if (!usernameOrEmail.includes("@")) {
        isUsernameLogin = true;
        const usernameKey = normalizeUsername(usernameOrEmail);

        // Validate format before hitting Firestore
        if (!USERNAME_REGEX.test(usernameKey)) {
          return { success: false, error: "Invalid credentials. Please check your username/email and password." };
        }

        const usernameDoc = await getDoc(doc(db, "usernames", usernameKey));
        if (usernameDoc.exists()) {
          const data = usernameDoc.data();
          email = data.email;
          expectedUserId = data.userId;
        } else {
          // Username not found — use a dummy email so Firebase Auth returns
          // the same generic error as a wrong password (prevents user enumeration)
          email = `${usernameKey}${LOCAL_EMAIL_DOMAIN}`;
        }
      }

      // --- Authenticate with Firebase ---
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- Post-auth identity verification ---
      // If we logged in via username, verify the authenticated UID matches
      // the userId stored in the username mapping. This prevents the bug where
      // a corrupted username doc points to the wrong user's email.
      if (isUsernameLogin && expectedUserId && expectedUserId !== "__pending__") {
        if (user.uid !== expectedUserId) {
          logger.error("SECURITY: UID mismatch after login", {
            expectedUserId,
            actualUid: user.uid,
            usernameOrEmail,
          });
          await signOut(auth);
          return { success: false, error: "Account data inconsistency detected. Please contact support." };
        }
      }

      // --- Fetch user profile and verify it matches ---
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;

      if (!userData) {
        logger.error("User profile missing for authenticated user:", user.uid);
        await signOut(auth);
        return { success: false, error: "Account profile not found. Please contact support." };
      }

      // If username login, verify the profile's username matches what was typed
      if (isUsernameLogin) {
        const profileUsername = normalizeUsername(userData.username || "");
        const inputUsername = normalizeUsername(usernameOrEmail);
        if (profileUsername !== inputUsername) {
          logger.error("SECURITY: Username mismatch", {
            profileUsername,
            inputUsername,
            uid: user.uid,
          });
          await signOut(auth);
          return { success: false, error: "Account data inconsistency detected. Please contact support." };
        }
      }

      // --- Email verification check ---
      if (userData.hasRealEmail && !isUsernameLogin && !user.emailVerified) {
        await signOut(auth);
        return {
          success: false,
          error: "Please verify your email before logging in with email. You can login with your username instead.",
          needsVerification: true,
          email: user.email,
        };
      }

      // --- Update login stats (non-blocking, don't fail login if this errors) ---
      try {
        await setDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          loginCount: (userData.loginCount || 0) + 1,
        }, { merge: true });
      } catch (updateError) {
        logger.error("Error updating login stats:", updateError);
      }

      // Remember me
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      return { success: true };
    } catch (error) {
      logger.error("Login error:", error);
      return { success: false, error: getErrorMessage(error) };
    }
  }, []);

  // ------------------------------------------
  // PASSWORD RESET
  // ------------------------------------------
  const requestPasswordReset = useCallback(async (email) => {
    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    try {
      const emailKey = sanitizeFirestoreKey(email.toLowerCase());
      const emailDocRef = doc(db, "emails", emailKey);
      const emailSnapshot = await getDoc(emailDocRef);

      if (!emailSnapshot.exists()) {
        // Don't reveal whether the email exists — return success either way
        // to prevent user enumeration
        return { success: true };
      }

      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      logger.error("Password reset error:", error);
      // Still return success to prevent enumeration
      return { success: true };
    }
  }, []);

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
  // SEND VERIFICATION EMAIL
  // ------------------------------------------
  const sendVerificationEmail = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: "No authenticated user." };
      }
      await sendEmailVerification(auth.currentUser);
      return { success: true, message: "Verification email sent! Please check your inbox." };
    } catch (error) {
      logger.error("Email verification error:", error);
      if (error.code === "auth/too-many-requests") {
        return { success: false, error: "Please wait before requesting another email." };
      }
      return { success: false, error: error.message };
    }
  }, []);

  // ------------------------------------------
  // UPDATE USER EMAIL
  // ------------------------------------------
  const updateUserEmail = useCallback(async (newEmail) => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: "No authenticated user." };
      }

      if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
        return { success: false, error: "Please enter a valid email address." };
      }

      const { updateEmail } = await import("firebase/auth");

      const newEmailKey = sanitizeFirestoreKey(newEmail.toLowerCase());
      const newEmailDocRef = doc(db, "emails", newEmailKey);
      const emailSnapshot = await getDoc(newEmailDocRef);

      if (emailSnapshot.exists() && emailSnapshot.data().userId !== auth.currentUser.uid) {
        return { success: false, error: "This email is already in use." };
      }

      // Update Firebase Auth email
      await updateEmail(auth.currentUser, newEmail);
      await sendEmailVerification(auth.currentUser);

      // Clean up old email mapping if it exists
      if (userDetails?.email && userDetails.email !== newEmail) {
        const oldEmailKey = sanitizeFirestoreKey(userDetails.email.toLowerCase());
        if (!userDetails.email.endsWith(LOCAL_EMAIL_DOMAIN)) {
          try {
            await deleteDoc(doc(db, "emails", oldEmailKey));
          } catch (delErr) {
            logger.error("Failed to clean up old email mapping:", delErr);
          }
        }
      }

      // Update user profile
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, {
        email: newEmail,
        hasRealEmail: true,
        emailVerified: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Create new email mapping
      await setDoc(newEmailDocRef, {
        userId: auth.currentUser.uid,
        email: newEmail,
        updatedAt: new Date().toISOString(),
      });

      // Update username mapping to point to new email
      if (userDetails?.username) {
        const usernameKey = normalizeUsername(userDetails.username);
        const usernameDocRef = doc(db, "usernames", usernameKey);
        await setDoc(usernameDocRef, {
          email: newEmail,
          hasRealEmail: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      return {
        success: true,
        message: "Email updated! Please verify your new email address.",
      };
    } catch (error) {
      logger.error("Email update error:", error);
      if (error.code === "auth/requires-recent-login") {
        return {
          success: false,
          error: "For security, please log out and log back in before changing your email.",
          requiresReauth: true,
        };
      }
      return { success: false, error: getErrorMessage(error) };
    }
  }, [userDetails]);

  // ------------------------------------------
  // LINK GOOGLE ACCOUNT (for adding email via Google Sign-In)
  // ------------------------------------------
  const linkGoogleEmail = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: "No authenticated user." };
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await linkWithPopup(auth.currentUser, provider);
      const googleEmail = result.user.email;

      if (!googleEmail) {
        return { success: false, error: "Could not retrieve email from Google account." };
      }

      // Check if this email is already used by another account
      const emailKey = sanitizeFirestoreKey(googleEmail.toLowerCase());
      const emailDocRef = doc(db, "emails", emailKey);
      const emailSnapshot = await getDoc(emailDocRef);

      if (emailSnapshot.exists() && emailSnapshot.data().userId !== auth.currentUser.uid) {
        return { success: false, error: "This email is already linked to another account." };
      }

      // Clean up old local email mapping if it existed
      if (userDetails?.email && userDetails.email.endsWith(LOCAL_EMAIL_DOMAIN)) {
        // No email doc to clean up for local emails
      } else if (userDetails?.email && userDetails.email !== googleEmail) {
        const oldEmailKey = sanitizeFirestoreKey(userDetails.email.toLowerCase());
        try {
          await deleteDoc(doc(db, "emails", oldEmailKey));
        } catch (delErr) {
          logger.error("Failed to clean up old email mapping:", delErr);
        }
      }

      // Create/update email mapping
      await setDoc(emailDocRef, {
        userId: auth.currentUser.uid,
        email: googleEmail,
        updatedAt: new Date().toISOString(),
      });

      // Update user profile
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, {
        email: googleEmail,
        hasRealEmail: true,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update username mapping
      if (userDetails?.username) {
        const usernameKey = normalizeUsername(userDetails.username);
        const usernameDocRef = doc(db, "usernames", usernameKey);
        await setDoc(usernameDocRef, {
          email: googleEmail,
          hasRealEmail: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      // Refresh user details to reflect changes
      await fetchUserDetails(auth.currentUser.uid);

      logger.info("Google account linked successfully:", { email: googleEmail });
      return { success: true, email: googleEmail };
    } catch (error) {
      logger.error("Google link error:", error);

      if (error.code === "auth/credential-already-in-use") {
        return { success: false, error: "This Google account is already linked to a different account." };
      }
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        return { success: false, error: "Sign-in cancelled." };
      }
      if (error.code === "auth/popup-blocked") {
        return { success: false, error: "Popup was blocked. Please allow popups and try again." };
      }

      return { success: false, error: getErrorMessage(error) };
    }
  }, [userDetails, fetchUserDetails]);

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
    // Toast will show after redirect since ToastContainer is in App
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
    register,
    login,
    logout,
    requestPasswordReset,
    sendVerificationEmail,
    updateUserEmail,
    linkGoogleEmail,
    refreshUserDetails,
  }), [currentUser, userDetails, loading, register, login, logout, requestPasswordReset, sendVerificationEmail, updateUserEmail, linkGoogleEmail, refreshUserDetails]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
