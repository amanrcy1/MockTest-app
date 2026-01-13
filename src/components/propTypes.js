/**
 * Common prop type shapes for documentation
 * Note: Using JSDoc for type documentation since this is a JS project
 */

import PropTypes from 'prop-types';

/**
 * @typedef {Object} Question
 * @property {string} id - Question ID
 * @property {string} questionText - The question text
 * @property {Object} options - Answer options {A, B, C, D}
 * @property {string} correctAnswer - Correct answer key (A/B/C/D)
 * @property {string} examType - Exam type code
 * @property {string} subject - Subject name
 * @property {string} topic - Topic name
 * @property {string} difficulty - Difficulty level
 * @property {string} [solution] - Explanation/solution
 */

/**
 * @typedef {Object} Response
 * @property {string} questionId - Question ID
 * @property {string|null} selectedAnswer - Selected answer or null
 * @property {boolean} markedForReview - Marked for review flag
 * @property {number} timeTaken - Time spent in seconds
 * @property {boolean} visited - Whether question was visited
 * @property {number} marksPerQuestion - Marks for correct answer
 * @property {number} negativeMarking - Negative marks for wrong answer
 */

/**
 * @typedef {Object} TestResult
 * @property {string} id - Test ID
 * @property {string} userId - User ID
 * @property {string} examType - Exam type
 * @property {string} testMode - Test mode (mock/practice/custom)
 * @property {number} score - Total score
 * @property {number} accuracy - Accuracy percentage
 * @property {number} correct - Correct answers count
 * @property {number} incorrect - Incorrect answers count
 * @property {number} skipped - Skipped questions count
 * @property {number} timeTaken - Time taken in seconds
 * @property {string} startTime - ISO timestamp
 * @property {string} endTime - ISO timestamp
 * @property {boolean} completed - Completion status
 */

/**
 * @typedef {Object} User
 * @property {string} userId - User ID
 * @property {string} username - Username
 * @property {string} name - Full name
 * @property {string} email - Email address
 * @property {string} targetExam - Target exam type
 * @property {boolean} isAdmin - Admin status
 * @property {string} createdAt - ISO timestamp
 * @property {string} [lastLoginAt] - Last login timestamp
 * @property {number} loginCount - Login count
 */

/**
 * @typedef {Object} Section
 * @property {string} id - Section ID
 * @property {string} name - Section name
 * @property {number} totalQuestions - Total questions in section
 * @property {number} totalMarks - Total marks
 * @property {number} duration - Duration in minutes
 * @property {number} negativeMarking - Negative marking value
 * @property {number} marksPerQuestion - Marks per question
 * @property {number} [startIndex] - Start index in questions array
 * @property {number} [endIndex] - End index in questions array
 */

/**
 * @typedef {Object} Bookmark
 * @property {string} id - Bookmark ID
 * @property {string} userId - User ID
 * @property {string} questionId - Question ID
 * @property {string} examType - Exam type
 * @property {string} [note] - User note
 * @property {string} createdAt - ISO timestamp
 */

// Reusable PropTypes shapes
export const QuestionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  questionText: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  correctAnswer: PropTypes.string.isRequired,
  examType: PropTypes.string.isRequired,
  subject: PropTypes.string,
  topic: PropTypes.string,
  difficulty: PropTypes.string,
  solution: PropTypes.string,
});

export const ResponsePropType = PropTypes.shape({
  questionId: PropTypes.string.isRequired,
  selectedAnswer: PropTypes.string,
  markedForReview: PropTypes.bool,
  timeTaken: PropTypes.number,
  visited: PropTypes.bool,
  marksPerQuestion: PropTypes.number,
  negativeMarking: PropTypes.number,
});

export const SectionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  totalMarks: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  negativeMarking: PropTypes.number,
  marksPerQuestion: PropTypes.number,
  startIndex: PropTypes.number,
  endIndex: PropTypes.number,
});

export const UserPropType = PropTypes.shape({
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  targetExam: PropTypes.string,
  isAdmin: PropTypes.bool,
  createdAt: PropTypes.string,
  lastLoginAt: PropTypes.string,
  loginCount: PropTypes.number,
});

const propTypes = {
  QuestionPropType,
  ResponsePropType,
  SectionPropType,
  UserPropType,
};

export default propTypes;
