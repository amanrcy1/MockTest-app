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
 * @param {string} params.existingSolution - The existing solution text (optional)
 * @returns {Promise<string>} - AI generated explanation
 */
export const generateExplanation = async ({
  questionText,
  options,
  correctAnswer,
  userAnswer,
  subject,
  topic,
  existingSolution,
  learningProfile,
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
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for 70B model
    
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
        learningProfile,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If API returns 404 (not available in local dev), use fallback
    if (response.status === 404) {
      const fallbackExplanation = generateFallbackExplanation({
        questionText,
        options,
        correctAnswer,
        userAnswer,
        subject,
        topic,
        existingSolution,
      });
      explanationCache.set(cacheKey, fallbackExplanation);
      return fallbackExplanation;
    }

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
    if (import.meta.env.DEV) {
       
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
      // Network error - use fallback
      const fallbackExplanation = generateFallbackExplanation({
        questionText,
        options,
        correctAnswer,
        userAnswer,
        subject,
        topic,
        existingSolution,
      });
      return fallbackExplanation;
    }
    
    throw new Error("Failed to generate explanation. Try again.");
  }
};

/**
 * Generate a fallback explanation when AI API is not available
 * Uses the existing solution and formats it nicely
 */
const generateFallbackExplanation = ({
  options,
  correctAnswer,
  userAnswer,
  existingSolution,
}) => {
  const correctOption = options?.[correctAnswer] || 'the correct option';
  const userOption = options?.[userAnswer] || 'your selected option';
  
  let explanation = `**Why ${correctAnswer} is correct:**\n`;
  explanation += `The correct answer is "${correctOption}".\n\n`;
  
  if (userAnswer !== correctAnswer) {
    explanation += `**Why ${userAnswer} is incorrect:**\n`;
    explanation += `You selected "${userOption}", which is not the right answer.\n\n`;
  }
  
  if (existingSolution) {
    explanation += `**Detailed Explanation:**\n${existingSolution}`;
  } else {
    explanation += `**Tip:** Review this topic to better understand the concept.`;
  }
  
  return explanation;
};

/**
 * Clear the explanation cache (useful for memory management)
 */
export const clearExplanationCache = () => {
  explanationCache.clear();
};
