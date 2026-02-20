import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

/**
 * Firebase configuration
 * SECURITY: All values must come from environment variables
 * Create a .env file in project root with these values
 */
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
];

// Check for required environment variables
const missing = requiredEnvVars.filter(key => !import.meta.env[key]);
if (missing.length > 0) {
  const errorMsg = `Missing Firebase environment variables: ${missing.join(', ')}`;
  
  if (import.meta.env.PROD) {
    // In production, throw error to prevent app from running with missing config
    throw new Error(errorMsg);
  } else if (import.meta.env.DEV) {
    // In development, only warn
    console.warn(
      `[WARNING] ${errorMsg}\n` +
      'Create a .env file in your project root. See .env.example for reference.'
    );
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with offline persistence (new method)
  db = getFirestore(app);
  
  storage = getStorage(app);
  
  // Enable App Check in production
  if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('Firebase initialization error:', error.message);
  }
}

export { auth, db, storage };
export default app;
