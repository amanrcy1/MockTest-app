import { aiRequestLimiter } from "../utils/securityUtils";
import { logError } from "../utils/errorTracking";
import { auth } from "../config/firebase";

// Cache for AI explanations to avoid repeated API calls
const explanationCache = new Map();
const MAX_CACHE_SIZE = 100; // Limit cache to 100 entries

/**
 * Generate an AI-powered explanation for a wrong answer
 * Calls Vercel serverless function instead of Groq directly
 * @param {Object} params - Question details
 * @param {string} params.questionText - The question text
 * @param {Object} params.options - The answer options {A, B, C, D}
 * @param {string} params.correctAnswer - The correct answer (A/B/C/D)
 * @param {string} params.userAnswer - The user's selected answer (A/B/C/D)
 * @param {string} params.subject - The subject of the question
 * @param {string} params.topic - The topic of the question
 * @returns {Promise<string>} - AI generated explanation
 */
export const generateExplanation = async ({
  questionText,
  options,
  correctAnswer,
  userAnswer,
  subject,
  topic,
}) => {
  // Rate limiting (client-side check)
  if (!aiRequestLimiter.canMakeRequest('ai-explanation')) {
    throw new Error("Too many requests. Wait a moment.");
  }

  // Create cache key
  const cacheKey = `${questionText}_${userAnswer}_${correctAnswer}`;
  
  // Return cached explanation if available
  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey);
  }

  try {
    // Call Vercel serverless function
    const apiUrl = process.env.REACT_APP_API_URL || '/api';
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Get Firebase auth token for server-side verification
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    
    const response = await fetch(`${apiUrl}/ai-explanation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
      },
      body: JSON.stringify({
        questionText,
        options,
        correctAnswer,
        userAnswer,
        subject,
        topic,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate explanation');
    }

    const data = await response.json();
    const explanation = data.explanation;

    // Cache the explanation with size limit (LRU-style)
    if (explanationCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first key)
      const firstKey = explanationCache.keys().next().value;
      explanationCache.delete(firstKey);
    }
    explanationCache.set(cacheKey, explanation);

    return explanation;
  } catch (error) {
    // Log error in development, track in production
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("AI Explanation Error:", error);
    }
    logError(error, { context: 'getAIExplanation' });
    
    // Handle specific errors
    if (error.name === 'AbortError') {
      throw new Error("Request timeout. Try again.");
    }
    if (error.message?.includes("rate limit")) {
      throw new Error("Too many AI requests. Wait a moment.");
    }
    if (error.message?.includes("network") || error.message?.includes("fetch")) {
      throw new Error("Network error. Check your connection.");
    }
    
    throw new Error("Failed to generate explanation. Try again.");
  }
};

/**
 * Clear the explanation cache (useful for memory management)
 */
export const clearExplanationCache = () => {
  explanationCache.clear();
};
