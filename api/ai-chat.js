// Vercel Serverless Function for AI Doubt Resolver Chat
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    admin.initializeApp();
  }
}

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_COLLECTION = 'rateLimits';

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 600;
const RESPONSE_CACHE = new Map();
const PROFILE_CACHE_TTL_MS = 10 * 60_000;
const PROFILE_CACHE_MAX_ENTRIES = 300;
const USER_PROFILE_CACHE = new Map();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://amanrcy.vercel.app,http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeContext(raw = {}) {
  const safe = {
    userName: truncate(raw.userName || '', 100),
    examType: truncate(raw.examType || '', 50),
    performanceSummary: truncate(raw.performanceSummary || '', 300),
    currentPage: truncate(raw.currentPage || '', 100),
    learningProfile: null,
    currentQuestion: null,
  };

  if (raw.learningProfile) {
    try {
      const lp = typeof raw.learningProfile === 'string' ? JSON.parse(raw.learningProfile) : raw.learningProfile;
      safe.learningProfile = {
        trend: truncate(lp?.trend || '', 30),
        recentAccuracy: Number(lp?.recentAccuracy ?? 0),
        consistency: Number(lp?.consistency ?? 0),
        weakTopics: Array.isArray(lp?.weakTopics)
          ? lp.weakTopics.slice(0, 8).map((t) => ({ name: truncate(t?.name || '', 60), accuracy: Number(t?.accuracy ?? 0) }))
          : [],
        strongTopics: Array.isArray(lp?.strongTopics)
          ? lp.strongTopics.slice(0, 8).map((t) => ({ name: truncate(t?.name || '', 60), accuracy: Number(t?.accuracy ?? 0) }))
          : [],
      };
    } catch {
      safe.learningProfile = null;
    }
  }

  if (raw.currentQuestion && typeof raw.currentQuestion === 'object') {
    safe.currentQuestion = {
      questionText: truncate(raw.currentQuestion.questionText || '', 500),
      optionA: truncate(raw.currentQuestion.optionA || '', 200),
      optionB: truncate(raw.currentQuestion.optionB || '', 200),
      optionC: truncate(raw.currentQuestion.optionC || '', 200),
      optionD: truncate(raw.currentQuestion.optionD || '', 200),
      subject: truncate(raw.currentQuestion.subject || '', 50),
      topic: truncate(raw.currentQuestion.topic || '', 50),
    };
  }

  return safe;
}

function classifyBoundary(message) {
  const lower = normalizeText(message);

  if (/\b(ignore previous|reveal prompt|system prompt|jailbreak|developer instructions)\b/.test(lower)) {
    return { violation: true, type: 'jailbreak' };
  }

  if (/\b(porn|xxx|sex chat|nude|escort|betting tip|casino|hack|malware|exploit)\b/.test(lower)) {
    return { violation: true, type: 'unsafe_or_offtopic' };
  }

  return { violation: false, type: null };
}

function getBoundaryReply(type) {
  if (type === 'jailbreak') {
    return 'I can only help with exam prep, study strategy, and app-related academic guidance.';
  }
  return 'I can help only with study and exam-prep questions. Ask me any syllabus topic.';
}

function isAmbiguous(message) {
  if (tryEvaluateArithmetic(message)) return false;

  const text = normalizeText(message);
  const words = text.split(' ').filter(Boolean);

  if (words.length <= 2 && !/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no)$/.test(text)) {
    return true;
  }

  const vaguePatterns = [
    /^(explain|detail|notes|summary|elaborate|teach me|help me)$/,
    /^(what|which|how|why)\s*\?*$/,
    /^(this|that|it|they|them)\s*\?*$/,
  ];

  return vaguePatterns.some((pattern) => pattern.test(text));
}

function buildClarifyingQuestion(context = {}) {
  const exam = context.examType || 'your exam';
  return `Please specify the exact topic or question from ${exam}. Example: "Explain fundamental rights with examples".`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}

function sanitizeExpression(raw) {
  if (!raw || raw.length > 120) return null;

  const stripped = String(raw)
    .toLowerCase()
    .replace(/\b(what is|calculate|solve|find|answer|equals|equal to|please)\b/g, ' ')
    .replace(/[?=]/g, ' ')
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−]/g, '-')
    .trim();

  if (/[a-z]/.test(stripped)) return null;
  if (!/[0-9]/.test(stripped)) return null;
  if (!/[+\-*/%^]/.test(stripped)) return null;
  if (/[^0-9+\-*/%^().\s]/.test(stripped)) return null;

  return stripped.replace(/\^/g, '**');
}

function tokenizeExpression(expression) {
  const tokens = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        num += expression[i];
        i += 1;
      }
      if ((num.match(/\./g) || []).length > 1) return null;
      const parsed = Number(num);
      if (!Number.isFinite(parsed)) return null;
      tokens.push({ type: 'number', value: parsed });
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i += 1;
      continue;
    }
    if (ch === '*' && expression[i + 1] === '*') {
      tokens.push({ type: 'operator', value: '^' });
      i += 2;
      continue;
    }
    if (['+', '-', '*', '/', '%'].includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const ops = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, 'u-': 4 };
  const rightAssoc = new Set(['^', 'u-']);
  let prevType = 'start';

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
      prevType = 'number';
      continue;
    }
    if (token.type === 'operator') {
      let op = token.value;
      if (op === '-' && (prevType === 'start' || prevType === 'operator' || prevType === 'leftParen')) {
        op = 'u-';
      }
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== 'operator') break;
        const left = precedence[top.value];
        const right = precedence[op];
        const shouldPop = rightAssoc.has(op) ? left > right : left >= right;
        if (!shouldPop) break;
        output.push(ops.pop());
      }
      ops.push({ type: 'operator', value: op });
      prevType = 'operator';
      continue;
    }
    if (token.type === 'paren' && token.value === '(') {
      ops.push({ type: 'leftParen', value: '(' });
      prevType = 'leftParen';
      continue;
    }
    if (token.type === 'paren' && token.value === ')') {
      let foundLeft = false;
      while (ops.length) {
        const top = ops.pop();
        if (top.type === 'leftParen') {
          foundLeft = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeft) return null;
      prevType = 'rightParen';
      continue;
    }
  }
  while (ops.length) {
    const top = ops.pop();
    if (top.type === 'leftParen') return null;
    output.push(top);
  }
  return output;
}

function evalRpn(rpn) {
  const stack = [];
  const MAX_ABS = 1e12;

  const pushChecked = (value) => {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS) return false;
    stack.push(value);
    return true;
  };

  for (const token of rpn) {
    if (token.type === 'number') {
      if (!pushChecked(token.value)) return null;
      continue;
    }
    if (token.value === 'u-') {
      if (stack.length < 1) return null;
      const a = stack.pop();
      if (!pushChecked(-a)) return null;
      continue;
    }
    if (stack.length < 2) return null;
    const b = stack.pop();
    const a = stack.pop();
    let value;
    switch (token.value) {
      case '+': value = a + b; break;
      case '-': value = a - b; break;
      case '*': value = a * b; break;
      case '/':
        if (b === 0) return null;
        value = a / b;
        break;
      case '%':
        if (b === 0) return null;
        value = a % b;
        break;
      case '^': value = a ** b; break;
      default: return null;
    }
    if (!pushChecked(value)) return null;
  }

  if (stack.length !== 1) return null;
  return stack[0];
}

function tryEvaluateArithmetic(message) {
  const expression = sanitizeExpression(message);
  if (!expression) return null;

  try {
    const tokens = tokenizeExpression(expression);
    if (!tokens || tokens.length === 0 || tokens.length > 80) return null;
    const rpn = toRpn(tokens);
    if (!rpn) return null;
    const value = evalRpn(rpn);
    if (!Number.isFinite(value)) return null;
    const result = formatNumber(value);
    if (!result) return null;
    return {
      expression,
      result,
      reply: `Final answer: ${result}`,
    };
  } catch {
    return null;
  }
}
function classifyQuery(message) {
  const lower = normalizeText(message);

  if (
    /\b(solve|calculate|find the value|simplify|evaluate|prove|derive|integrate|differentiate|equation|formula|percentage|ratio|average|profit|loss|interest|speed|distance|time|probability|permutation|combination|lcm|hcf|gcd|factorial|root|square|cube|triangle|circle|area|volume|perimeter|sin|cos|tan|log|algebra|geometry|trigonometry|mensuration|arithmetic)\b/.test(lower) ||
    /\d+\s*[+\-*/%^]\s*\d+/.test(lower)
  ) {
    return 'math';
  }

  if (
    /\b(who|when|where|which|what is|what are|what was|define|meaning of|capital of|founder of|invented|discovered|established|amendment|article|schedule|treaty|battle of|war of|river|mountain|president|prime minister|governor|chief justice)\b/.test(lower)
  ) {
    return 'factual';
  }

  if (/\b(explain|difference between|compare|distinguish|mechanism|process|concept|theory|principle)\b/.test(lower)) {
    return 'conceptual';
  }

  if (/\b(study plan|strategy|tips|improve|weak|strong|score|accuracy|revision|time management|mock test)\b/.test(lower)) {
    return 'strategy';
  }

  if (/^(hi|hello|hey|hii+|namaste|good morning|good evening|thanks|thank you|ok|okay|bye|good night)\b/.test(lower)) {
    return 'greeting';
  }

  return 'general';
}

function getModelConfig(queryType) {
  switch (queryType) {
    case 'math':
      return {
        models: [
          { id: 'qwen/qwen3-32b', maxTokens: 520, temperature: 0.15, useThinking: true },
          { id: 'llama-3.3-70b-versatile', maxTokens: 520, temperature: 0.15 },
          { id: 'llama-3.1-8b-instant', maxTokens: 520, temperature: 0.15 },
        ],
      };
    case 'factual':
      return {
        models: [
          { id: 'llama-3.3-70b-versatile', maxTokens: 360, temperature: 0.1 },
          { id: 'qwen/qwen3-32b', maxTokens: 360, temperature: 0.1 },
          { id: 'llama-3.1-8b-instant', maxTokens: 360, temperature: 0.1 },
        ],
      };
    case 'greeting':
      return {
        models: [
          { id: 'llama-3.1-8b-instant', maxTokens: 120, temperature: 0.4 },
          { id: 'llama-3.3-70b-versatile', maxTokens: 120, temperature: 0.4 },
        ],
      };
    case 'strategy':
      return {
        models: [
          { id: 'llama-3.3-70b-versatile', maxTokens: 300, temperature: 0.25 },
          { id: 'llama-3.1-8b-instant', maxTokens: 300, temperature: 0.25 },
        ],
      };
    default:
      return {
        models: [
          { id: 'llama-3.3-70b-versatile', maxTokens: 320, temperature: 0.2 },
          { id: 'qwen/qwen3-32b', maxTokens: 320, temperature: 0.2 },
          { id: 'llama-3.1-8b-instant', maxTokens: 320, temperature: 0.2 },
        ],
      };
  }
}

function buildSystemPrompt(queryType) {
  const modeLine = {
    math: 'For math/reasoning: show concise steps and final answer.',
    factual: 'For factual questions: answer first, then one-line context, avoid guessing.',
    conceptual: 'For conceptual questions: definition, key points, and quick example.',
    strategy: 'For strategy: give practical, measurable plan.',
    greeting: 'For greetings: keep it short and natural.',
    general: 'Keep response focused, accurate, and concise.',
  }[queryType] || 'Keep response focused, accurate, and concise.';

  return [
    'You are Mockzam AI, an exam-prep tutor for UPSC, SSC, NDA, CDS, Banking, and State PSC.',
    'Prioritize correctness. If uncertain, say so briefly and suggest verifying with trusted sources.',
    'Answer in under 160 words unless user asks for detail.',
    'Use plain, clear language and short structure.',
    'If user asks about an active test question, explain approach and concept, not direct cheating.',
    'Stay in scope: academics, study strategy, and app-help only.',
    modeLine,
  ].join('\n');
}

function stripThinking(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function postProcess(reply) {
  let cleaned = stripThinking(reply)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (/^you are mockzam ai/i.test(cleaned) || /^as an ai language model/i.test(cleaned)) {
    cleaned = cleaned.replace(/^.*?\n/, '').trim();
  }

  if (!cleaned || cleaned.length < 5) {
    return 'I could not process that clearly. Please rephrase your question.';
  }

  return cleaned;
}

function scoreHistoryEntry(content, messageTerms, index, total) {
  const normalized = normalizeText(content);
  if (!normalized) return -1;

  const terms = new Set(normalized.split(' ').filter((w) => w.length > 2));
  let overlap = 0;
  for (const term of messageTerms) {
    if (terms.has(term)) overlap += 1;
  }

  const recencyBoost = (index + 1) / Math.max(total, 1);
  return overlap * 3 + recencyBoost;
}

function selectRelevantHistory(conversationHistory, message) {
  const cleanHistory = Array.isArray(conversationHistory)
    ? conversationHistory.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    : [];

  const normalizedMessage = normalizeText(message);
  const messageTerms = new Set(normalizedMessage.split(' ').filter((w) => w.length > 2));

  const ranked = cleanHistory
    .map((entry, index) => ({
      entry,
      score: scoreHistoryEntry(entry.content, messageTerms, index, cleanHistory.length),
      index,
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index)
    .map((x) => ({ role: x.entry.role, content: truncate(x.entry.content, 450) }));

  return ranked;
}

function compactContextForPrompt(safeContext) {
  return {
    examType: safeContext.examType,
    currentPage: safeContext.currentPage,
    performanceSummary: safeContext.performanceSummary,
    weakTopics: safeContext.learningProfile?.weakTopics?.slice(0, 5) || [],
    strongTopics: safeContext.learningProfile?.strongTopics?.slice(0, 3) || [],
    currentQuestion: safeContext.currentQuestion
      ? {
          subject: safeContext.currentQuestion.subject,
          topic: safeContext.currentQuestion.topic,
          questionText: truncate(safeContext.currentQuestion.questionText, 220),
        }
      : null,
  };
}

function getCacheKey(uid, queryType, message, safeContext) {
  const normalizedMessage = normalizeText(message);
  const ctx = compactContextForPrompt(safeContext);
  return JSON.stringify({
    uid,
    queryType,
    normalizedMessage,
    examType: ctx.examType,
    currentPage: ctx.currentPage,
  });
}

function cleanupCache() {
  const now = Date.now();

  for (const [key, value] of RESPONSE_CACHE.entries()) {
    if (value.expiresAt <= now) RESPONSE_CACHE.delete(key);
  }

  if (RESPONSE_CACHE.size <= CACHE_MAX_ENTRIES) return;

  const overflow = RESPONSE_CACHE.size - CACHE_MAX_ENTRIES;
  const sorted = [...RESPONSE_CACHE.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  for (let i = 0; i < overflow; i += 1) {
    RESPONSE_CACHE.delete(sorted[i][0]);
  }
}

function getCachedReply(cacheKey) {
  const hit = RESPONSE_CACHE.get(cacheKey);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    RESPONSE_CACHE.delete(cacheKey);
    return null;
  }
  return hit.payload;
}

function setCachedReply(cacheKey, payload) {
  RESPONSE_CACHE.set(cacheKey, {
    payload,
    createdAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  cleanupCache();
}

function sanitizeTopicName(name) {
  return truncate(String(name || '').trim(), 80);
}

function toAccuracy(correct, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(correct || 0) / Number(total)) * 100)));
}

function buildLearningProfileFromTests(tests) {
  const topicMap = {};
  const recentTests = tests.slice(0, 5);
  const olderTests = tests.slice(5, 15);
  const recentAvg = recentTests.length > 0 ? recentTests.reduce((s, t) => s + Number(t.accuracy || 0), 0) / recentTests.length : 0;
  const olderAvg = olderTests.length > 0 ? olderTests.reduce((s, t) => s + Number(t.accuracy || 0), 0) / olderTests.length : 0;
  const trendDelta = Math.round(recentAvg - olderAvg);

  for (const test of tests) {
    if (!test?.topicWise || typeof test.topicWise !== 'object') continue;
    for (const [topic, stats] of Object.entries(test.topicWise)) {
      const name = sanitizeTopicName(topic);
      if (!name) continue;
      if (!topicMap[name]) topicMap[name] = { correct: 0, total: 0 };
      topicMap[name].correct += Number(stats?.correct || 0);
      topicMap[name].total += Number(stats?.total || 0);
    }
  }

  const entries = Object.entries(topicMap)
    .map(([name, d]) => ({ name, correct: d.correct, total: d.total, accuracy: toAccuracy(d.correct, d.total) }))
    .filter((d) => d.total >= 2);

  const weakTopics = entries
    .filter((d) => d.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map(({ name, accuracy }) => ({ name, accuracy }));

  const strongTopics = entries
    .filter((d) => d.accuracy >= 75)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)
    .map(({ name, accuracy }) => ({ name, accuracy }));

  const accuracies = recentTests.map((t) => Number(t.accuracy || 0));
  const mean = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0;
  const variance = accuracies.length > 1 ? accuracies.reduce((s, v) => s + (v - mean) ** 2, 0) / accuracies.length : 0;
  const consistency = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  return {
    trend: trendDelta > 5 ? 'improving' : trendDelta < -5 ? 'declining' : 'stable',
    trendDelta,
    recentAccuracy: Math.round(recentAvg),
    consistency,
    weakTopics,
    strongTopics,
    totalTests: tests.length,
  };
}

function cleanupProfileCache() {
  const now = Date.now();
  for (const [key, value] of USER_PROFILE_CACHE.entries()) {
    if (value.expiresAt <= now) USER_PROFILE_CACHE.delete(key);
  }

  if (USER_PROFILE_CACHE.size <= PROFILE_CACHE_MAX_ENTRIES) return;
  const overflow = USER_PROFILE_CACHE.size - PROFILE_CACHE_MAX_ENTRIES;
  const sorted = [...USER_PROFILE_CACHE.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  for (let i = 0; i < overflow; i += 1) {
    USER_PROFILE_CACHE.delete(sorted[i][0]);
  }
}

function getCachedProfile(uid) {
  const hit = USER_PROFILE_CACHE.get(uid);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    USER_PROFILE_CACHE.delete(uid);
    return null;
  }
  return hit.profile;
}

function setCachedProfile(uid, profile) {
  USER_PROFILE_CACHE.set(uid, {
    profile,
    createdAt: Date.now(),
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
  cleanupProfileCache();
}

async function fetchUserLearningProfile(uid) {
  const cached = getCachedProfile(uid);
  if (cached) return cached;

  const testsRef = admin.firestore().collection('tests');
  let snapshot;

  try {
    snapshot = await testsRef
      .where('userId', '==', uid)
      .where('completed', '==', true)
      .orderBy('endTime', 'desc')
      .limit(20)
      .get();
  } catch {
    snapshot = await testsRef
      .where('userId', '==', uid)
      .where('completed', '==', true)
      .limit(20)
      .get();
  }

  const tests = snapshot.docs.map((doc) => doc.data());
  if (!tests.length) {
    setCachedProfile(uid, null);
    return null;
  }

  const profile = buildLearningProfileFromTests(tests);
  setCachedProfile(uid, profile);
  return profile;
}

function parseLearningProfile(raw) {
  if (!raw) return null;
  try {
    const lp = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!lp || typeof lp !== 'object') return null;
    return {
      trend: truncate(lp.trend || '', 20),
      trendDelta: Number(lp.trendDelta || 0),
      recentAccuracy: Number(lp.recentAccuracy || 0),
      consistency: Number(lp.consistency || 0),
      totalTests: Number(lp.totalTests || 0),
      weakTopics: Array.isArray(lp.weakTopics)
        ? lp.weakTopics.slice(0, 8).map((t) => ({ name: sanitizeTopicName(t?.name), accuracy: Number(t?.accuracy || 0) })).filter((t) => t.name)
        : [],
      strongTopics: Array.isArray(lp.strongTopics)
        ? lp.strongTopics.slice(0, 8).map((t) => ({ name: sanitizeTopicName(t?.name), accuracy: Number(t?.accuracy || 0) })).filter((t) => t.name)
        : [],
    };
  } catch {
    return null;
  }
}

function mergeProfiles(clientProfile, serverProfile) {
  if (!clientProfile && !serverProfile) return null;
  if (!clientProfile) return serverProfile;
  if (!serverProfile) return clientProfile;

  const weakByName = new Map();
  for (const t of [...serverProfile.weakTopics, ...clientProfile.weakTopics]) {
    if (!t?.name) continue;
    const existing = weakByName.get(t.name);
    if (!existing || Number(t.accuracy) < Number(existing.accuracy)) weakByName.set(t.name, t);
  }

  const strongByName = new Map();
  for (const t of [...serverProfile.strongTopics, ...clientProfile.strongTopics]) {
    if (!t?.name) continue;
    const existing = strongByName.get(t.name);
    if (!existing || Number(t.accuracy) > Number(existing.accuracy)) strongByName.set(t.name, t);
  }

  return {
    trend: clientProfile.trend || serverProfile.trend || 'stable',
    trendDelta: clientProfile.trendDelta || serverProfile.trendDelta || 0,
    recentAccuracy: clientProfile.recentAccuracy || serverProfile.recentAccuracy || 0,
    consistency: clientProfile.consistency || serverProfile.consistency || 0,
    totalTests: Math.max(clientProfile.totalTests || 0, serverProfile.totalTests || 0),
    weakTopics: [...weakByName.values()].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    strongTopics: [...strongByName.values()].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5),
  };
}

async function callGroq(messages, modelConfig, groqApiKey) {
  let lastError = null;

  for (const model of modelConfig.models) {
    try {
      const body = {
        model: model.id,
        messages,
        temperature: model.temperature ?? 0.2,
        max_tokens: model.maxTokens ?? 320,
        top_p: 1,
        frequency_penalty: 0.1,
      };

      if (model.useThinking) {
        body.chat_template_kwargs = { enable_thinking: true };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`${model.id} unavailable (${response.status})`);
        continue;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData.error?.message || `${model.id} failed (${response.status})`);
        continue;
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        lastError = new Error(`${model.id} empty response`);
        continue;
      }

      return { reply: postProcess(reply), model: model.id };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All models failed');
}

function shouldVerifyReply(queryType, reply) {
  return (queryType === 'math' || queryType === 'factual') && typeof reply === 'string' && reply.length > 20;
}

async function verifyAndRefineReply({ message, reply, queryType, groqApiKey }) {
  if (!shouldVerifyReply(queryType, reply)) return { reply, verified: false };

  const verifierMessages = [
    {
      role: 'system',
      content: [
        'You are a strict answer verifier.',
        'Check if assistant answer is correct for the user question.',
        'If correct, output exactly: OK',
        'If incorrect or incomplete, output a corrected concise answer only.',
        'Do not include analysis.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Question: ${truncate(message, 500)}\nAssistant answer: ${truncate(reply, 1200)}`,
    },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: verifierMessages,
        temperature: 0,
        max_tokens: 220,
        top_p: 1,
      }),
    });

    if (!response.ok) return { reply, verified: false };

    const data = await response.json();
    const verdict = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!verdict || /^ok$/i.test(verdict)) return { reply, verified: true };

    const refined = postProcess(verdict);
    if (!refined || refined.length < 5) return { reply, verified: false };
    return { reply: refined, verified: true };
  } catch {
    return { reply, verified: false };
  }
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return null;
  }
}

async function isRateLimited(uid) {
  const now = Date.now();
  const bucket = Math.floor(now / RATE_LIMIT_WINDOW);
  const docId = `${uid}_${bucket}`;
  const ref = admin.firestore().collection(RATE_LIMIT_COLLECTION).doc(docId);

  const count = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? snap.data().count || 0 : 0;
    const next = existing + 1;

    tx.set(
      ref,
      {
        uid,
        count: next,
        bucket,
        expiresAt: new Date((bucket + 2) * RATE_LIMIT_WINDOW),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return next;
  });

  return count > RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const originAllowed = !origin || ALLOWED_ORIGINS.includes(origin);

  if (originAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(originAllowed ? 200 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed' });

  if (parseInt(req.headers['content-length'] || '0', 10) > 20480) {
    return res.status(413).json({ error: 'Payload Too Large' });
  }

  const decodedToken = await verifyAuth(req);
  if (!decodedToken) return res.status(401).json({ error: 'Unauthorized' });

  if (await isRateLimited(decodedToken.uid)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  try {
    const { message, conversationHistory = [], context = {} } = req.body || {};

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return res.status(400).json({ error: 'Message is required and must be under 1000 characters.' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ error: 'AI service not configured.' });

    const safeContext = sanitizeContext(context);
    const boundary = classifyBoundary(message);
    const arithmetic = tryEvaluateArithmetic(message);

    if (boundary.violation) {
      return res.status(200).json({
        reply: getBoundaryReply(boundary.type),
        boundary,
        meta: { shortCircuited: true, reason: boundary.type },
      });
    }

    if (isAmbiguous(message)) {
      return res.status(200).json({
        reply: buildClarifyingQuestion(safeContext),
        boundary,
        meta: { shortCircuited: true, reason: 'ambiguous' },
      });
    }

    if (arithmetic) {
      return res.status(200).json({
        reply: arithmetic.reply,
        boundary,
        meta: { shortCircuited: true, reason: 'deterministic_math', expression: arithmetic.expression },
      });
    }

    const clientProfile = parseLearningProfile(safeContext.learningProfile);
    const serverProfile = await fetchUserLearningProfile(decodedToken.uid);
    const mergedProfile = mergeProfiles(clientProfile, serverProfile);
    if (mergedProfile) {
      safeContext.learningProfile = mergedProfile;
    }

    const queryType = classifyQuery(message);
    const modelConfig = getModelConfig(queryType);

    const cacheKey = getCacheKey(decodedToken.uid, queryType, message, safeContext);
    const cached = getCachedReply(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, meta: { ...(cached.meta || {}), cacheHit: true } });
    }

    const systemPrompt = buildSystemPrompt(queryType);
    const messages = [{ role: 'system', content: systemPrompt }];

    messages.push({
      role: 'user',
      content: `Context (personalization only): ${JSON.stringify(compactContextForPrompt(safeContext))}`,
    });

    const relevantHistory = selectRelevantHistory(conversationHistory, message);
    for (const msg of relevantHistory) {
      messages.push(msg);
    }

    messages.push({ role: 'user', content: truncate(message, 1000) });

    const { reply, model } = await callGroq(messages, modelConfig, groqApiKey);
    const verified = await verifyAndRefineReply({ message, reply, queryType, groqApiKey });

    const payload = {
      reply: verified.reply,
      boundary,
      meta: {
        model,
        queryType,
        cacheHit: false,
        historyUsed: relevantHistory.length,
        verified: verified.verified,
      },
    };

    setCachedReply(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Chat API Error:', error);

    if (error.message?.includes('429') || error.message?.includes('unavailable')) {
      return res.status(429).json({ error: 'AI service busy. Try again in a moment.' });
    }

    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}


