/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  USERS: "users",
  USERNAMES: "usernames",
  QUESTIONS: "questions",
  TESTS: "tests",
  BOOKMARKS: "bookmarks",
  ERROR_REPORTS: "errorReports",
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: "theme",
  MOCK_TEST_SESSION: "mockTestSession",
  PRACTICE_SESSION: "practiceSession",
  CUSTOM_TEST_SESSION: "customTestSession",
  ACTIVE_SESSION: "activeTestSession",
  QUESTION_COUNTS: "questionCounts",
  QUESTION_COUNTS_AT: "questionCountsAt",
};

/**
 * Test modes
 */
export const TEST_MODES = {
  MOCK: "mock",
  PRACTICE: "practice",
  CUSTOM: "custom",
};

/**
 * Question status
 */
export const QUESTION_STATUS = {
  NOT_VISITED: "not-visited",
  ANSWERED: "answered",
  NOT_ANSWERED: "not-answered",
  MARKED: "marked",
  ANSWERED_MARKED: "answered-marked",
};

/**
 * Error report status
 */
export const REPORT_STATUS = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  RESOLVED: "resolved",
  REJECTED: "rejected",
};

/**
 * Session expiry time (6 hours in ms)
 */
export const SESSION_EXPIRY_MS = 6 * 60 * 60 * 1000;

/**
 * Cache expiry time (5 minutes in ms)
 */
export const CACHE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Timer thresholds (in seconds)
 */
export const TIMER_THRESHOLDS = {
  WARNING: 300, // 5 minutes
  CRITICAL: 60, // 1 minute
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
