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
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
];

// Check for required environment variables
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  const errorMsg = `Missing Firebase environment variables: ${missing.join(', ')}`;
  
  if (process.env.NODE_ENV === 'production') {
    // In production, throw error to prevent app from running with missing config
    throw new Error(errorMsg);
  } else {
    // In development, only warn
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ ${errorMsg}\n` +
      'Create a .env file in your project root. See .env.example for reference.'
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
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
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_RECAPTCHA_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.REACT_APP_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  }
} catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Firebase initialization error:', error.message);
  }
}

export { auth, db, storage };
export default app;
