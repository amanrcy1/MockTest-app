/**
 * Test data factories for creating mock objects
 */

export const createMockQuestion = (overrides = {}) => ({
  id: `q-${Math.random().toString(36).substr(2, 9)}`,
  questionText: 'What is the capital of India?',
  options: {
    A: 'Mumbai',
    B: 'Delhi',
    C: 'Kolkata',
    D: 'Chennai',
  },
  correctAnswer: 'B',
  solution: 'Delhi is the capital of India.',
  examType: 'UPSC-Prelims',
  subject: 'Geography',
  topic: 'Indian Geography',
  difficulty: 'Easy',
  year: 2024,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  uid: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  username: 'testuser',
  name: 'Test User',
  targetExam: 'UPSC-Prelims',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  emailVerified: true,
  ...overrides,
});

export const createMockTest = (overrides = {}) => ({
  id: `test-${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user-123',
  examType: 'UPSC-Prelims',
  testMode: 'mock',
  questions: [createMockQuestion(), createMockQuestion(), createMockQuestion()],
  responses: {},
  startTime: new Date().toISOString(),
  endTime: null,
  completed: false,
  score: 0,
  totalQuestions: 3,
  ...overrides,
});

export const createMockTestResult = (overrides = {}) => ({
  id: `result-${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user-123',
  testId: 'test-123',
  examType: 'UPSC-Prelims',
  score: 75,
  totalQuestions: 100,
  correctAnswers: 75,
  incorrectAnswers: 20,
  unanswered: 5,
  accuracy: 78.95,
  timeTaken: 7200,
  completedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockBookmark = (overrides = {}) => ({
  id: `bookmark-${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user-123',
  questionId: 'q-123',
  question: createMockQuestion(),
  examType: 'UPSC-Prelims',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockLeaderboardEntry = (overrides = {}) => ({
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  username: 'testuser',
  score: 85,
  accuracy: 85.5,
  timeTaken: 6000,
  rank: 1,
  ...overrides,
});

/**
 * Create multiple mock questions
 */
export const createMockQuestions = (count = 5, overrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createMockQuestion({ 
      id: `q-${index + 1}`,
      questionText: `Question ${index + 1}?`,
      ...overrides 
    })
  );
};

/**
 * Create mock test with responses
 */
export const createMockTestWithResponses = (questionCount = 10) => {
  const questions = createMockQuestions(questionCount);
  const responses = {};
  
  questions.forEach((q, index) => {
    if (index < questionCount * 0.7) {
      // 70% answered
      responses[q.id] = {
        answer: index % 2 === 0 ? q.correctAnswer : 'A',
        timeTaken: 60,
        marked: index % 3 === 0,
      };
    }
  });
  
  return createMockTest({
    questions,
    responses,
    totalQuestions: questionCount,
  });
};
