// Runtime config for public/email-action.html
// Set these values per environment before deployment.
const runtimeGlobal = typeof globalThis !== "undefined" ? globalThis : this;

runtimeGlobal.__MOCKZAM_FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyCbHzoUbpWPt0XOz4bclcVghuASrE5GOus",
  authDomain: "upsc-mock-test-18b34.firebaseapp.com",
  projectId: "upsc-mock-test-18b34",
};

// Support contact shown on the email action page.
runtimeGlobal.__MOCKZAM_SUPPORT_EMAIL__ = "amanrcy1@gmail.com";
