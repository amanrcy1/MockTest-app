// Vercel Serverless Function for AI Explanations
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    admin.initializeApp();
  }
}

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(key);
  }
}, RATE_LIMIT_WINDOW * 5);

function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return false;
  return ['A', 'B', 'C', 'D'].every(k => typeof options[k] === 'string' && options[k].length > 0);
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try { return await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]); }
  catch { return null; }
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://amanrcy.vercel.app,http://localhost:3000')
  .split(',').map(o => o.trim());

// Detect if question involves math/calculation
function isMathQuestion(subject, topic, questionText) {
  const lower = `${subject} ${topic} ${questionText}`.toLowerCase();
  return /\b(math|arithmetic|algebra|geometry|trigonometry|mensuration|calculus|percentage|ratio|profit|loss|interest|speed|distance|time|probability|number system|average|simplif)/i.test(lower) ||
    /\d+\s*[+\-*/÷×%^]\s*\d+/.test(lower);
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function postProcess(reply) {
  let cleaned = stripThinking(reply);
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned || cleaned.length < 10) {
    return "Could not generate explanation. Please try again.";
  }
  return cleaned;
}

async function callGroq(messages, models, groqApiKey) {
  let lastError = null;
  for (const model of models) {
    try {
      const body = {
        model: model.id,
        messages,
        temperature: model.temperature ?? 0.2,
        max_tokens: model.maxTokens ?? 600,
        top_p: 1,
      };
      if (model.useThinking) {
        body.chat_template_kwargs = { enable_thinking: true };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`${model.id} unavailable`);
        continue;
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData.error?.message || `${model.id} failed`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) { lastError = new Error('Empty response'); continue; }
      return postProcess(content);
    } catch (err) { lastError = err; continue; }
  }
  throw lastError || new Error('All models failed');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (parseInt(req.headers['content-length'] || '0', 10) > 10240) {
    return res.status(413).json({ error: 'Payload Too Large' });
  }

  const decodedToken = await verifyAuth(req);
  if (!decodedToken) return res.status(401).json({ error: 'Unauthorized' });
  if (isRateLimited(decodedToken.uid)) return res.status(429).json({ error: 'Too many requests.' });

  try {
    const {
      questionText, options, correctAnswer, userAnswer,
      subject, topic, learningProfile,
    } = req.body || {};

    if (!questionText || !options || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (typeof questionText !== 'string' || questionText.length > 2000) {
      return res.status(400).json({ error: 'questionText must be under 2000 characters' });
    }
    if (!validateOptions(options)) {
      return res.status(400).json({ error: 'options must have non-empty A, B, C, D values' });
    }
    if (!['A','B','C','D'].includes(correctAnswer) || !['A','B','C','D'].includes(userAnswer)) {
      return res.status(400).json({ error: 'Answers must be A, B, C, or D' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ error: 'AI service not configured.' });

    const safeQ = truncate(questionText, 2000);
    const safeOpts = {
      A: truncate(options.A, 500), B: truncate(options.B, 500),
      C: truncate(options.C, 500), D: truncate(options.D, 500),
    };
    const safeSubject = truncate(subject || 'General', 100);
    const safeTopic = truncate(topic || 'General', 100);
    const useMath = isMathQuestion(safeSubject, safeTopic, safeQ);

    // Build system prompt with few-shot example
    let systemContent = `You are an expert exam tutor. Explain why the student's answer is wrong and why the correct answer is right.

RULES:
• Be factually accurate. Double-check every fact, date, formula.
• Use **bold** for key terms. Use numbered steps for math.
• Include a memory tip or mnemonic at the end.
• Keep it under 150 words unless the topic needs more.`;

    if (useMath) {
      systemContent += `
• This is a MATH question. Show step-by-step solution. Verify your arithmetic.
• After solving, do a quick sanity check on the answer.`;
    }

    // Adapt based on learning profile
    try {
      if (learningProfile) {
        const lp = typeof learningProfile === 'string' ? JSON.parse(learningProfile) : learningProfile;
        const isWeak = lp.weakTopics?.some(t => t.name?.toLowerCase() === safeTopic.toLowerCase());
        if (isWeak) systemContent += '\nThis is a WEAK topic for the student. Use simple language, add an analogy and a mnemonic.';
        if (lp.trend === 'declining') systemContent += '\nStudent is struggling. Be encouraging.';
      }
    } catch { /* ignore */ }

    const userPrompt = `**Question:** ${safeQ}

**Options:**
A) ${safeOpts.A}
B) ${safeOpts.B}
C) ${safeOpts.C}
D) ${safeOpts.D}

**Student chose:** ${userAnswer}) ${safeOpts[userAnswer]}
**Correct answer:** ${correctAnswer}) ${safeOpts[correctAnswer]}
**Subject:** ${safeSubject} | **Topic:** ${safeTopic}

Explain:
1. Why **${correctAnswer}** is correct
2. Why **${userAnswer}** is wrong
3. A memory tip to remember this`;

    // Route to best model
    const models = useMath
      ? [
          { id: 'qwen/qwen3-32b', maxTokens: 600, temperature: 0.15, useThinking: true },
          { id: 'llama-3.3-70b-versatile', maxTokens: 600, temperature: 0.15 },
          { id: 'llama-3.1-8b-instant', maxTokens: 600, temperature: 0.15 },
        ]
      : [
          { id: 'llama-3.3-70b-versatile', maxTokens: 600, temperature: 0.2 },
          { id: 'qwen/qwen3-32b', maxTokens: 600, temperature: 0.2 },
          { id: 'llama-3.1-8b-instant', maxTokens: 600, temperature: 0.2 },
        ];

    const explanation = await callGroq(
      [{ role: 'system', content: systemContent }, { role: 'user', content: userPrompt }],
      models,
      groqApiKey,
    );

    return res.status(200).json({ explanation });
  } catch (error) {
    console.error('Explanation API Error:', error);
    if (error.message?.includes('429') || error.message?.includes('unavailable')) {
      return res.status(429).json({ error: 'AI service busy. Try again.' });
    }
    return res.status(500).json({ error: 'Failed to generate explanation. Try again.' });
  }
}
