// Utility functions for test management

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array copy
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calculate test score from responses
 * @param {Array} responses - User responses
 * @param {Array} questions - Questions array
 * @returns {Object} - Score breakdown
 */
export const calculateScore = (responses, questions) => {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let totalMarks = 0;

  responses.forEach((response, index) => {
    const question = questions[index];
    if (!response.selectedAnswer) {
      skipped++;
    } else if (response.selectedAnswer === question.correctAnswer) {
      correct++;
      totalMarks += response.marksPerQuestion || 1;
    } else {
      incorrect++;
      totalMarks += response.negativeMarking || 0;
    }
  });

  const attempted = correct + incorrect;
  const attemptedAccuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(2) : 0;

  return {
    correct,
    incorrect,
    skipped,
    totalMarks,
    totalQuestions: questions.length,
    attempted,
    accuracy: questions.length > 0 ? ((correct / questions.length) * 100).toFixed(2) : 0,
    attemptedAccuracy,
  };
};

/**
 * Format seconds to time string
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string (HH:MM:SS or MM:SS)
 */
export const formatTime = (seconds) => {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Format seconds to human readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} - Human readable time (e.g., "2h 30m" or "45s")
 */
export const formatTimeHuman = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Get question status based on response
 * @param {Object} response - Response object
 * @returns {string} - Status string
 */
export const getQuestionStatus = (response) => {
  if (!response) return "not-visited";
  if (!response.visited) return "not-visited";
  if (response.markedForReview && response.selectedAnswer) return "answered-marked";
  if (response.markedForReview) return "marked";
  if (response.selectedAnswer) return "answered";
  return "not-answered";
};

/**
 * Get CSS classes for question status
 * @param {string} status - Status string
 * @returns {string} - Tailwind CSS classes
 */
export const getStatusColor = (status) => {
  const colors = {
    "not-visited": "bg-gray-200 text-gray-700 hover:bg-gray-300",
    "answered": "bg-green-500 text-white hover:bg-green-600",
    "not-answered": "bg-red-500 text-white hover:bg-red-600",
    "marked": "bg-purple-500 text-white hover:bg-purple-600",
    "answered-marked": "bg-orange-500 text-white hover:bg-orange-600",
  };
  return colors[status] || colors["not-visited"];
};

/**
 * Get status label for accessibility
 * @param {string} status - Status string
 * @returns {string} - Human readable label
 */
export const getStatusLabel = (status) => {
  const labels = {
    "not-visited": "Not visited",
    "answered": "Answered",
    "not-answered": "Visited but not answered",
    "marked": "Marked for review",
    "answered-marked": "Answered and marked for review",
  };
  return labels[status] || "Unknown";
};

/**
 * Calculate performance by category (subject/topic)
 * @param {Array} questions - Questions array
 * @param {Array} responses - Responses array
 * @param {string} categoryKey - Key to group by ('subject' or 'topic')
 * @returns {Object} - Performance by category
 */
export const calculatePerformanceByCategory = (questions, responses, categoryKey = "subject") => {
  const performance = {};

  questions.forEach((question, index) => {
    const category = question[categoryKey];
    if (!performance[category]) {
      performance[category] = { correct: 0, total: 0, timeTaken: 0 };
    }
    performance[category].total++;
    
    const response = responses[index];
    if (response?.selectedAnswer === question.correctAnswer) {
      performance[category].correct++;
    }
    if (response?.timeTaken) {
      performance[category].timeTaken += response.timeTaken;
    }
  });

  // Calculate percentages
  Object.keys(performance).forEach((key) => {
    const data = performance[key];
    data.percentage = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(1) : 0;
    data.avgTime = data.total > 0 ? Math.round(data.timeTaken / data.total) : 0;
  });

  return performance;
};

/**
 * Get weak areas (categories with < 50% accuracy)
 * @param {Object} performance - Performance by category
 * @param {number} threshold - Threshold percentage (default 50)
 * @returns {Array} - Array of weak categories
 */
export const getWeakAreas = (performance, threshold = 50) => {
  return Object.entries(performance)
    .filter(([_, data]) => parseFloat(data.percentage) < threshold)
    .sort((a, b) => parseFloat(a[1].percentage) - parseFloat(b[1].percentage))
    .map(([category, data]) => ({ category, ...data }));
};

/**
 * Generate unique session ID
 * @returns {string} - Unique session ID
 */
export const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate test session data
 * @param {Object} session - Session data
 * @param {string} userId - Current user ID
 * @param {number} maxAge - Maximum session age in milliseconds (default 6 hours)
 * @returns {boolean} - Whether session is valid
 */
export const isValidSession = (session, userId, maxAge = 6 * 60 * 60 * 1000) => {
  if (!session) return false;
  if (session.userId && session.userId !== userId) return false;
  
  const updatedAt = session.updatedAt ? new Date(session.updatedAt).getTime() : 0;
  if (Date.now() - updatedAt > maxAge) return false;
  
  return true;
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Sanitize text input to prevent XSS
 * Removes potentially dangerous HTML/script content
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Sanitize for Firestore storage (less aggressive, preserves readability)
 * Removes script tags and event handlers but keeps basic formatting
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string safe for storage
 */
export const sanitizeForStorage = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

/**
 * Validate and sanitize question data before storage
 * @param {Object} questionData - Question object
 * @returns {Object} - Sanitized question object
 */
export const sanitizeQuestionData = (questionData) => {
  return {
    ...questionData,
    questionText: sanitizeForStorage(questionData.questionText || ''),
    solution: sanitizeForStorage(questionData.solution || ''),
    options: questionData.options ? {
      A: sanitizeForStorage(questionData.options.A || ''),
      B: sanitizeForStorage(questionData.options.B || ''),
      C: sanitizeForStorage(questionData.options.C || ''),
      D: sanitizeForStorage(questionData.options.D || ''),
    } : questionData.options,
  };
};

/**
 * Sanitize object values recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeInput(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Validate email format (RFC 5322 compliant)
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export const isValidEmail = (email) => {
  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Basic checks
  if (email.length > 254) return false; // RFC 5321
  if (!emailRegex.test(email)) return false;
  
  // Split and validate parts
  const parts = email.split('@');
  if (parts[0].length > 64) return false; // Local part max length
  
  // Check for common typos
  const domain = parts[1].toLowerCase();
  const typos = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
  };
  
  if (typos[domain]) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`Did you mean ${typos[domain]}?`);
    }
  }
  
  return true;
};

/**
 * Check if email is from a disposable/temporary email service
 * @param {string} email - Email to check
 * @returns {boolean} - Whether email is disposable
 */
export const isDisposableEmail = (email) => {
  const disposableDomains = [
    'tempmail.com', 'guerrillamail.com', '10minutemail.com',
    'throwaway.email', 'mailinator.com', 'trashmail.com',
    'temp-mail.org', 'fakeinbox.com', 'yopmail.com',
    'maildrop.cc', 'getnada.com', 'mohmal.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};
