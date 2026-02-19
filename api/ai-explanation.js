// Vercel Serverless Function for AI Explanations
// This endpoint calls Groq API server-side to keep API keys secure

import admin from 'firebase-admin';

// Initialize Firebase Admin (once per cold start)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    admin.initializeApp();
  }
}

// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 15; // max requests per IP per window

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Cleanup stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW * 5);

/**
 * Truncate a string to a safe maximum length
 */
function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

/**
 * Validate that options is a plain object with A/B/C/D string keys
 */
function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return false;
  const keys = ['A', 'B', 'C', 'D'];
  return keys.every(k => typeof options[k] === 'string' && options[k].length > 0);
}

/**
 * Verify Firebase ID token from Authorization header
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

// CORS origins — configurable via env, with sensible defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://amanrcy.vercel.app,http://localhost:3000')
  .split(',')
  .map(o => o.trim());

export default async function handler(req, res) {
  // CORS — restrict to known origins
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
  }

  // Reject oversized request bodies (10KB limit)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10240) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body must be under 10KB'
    });
  }

  // Authenticate — require a valid Firebase ID token
  const decodedToken = await verifyAuth(req);
  if (!decodedToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid Firebase authentication token is required.'
    });
  }

  // Server-side rate limiting by authenticated UID (more reliable than IP)
  const rateLimitKey = decodedToken.uid;
  if (isRateLimited(rateLimitKey)) {
    return res.status(429).json({
      error: 'Rate Limit',
      message: 'Too many requests. Please wait a moment before trying again.'
    });
  }

  try {
    const {
      questionText,
      options,
      correctAnswer,
      userAnswer,
      subject,
      topic
    } = req.body || {};

    // Validate required fields
    if (!questionText || !options || !correctAnswer || !userAnswer) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields'
      });
    }

    // Type and length validation
    if (typeof questionText !== 'string' || questionText.length > 2000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'questionText must be a string under 2000 characters'
      });
    }

    if (!validateOptions(options)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'options must be an object with non-empty A, B, C, D string values'
      });
    }

    const validAnswers = ['A', 'B', 'C', 'D'];
    if (!validAnswers.includes(correctAnswer) || !validAnswers.includes(userAnswer)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'correctAnswer and userAnswer must be one of A, B, C, D'
      });
    }

    // Get Groq API key from environment
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'AI service not configured. Please contact administrator.'
      });
    }

    // Sanitize all text inputs — truncate to safe lengths
    const safeQuestion = truncate(questionText, 2000);
    const safeOptions = {
      A: truncate(options.A, 500),
      B: truncate(options.B, 500),
      C: truncate(options.C, 500),
      D: truncate(options.D, 500),
    };
    const safeSubject = truncate(subject || 'General', 100);
    const safeTopic = truncate(topic || 'General', 100);

    // Build the prompt
    const prompt = `You are an expert tutor. Provide a SHORT explanation (3-4 sentences max).

Question: ${safeQuestion}

Options:
A) ${safeOptions.A}
B) ${safeOptions.B}
C) ${safeOptions.C}
D) ${safeOptions.D}

Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Subject: ${safeSubject}
Topic: ${safeTopic}

Explain in 3-4 sentences ONLY:
1. Why the correct answer (${correctAnswer}) is right
2. Why ${userAnswer} is wrong
3. One quick tip to remember

Be concise and direct. No fluff.`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a concise tutor. Keep explanations under 100 words. Be direct and clear.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate Limit',
          message: 'Too many AI requests. Please try again in a moment.'
        });
      }

      return res.status(500).json({
        error: 'AI Service Error',
        message: 'Failed to generate explanation. Please try again.'
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        error: 'Invalid Response',
        message: 'AI service returned an invalid response.'
      });
    }

    return res.status(200).json({ explanation });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
}
