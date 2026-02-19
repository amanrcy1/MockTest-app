/**
 * Centralized toast notification utility
 * Provides consistent messaging and styling across the application
 */
import { toast as toastify } from "react-toastify";

// Default options for different toast types
const defaultOptions = {
  success: { autoClose: 3000 },
  error: { autoClose: 4000 },
  info: { autoClose: 3000 },
  warning: { autoClose: 4000 },
};

/**
 * Show a success toast
 * @param {string} message - The message to display
 * @param {object} options - Optional toast options
 */
export const showSuccess = (message, options = {}) => {
  toastify.success(message, { ...defaultOptions.success, ...options });
};

/**
 * Show an error toast
 * @param {string} message - The message to display
 * @param {object} options - Optional toast options
 */
export const showError = (message, options = {}) => {
  toastify.error(message, { ...defaultOptions.error, ...options });
};

/**
 * Show an info toast
 * @param {string} message - The message to display
 * @param {object} options - Optional toast options
 */
export const showInfo = (message, options = {}) => {
  toastify.info(message, { ...defaultOptions.info, ...options });
};

/**
 * Show a warning toast
 * @param {string} message - The message to display
 * @param {object} options - Optional toast options
 */
export const showWarning = (message, options = {}) => {
  toastify.warning(message, { ...defaultOptions.warning, ...options });
};

// Pre-defined messages for consistency
export const messages = {
  // Auth
  LOGIN_REQUIRED: "Please log in to continue",
  LOGOUT_SUCCESS: "Logged out successfully",
  LOGOUT_FAILED: "Failed to log out",
  
  // Profile
  PROFILE_UPDATED: "Profile updated",
  PROFILE_UPDATE_FAILED: "Failed to update profile",
  PHOTO_UPDATED: "Photo updated",
  PHOTO_REMOVED: "Photo removed",
  PHOTO_SAVE_FAILED: "Failed to save photo",
  PHOTO_REMOVE_FAILED: "Failed to remove photo",
  INVALID_IMAGE: "Please select a valid image file",
  IMAGE_TOO_LARGE: "Image must be less than 5MB",
  
  // Onboarding
  NAME_REQUIRED: "Please enter your name (at least 2 characters)",
  EXAM_REQUIRED: "Please select your target exam",
  ONBOARDING_SUCCESS: "You're all set! Let's go!",
  ONBOARDING_FAILED: "Something went wrong. Please try again",
  
  // Test
  TEST_SUBMIT_FAILED: "Failed to submit test",
  TEST_LOAD_FAILED: "Failed to load questions",
  NO_TEST_CONFIG: "No test configuration found",
  NO_EXAM_SELECTED: "No exam type selected",
  TIME_UP: "Time's up! Auto-submitting test...",
  VIOLATION_AUTO_SUBMIT: "Test auto-submitted due to multiple fullscreen violations",
  INSUFFICIENT_QUESTIONS: (need, have) => `Insufficient questions. Need ${need}, have ${have}`,
  NO_QUESTIONS_AVAILABLE: "No questions available for this exam type",
  NO_PRACTICE_QUESTIONS: "No practice questions available for this exam type",
  ANSWER_LOCKED: (num) => `Answer locked for Q${num}`,
  NO_TEST_DATA: "No test data available",
  TEST_DETAILS_INCOMPLETE: "Test details are incomplete",
  TEST_RESULT_LOAD_FAILED: "Failed to load test result",
  
  // Custom Test
  NO_QUESTIONS_WITH_FILTERS: "No questions available with selected filters",
  REDUCE_QUESTIONS: (available) => `Only ${available} questions available. Please reduce the number`,
  SELECT_SUBJECT: "Please select at least one subject",
  
  // Bookmarks
  BOOKMARK_ADDED: "Question bookmarked",
  BOOKMARK_REMOVED: "Bookmark removed",
  BOOKMARKS_LOAD_FAILED: "Failed to load bookmarks",
  BOOKMARK_REMOVE_FAILED: "Failed to remove bookmark",
  
  // Reports
  REPORT_EMPTY: "Please enter a report message",
  REPORT_SUBMITTED: "Report submitted",
  REPORT_FAILED: "Failed to submit report",
  
  // AI
  AI_EXPLANATION_FAILED: "Failed to generate AI explanation",
  
  // Admin - Questions
  QUESTION_ADDED: "Question added successfully",
  QUESTION_ADD_FAILED: "Failed to add question",
  QUESTION_UPDATED: "Question updated successfully",
  QUESTION_UPDATE_FAILED: "Failed to update question",
  QUESTION_DELETED: "Question deleted successfully",
  QUESTION_DELETE_FAILED: "Failed to delete question",
  QUESTIONS_LOAD_FAILED: "Failed to load questions",
  QUESTION_TEXT_REQUIRED: "Question text is required",
  OPTIONS_REQUIRED: "All options are required",
  SOLUTION_REQUIRED: "Solution is required",
  
  // Admin - Bulk Upload
  CSV_REQUIRED: "Please upload a CSV file",
  CSV_PARSE_FAILED: "Failed to parse CSV file",
  NO_VALID_QUESTIONS: "No valid questions to upload",
  BULK_UPLOAD_SUCCESS: (count) => `Successfully uploaded ${count} questions`,
  BULK_UPLOAD_PARTIAL: (failed) => `Failed to upload ${failed} questions`,
  BULK_UPLOAD_FAILED: "Failed to upload questions",
  TEMPLATE_DOWNLOADED: "Template downloaded",
  
  // Admin - Users
  USERS_LOAD_FAILED: "Failed to load users",
  USER_PROMOTED: "User promoted to admin",
  USER_DEMOTED: "User demoted from admin",
  USER_UPDATE_FAILED: "Failed to update user",
  USER_DELETED: "User deleted. Remember to also delete from Firebase Authentication console",
  USER_DELETE_FAILED: "Failed to delete user",
  CANNOT_DEMOTE_SELF: "You cannot demote yourself",
  CANNOT_DELETE_SELF: "You cannot delete yourself",
  CANNOT_DEMOTE_SUPER_ADMIN: "Cannot demote the super admin",
  CANNOT_DELETE_SUPER_ADMIN: "Cannot delete the super admin",
  ADMIN_ONLY: "Only super admin can manage user roles",
  DELETE_ADMIN_ONLY: "Only super admin can delete users",
  
  // Admin - Error Reports
  REPORTS_LOAD_FAILED: "Failed to load error reports",
  REPORT_RESOLVED: "Report marked as resolved",
  REPORT_UPDATE_FAILED: "Failed to update report",
  NOTE_REQUIRED: "Please enter a note before saving",
  NOTE_SAVED: "Note saved",
  NOTE_SAVE_FAILED: "Failed to save note",
  REPORT_DELETED: "Error report deleted",
  REPORT_DELETE_FAILED: "Failed to delete report",
  
  // Admin - Bookmarks
  ADMIN_BOOKMARKS_LOAD_FAILED: "Failed to load bookmarks",
  BOOKMARK_REVIEWED: "Bookmark marked as reviewed",
  BOOKMARK_UPDATE_FAILED: "Failed to update bookmark",
  BOOKMARK_DELETED: "Bookmark deleted",
  BOOKMARK_DELETE_FAILED: "Failed to delete bookmark",
};

// Export the raw toast for edge cases
export { toastify as toast };

const toastUtils = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  messages,
};

export default toastUtils;
