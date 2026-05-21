# Mockzam — Complete Study Guide

> Every page, every feature, every module, every possible question with detailed answers. Read this before your demo.

---

## Table of Contents

- [Part A: Architecture & Tech Stack](#part-a-architecture--tech-stack)
- [Part B: Page-by-Page Deep Dive](#part-b-page-by-page-deep-dive)
  - [1. Landing Page](#1-landing-page)
  - [2. Auth / Login](#2-auth--login)
  - [3. Onboarding](#3-onboarding)
  - [4. User Dashboard](#4-user-dashboard)
  - [5. Test Selection](#5-test-selection)
  - [6. Paper Selection (CDS)](#6-paper-selection-cds)
  - [7. Mock Test](#7-mock-test)
  - [8. Practice Mode](#8-practice-mode)
  - [9. Custom Test Setup](#9-custom-test-setup)
  - [10. Custom Test](#10-custom-test)
  - [11. Test Result](#11-test-result)
  - [12. Test History](#12-test-history)
  - [13. Leaderboard](#13-leaderboard)
  - [14. User Bookmarks](#14-user-bookmarks)
  - [15. User Profile](#15-user-profile)
  - [16. AI Chat Widget](#16-ai-chat-widget)
  - [17-23. Admin Panel Pages](#17-23-admin-panel-pages)
  - [24. Legal Pages & 404](#24-legal-pages--404)
- [Part C: Cross-Cutting Systems](#part-c-cross-cutting-systems)
  - [Anti-Cheat System](#anti-cheat-system)
  - [AI System Deep Dive](#ai-system-deep-dive)
  - [Database & Security Rules](#database--security-rules)
  - [Performance & Optimization](#performance--optimization)
  - [PWA & Deployment](#pwa--deployment)
  - [Testing](#testing)

---

# Part A: Architecture & Tech Stack

## Overall Architecture

```
Browser (React 19 SPA)
    ├── Firebase Auth SDK ──→ Google OAuth
    ├── Firestore SDK ──→ Direct reads/writes (security rules enforce access)
    ├── Storage SDK ──→ Profile images
    └── fetch('/api/*') ──→ Vercel Serverless Functions ──→ Groq LLM API
```

**Key insight:** Firebase SDK runs in the browser. No custom backend for data operations. Security is enforced by `firestore.rules` on Firebase's servers.

## Tech Stack Table

| Layer | Tech | Why |
|-------|------|-----|
| UI | React 19 | Hooks, lazy loading, Suspense, Context API |
| Build | Vite 7 | Instant HMR, esbuild (100x faster than Babel), code splitting |
| Styling | Tailwind CSS 3 | Utility-first, dark mode (`dark:` prefix), responsive (`md:`, `lg:`) |
| Animations | Framer Motion | Declarative (`initial`/`animate`/`exit`), spring physics, scroll-linked |
| Auth | Firebase Auth | Google OAuth popup/redirect, JWT tokens, persistence |
| Database | Cloud Firestore | NoSQL documents, security rules, real-time capable |
| Storage | Firebase Storage | Profile images (5MB limit), security rules |
| AI | Groq API | Llama 3.3 70B, Qwen3 32B, Llama 3.1 8B — fast inference |
| Serverless | Vercel Functions | AI endpoints, keeps API keys server-side |
| Hosting | Vercel | CDN, security headers (CSP, HSTS), auto-deploy from Git |
| Testing | Vitest + Testing Library | 265 tests, jsdom environment, co-located test files |
| Linting | ESLint 9 + Prettier | Code quality, formatting, Husky pre-commit hooks |

## Q&A

**Q: Why Firebase over Express/Django?**
A: Speed of development (auth+db+storage out of box), cost (pay per read/write not per server hour), real-time capable. Tradeoff: no JOINs, limited aggregation — we compute stats client-side.

**Q: Why Vite over CRA?**
A: CRA is deprecated. Vite: instant dev startup (native ES modules), HMR in <100ms, esbuild transpilation (10-100x faster), Rollup production builds with tree-shaking.

**Q: Why Tailwind over CSS modules?**
A: Styles co-located with components, consistent design tokens, dark mode with `dark:` prefix, PurgeCSS removes unused utilities, responsive with `sm:`/`md:`/`lg:` prefixes.

**Q: Why Framer Motion?**
A: Declarative animations, `AnimatePresence` for enter/exit, scroll-linked (`useScroll`), spring physics, layout animations (`layoutId`).

**Q: Explain the folder structure.**
A: `pages/` (route components) use `hooks/` (state logic) and `services/` (Firestore CRUD) to fetch data, render `components/` (UI), and call `utils/` (pure functions). `context/` provides global state (auth, theme). `config/` initializes Firebase. `constants/` defines collection names, keys, thresholds.

---

# Part B: Page-by-Page Deep Dive

---

## 1. Landing Page

**File:** `src/pages/Landing.js` | **Route:** `/` | **Access:** Public (logged-in users redirected to dashboard)

### Modules & Functionality

**Module: AuroraCanvas** — Animated wave background
- HTML5 Canvas 2D API, 5 sine waves with different freq/amp/color/speed
- Throttled to 30fps via `requestAnimationFrame` + `FRAME_INTERVAL = 1000/30`
- Pauses when tab hidden (`visibilitychange`), debounced resize, MutationObserver for theme changes
- Device pixel ratio capped at 1.5x for performance
```js
const render = (timestamp) => {
  if (elapsed < FRAME_INTERVAL) { animRef.current = requestAnimationFrame(render); return; }
  for (let wi = 0; wi < waves.length; wi++) {
    for (let x = 0; x <= w; x += step) {
      const y = baseY + Math.sin(x * freq + time * speed) * amp
        + Math.sin(x * freq * 1.8 + time * speed * 0.7) * (amp * 0.4);
      ctx.lineTo(x, y);
    }
    ctx.fillStyle = gradients[wi]; ctx.fill();
  }
};
```

**Module: FloatingParticles** — CSS keyframe animated icons
- 10 particles (book, check, pencil, star, bolt, trophy, cap, globe) with random positions/sizes/durations
- Pure CSS `@keyframes floatUp` — no JS animation overhead
- `aria-hidden="true"` for accessibility

**Module: RotatingText** — Typewriter word cycling
- Cycles through ['Smart Practice', 'Confidence', 'Success', 'Discipline', 'Results'] every 2.8s
- `AnimatePresence mode="wait"` with 3D rotateX enter/exit
- `role="status"` + `aria-live="polite"` for screen readers

**Module: MagneticButton** — CTA with magnetic pull effect
- Tracks mouse distance from button center via `mousemove` on parent
- Within 200px: `strength = 1 - distance/200`, offset = `distX * strength * 0.4`
- Framer Motion `useSpring` smooths movement, springs back on mouse leave
- Disabled on touch devices (`pointer: coarse` media query)

**Module: DemoQuiz** — Interactive quiz without auth
- 5 hardcoded UPSC questions in `DEMO_QUESTIONS` array
- State: `currentQ`, `selected`, `answered`, `score`, `finished`, `results`
- No Firestore calls — pure client-side React state
- Shows score screen with emoji feedback at end

**Module: ScrollProgress** — Scroll progress bar
- `useScroll()` → `scrollYProgress` (0 to 1) → `useSpring` → `scaleX` of fixed gradient bar

**Module: GlowBorder** — Animated gradient border on cards
- CSS `conic-gradient` with `@property --glow-angle` animated via `@keyframes glowRotate`
- Ambient glow with `radial-gradient` pulsing opacity

**Module: TiltCard** — 3D perspective tilt on hover
- Tracks mouse position → maps to `rotateX`/`rotateY` via `useTransform`
- `transformStyle: 'preserve-3d'` for depth effect

### Q&A

**Q: Why lazy-load the landing page?**
A: Logged-in users never see it — `PublicRoute` redirects to dashboard. Only new/logged-out visitors load it, saving ~59KB.

**Q: How does the demo quiz work without authentication?**
A: Questions are hardcoded in `DEMO_QUESTIONS` array. Pure client-side state (`useState`), no Firestore. Lets visitors try the product instantly.

**Q: Is the landing page accessible?**
A: Yes — rotating text has `role="status"` + `aria-live="polite"`, canvas/particles have `aria-hidden="true"`, all buttons are keyboard-focusable, skip-to-content link in App.js.

**Q: How is the canvas performant?**
A: 30fps throttle (not 60), pauses when tab hidden, larger step size on mobile (`step = w < 640 ? 8 : 4`), DPR capped at 1.5, gradients pre-computed outside render loop.

---

## 2. Auth / Login

**File:** `src/pages/auth/Auth.js` + `src/context/AuthContext.js` | **Route:** `/login` | **Access:** Public

### Modules & Functionality

**Module: Google Sign-In Button** — Single auth method
- Shows spinner + "Redirecting..." when loading
- `disabled` when loading to prevent double-clicks
- Framer Motion `whileHover`/`whileTap` for micro-interactions

**Module: AuthContext (loginWithGoogle)** — Core auth logic
```js
// Step 1: Set persistence
await setPersistence(auth, browserLocalPersistence); // survives browser close
// Falls back to browserSessionPersistence if blocked

// Step 2: Check environment
if (isInAppBrowser || isStandalonePwa) → signInWithRedirect
else → signInWithPopup (preferred)

// Step 3: Handle popup result
try {
  const result = await signInWithPopup(auth, provider);
  await ensureGoogleUserProfile(result.user);
} catch (popupError) {
  if (popupError.code === 'auth/popup-closed-by-user') {
    return { success: false, error: 'Sign-in cancelled.' }; // NO redirect fallback
  }
  if (popupFallbackCodes.has(popupError.code)) {
    await signInWithRedirect(auth, provider); // genuine popup failure
  }
}
```

**Module: ensureGoogleUserProfile** — User doc management
```js
// Check if user doc exists
const userDoc = await getDoc(doc(db, 'users', user.uid));
if (userDoc.exists()) {
  // Existing user: update login stats
  await setDoc(userDocRef, { lastLoginAt: new Date().toISOString(), loginCount: count + 1 }, { merge: true });
} else {
  // New user: create profile + email mapping
  await setDoc(doc(db, 'emails', sanitizedEmail), { userId: user.uid, email });
  await setDoc(userDocRef, { userId, name, email, photoURL, targetExam: 'CDS', isAdmin: false, onboardingComplete: false, ... });
}
```

**Module: Session Timeout** — `useSessionTimeout` hook
- Tracks activity: mousemove, keydown, click, scroll, touchstart
- After 30 min inactivity → `signOut(auth)` + toast notification
- Resets timer on any activity

**Module: Route Guards**
- `PublicRoute`: if logged in → redirect to `/dashboard` (or `/onboarding` if not onboarded)
- `ProtectedRoute`: if not logged in → redirect to `/login`; if not onboarded → redirect to `/onboarding`
- `AdminRoute`: if not admin → redirect to `/dashboard`

### Q&A

**Q: Why Google-only? No email/password?**
A: Eliminates password management, reset flows, email verification, brute-force attacks. Every student has Google. One click to sign up.

**Q: Popup vs Redirect — when is each used?**
A: Popup (preferred): normal browsers. Redirect (fallback): in-app browsers (Facebook/Instagram WebView), standalone PWAs, browsers blocking third-party cookies. User-cancelled popup does NOT trigger redirect.

**Q: What's `browserLocalPersistence`?**
A: Stores Firebase auth token in localStorage. User stays logged in after closing browser. Falls back to `browserSessionPersistence` (sessionStorage, tab-only) if localStorage is blocked.

**Q: How do you prevent fake admin accounts?**
A: 5 layers: (1) Firestore rules require `isAdmin: false` on create, (2) rules block users from changing their own `isAdmin`, (3) only existing admins can change `isAdmin`, (4) component-level `if (!isAdmin) return <Navigate>`, (5) `AdminRoute` wrapper in router.

**Q: What's the email deduplication?**
A: `/emails/{sanitizedEmail}` maps email→userId. Email chars `.#$[]/` replaced with `_` (Firestore doc ID restrictions). Prevents duplicate accounts.

**Q: What's `prompt: 'select_account'`?**
A: Forces Google to show account picker every time, even with one account. Without it, Google auto-selects, which confuses users wanting a different account.

---

## 3. Onboarding

**File:** `src/pages/Onboarding.js` | **Route:** `/onboarding` | **Access:** Protected (skipOnboardingCheck)

### Modules & Functionality

**Module: Two-Step Wizard**
- Step 0: "What should we call you?" — text input, min 2 chars, Enter key support
- Step 1: "What are you preparing for?" — 4 exam cards (CDS, CSAT, IAS-GS, IAS-CSAT)
- Progress dots with `layoutId` animation between steps
- `AnimatePresence mode="wait"` — slide right-to-left transitions

**Module: Exam Cards** — Dynamic from `EXAM_PATTERNS`
- Each card: icon + gradient color + exam code + full name
- Selected card: blue border + checkmark badge with `layoutId="exam-selected"` (shared layout animation)

**Module: Save & Redirect**
```js
await updateDoc(doc(db, 'users', currentUser.uid), {
  name: displayName.trim(),
  targetExam: selectedExam,
  onboardingComplete: true,
  updatedAt: new Date().toISOString(),
});
await refreshUserDetails(); // updates React context
navigate('/dashboard');
```

### Q&A

**Q: Why `skipOnboardingCheck` on the route?**
A: `ProtectedRoute` normally redirects to `/onboarding` if `onboardingComplete` is false. Without the skip, it creates an infinite redirect loop (onboarding → onboarding → ...).

**Q: Can the user change their exam later?**
A: Yes, from the Profile page (`/profile`). `targetExam` is just a Firestore field that can be updated anytime.

**Q: What if the Firestore write fails?**
A: `try/catch` shows toast error "Failed to complete setup. Please try again." The `saving` state resets, button re-enables.

---

## 4. User Dashboard

**File:** `src/pages/user/Dashboard.js` | **Route:** `/dashboard` | **Access:** Protected

### Modules & Functionality

**Module: Stats Computation** — All computed client-side from one Firestore query
```js
const snapshot = await getDocs(query(
  collection(db, 'tests'),
  where('userId', '==', currentUser.uid),
  where('completed', '==', true)
));
// Computed: attempted, averageAccuracy, bestScore, totalCorrect, accuracyTrend,
//           subjectBreakdown, streak, weeklyRank
```

**Module: Stats Caching** — In-memory cache with 5-min TTL
```js
const statsCache = { data: null, timestamp: 0, userId: null, examType: null };
// On fetch: check cache first, skip Firestore if fresh
if (statsCache.data && now - statsCache.timestamp < CACHE_TTL) { use cached; return; }
```

**Module: Streak Calculation**
```js
// Normalize test dates to midnight, put in Set
const testDays = new Set(sorted.map(t => { d.setHours(0,0,0,0); return d.getTime(); }));
// Count consecutive days backward from today
let checkDay = today.getTime();
if (!testDays.has(checkDay)) checkDay -= 86400000; // allow yesterday as start
while (testDays.has(checkDay)) { streak++; checkDay -= 86400000; }
```

**Module: Subject Breakdown**
```js
// Iterate per-question responses across all tests
userTests.forEach(t => t.responses.forEach(r => {
  subjectMap[r.subject].total++;
  if (r.selectedAnswer === r.correctAnswer) subjectMap[r.subject].correct++;
}));
// Sort by count, take top 6, compute accuracy %
```

**Module: Weekly Rank** — Reads from leaderboard collection
```js
const weekDocId = `${targetExam}_${yearNumber}_W${weekNumber}`;
const weekDocSnap = await getDoc(doc(db, 'leaderboard', weekDocId));
const entries = weekDocSnap.data().entries || [];
const rankIndex = entries.findIndex(e => e.userId === currentUser.uid);
weeklyRank = rankIndex >= 0 ? rankIndex + 1 : null;
```

**Module: Resume Session Banner** — Reads `activeTestSession` from localStorage
**Module: CDS Paper Session Banner** — Reads `mockPaperSession_CDS_{userId}` from localStorage
**Module: Sparkline** — Pure SVG `<polyline>` chart, no library
**Module: ProgressRing** — SVG circle with `stroke-dashoffset` animation
**Module: SubjectBar** — Horizontal bar with animated width
**Module: QuickActionCard** — Gradient cards for Mock Test / Practice Mode
**Module: RecentTestItem** — Test card with score, accuracy, time, date

### Q&A

**Q: Why compute stats client-side?**
A: Free (no Cloud Function invocations), simple (no aggregation pipelines), fast with caching (5-min TTL, one Firestore read per session). For 1000 users × 50 tests, computation takes <200ms.

**Q: How does the sparkline work?**
A: SVG `<polyline>` — maps accuracy array to x/y coordinates: `x = (i / (len-1)) * width`, `y = height - (val/100) * height`. ~50 lines, no charting library.

**Q: What's the ProgressRing?**
A: SVG circle with `stroke-dasharray = circumference` and `stroke-dashoffset = circumference * (1 - value/100)`. Animated with Framer Motion.

**Q: What's `fetchingRef`?**
A: A `useRef(false)` guard that prevents duplicate concurrent fetches. Set to `true` before fetch, `false` after. Without it, React StrictMode's double-mount would trigger two simultaneous Firestore queries.

---

## 5. Test Selection

**File:** `src/pages/test/TestSelection.js` | **Route:** `/test-selection` | **Access:** Protected

### Modules & Functionality

**Module: Question Count Fetching** — Counts questions per exam type
```js
for (const examKey of Object.keys(EXAM_PATTERNS)) {
  const snapshot = await getDocs(query(collection(db, 'questions'), where('examType', '==', examKey)));
  counts[examKey] = snapshot.size;
}
sessionStorage.setItem('questionCounts', JSON.stringify(counts)); // 5-min cache
```

**Module: ExamCard** — Shows exam info + question count + validation
- Green count if enough questions, amber if not enough
- Red warning "No questions available" if count is 0
- Shows required vs available: "120 questions (need 120)"

**Module: ModeCard** — 3D hover effect cards for Mock/Practice/Custom
- `whileHover={{ y: -4 }}` lift effect
- Selected state: colored ring + background

**Module: Start Validation**
```js
const canStartMock = selectedQuestionCount >= requiredQuestions;
const canStartPractice = selectedQuestionCount > 0;
const canStartCustom = selectedQuestionCount > 0;
```

**Module: Navigation**
- Mock + CDS → `/test/paper-selection` (multi-paper)
- Mock + others → `/test/mock` with `{ examType }`
- Practice → `/test/practice` with `{ examType }`
- Custom → `/test/custom-setup` with `{ examType }`

### Q&A

**Q: Why cache question counts in sessionStorage?**
A: Avoids re-querying Firestore every time user navigates back. 5-min TTL. `sessionStorage` clears on tab close (fresh counts next session).

**Q: What if there aren't enough questions?**
A: Start button is disabled. Shows "Need X, have Y" warning. If 0 questions, shows red "No questions available".

---

## 6. Paper Selection (CDS)

**File:** `src/pages/test/PaperSelection.js` | **Route:** `/test/paper-selection` | **Access:** Protected

### Modules & Functionality

**Module: Multi-Paper Flow** — CDS has 3 papers taken in sequence
- Paper I: English (Morning 9-11 AM)
- Paper II: General Knowledge (Afternoon 12-2 PM)
- Paper III: Elementary Mathematics (Evening 3-5 PM)

**Module: Paper Status Tracking** — localStorage `mockPaperSession_CDS_{userId}`
```json
{
  "completed": { "cds_english": true, "cds_gk": false, "cds_math": false },
  "completedAt": { "cds_english": "2026-04-21T11:00:00" },
  "breakSkipped": {},
  "createdAt": "2026-04-21T09:00:00"
}
```

**Module: Break Enforcement** — 1 hour between papers
```js
const BREAK_DURATION_MS = 60 * 60 * 1000;
const elapsed = Date.now() - new Date(completedAt[prevSection]).getTime();
const breakRemaining = Math.max(0, BREAK_DURATION_MS - elapsed);
// Shows countdown timer during break, "Skip Break" button available
```

**Module: Paper Cards** — Status-aware cards
- Upcoming: gray, locked
- Available (break done): blue, clickable
- On break: amber, countdown timer
- Completed: green, shows score

### Q&A

**Q: Why breaks between papers?**
A: Simulates real CDS exam day — papers are in morning/afternoon/evening shifts with breaks. Builds exam-day stamina.

**Q: Can you skip the break?**
A: Yes, "Skip Break" button is available. Sets `breakSkipped[sectionId] = true`.

**Q: What if the user closes the browser mid-exam?**
A: Paper session is in localStorage. On return, PaperSelection shows which papers are done and which are next.

---

## 7. Mock Test

**File:** `src/pages/test/MockTest.js` | **Route:** `/test/mock` | **Access:** Protected

This is the most complex page in the app. ~1200 lines.

### Modules & Functionality

**Module: Question Fetching & Randomization**
```js
// 1. Fetch all questions for exam type
const snapshot = await getDocs(query(collection(db, 'questions'), where('examType', '==', examType)));
// 2. Validate count
if (allQuestions.length < requiredQuestions) { toast.error('Insufficient questions'); navigate back; }
// 3. Randomize with seeded Fisher-Yates shuffle
const { questions: shuffled, seed } = randomizeTest(allQuestions, examPattern);
// 4. Initialize responses array
const initialResponses = shuffled.map(() => ({
  selectedAnswer: null, visited: false, markedForReview: false, timeSpent: 0, answeredAt: null
}));
```

**Module: Timer** — Countdown with auto-submit
```js
useEffect(() => {
  if (showInstructions || timeRemaining <= 0) return;
  timerRef.current = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) { handleAutoSubmit(); return 0; }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(timerRef.current);
}, [showInstructions]);
```

**Module: Answer Selection & Locking**
```js
const handleAnswerSelect = (answer) => {
  setResponses(prev => {
    const updated = [...prev];
    updated[currentQuestionIndex] = {
      ...updated[currentQuestionIndex],
      selectedAnswer: answer,
      visited: true,
      answeredAt: new Date().toISOString(),
    };
    return updated;
  });
};
// Answer locking: when navigating away, previous answer cannot be changed
// Skipped questions CAN still be answered later
```

**Module: Question Navigation**
- Next/Previous buttons
- Question Palette (grid of numbered buttons)
- Mark for Review toggle
- Keyboard shortcuts: Arrow keys, 1-4 for options, M for mark, Enter for next

**Module: Section Management** (multi-section exams)
```js
// CDS single paper or multi-section exams
const [sections, setSections] = useState([]);
const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
// Each section has: startIndex, endIndex, name, duration
// Section timer runs independently
```

**Module: Session Persistence** — `useTestSession` hook
```js
// Saves every 5 seconds (throttled)
saveSession({
  questions, responses, currentQuestionIndex, timeRemaining,
  sectionTimeRemaining, currentSectionIndex, examType, seed
});
// Also writes lightweight marker to 'activeTestSession'
```

**Module: Anti-Cheat Integration**
```js
const { enterFullscreen, showViolationModal, violationCount, remainingWarnings, resumeTest }
  = useAntiCheat(isTestInProgress, {
    onAutoSubmit: handleViolationAutoSubmit,
    maxFullscreenExits: 2,
  });
// + useVisibilityTracking (tab switch detection)
// + useKeyboardShortcuts (blocks Ctrl+C, F12, PrintScreen)
// + useNavigationBlock (warns before leaving page)
```

**Module: Test Submission**
```js
const submitTest = async () => {
  recordTimeSpent(); // record time on current question
  const scoreData = calculateScore(questions, responses, examPattern);
  const testData = {
    userId: currentUser.uid, examType, mode: 'mock',
    ...scoreData, // score, totalMarks, correct, incorrect, skipped, accuracy, percentage
    timeSpent: totalDuration - timeRemaining,
    startTime, endTime: new Date().toISOString(),
    questions: questions.map(q => q.id), // store question IDs
    responses: responses.map((r, i) => ({
      questionId: questions[i].id, selectedAnswer: r.selectedAnswer,
      correctAnswer: questions[i].correctAnswer, subject: questions[i].subject,
      timeSpent: r.timeSpent,
    })),
    completed: true,
  };
  const testId = await saveTestResult(testData); // writes to Firestore
  clearSession(); // remove from localStorage
  navigate('/test/result', { state: { questions, responses, examType, testMode: 'mock' } });
};
```

**Module: Instructions Screen** — Shown before test starts
- Exam info: name, questions, duration, marks, negative marking
- Red warning: "Fullscreen required • Exiting fullscreen 2 times will auto-submit"
- Amber warning: "Answers lock when you navigate away"
- Collapsible detailed instructions
- "Start Test" button → enters fullscreen

**Module: Submit Confirmation Modal**
- Shows: answered/unanswered/marked counts
- "Are you sure?" with Submit/Cancel buttons

### Q&A

**Q: How does question randomization work?**
A: Seeded Fisher-Yates shuffle. `randomizeTest()` generates a seed from `Date.now()`, uses it to create a deterministic random sequence. Same seed = same order. Options within each question are also shuffled. Seed is saved in session for resume.

**Q: What's answer locking?**
A: Once you navigate to another question, your answer is locked (can't change). This simulates real exam behavior. Implementation: `handleAnswerSelect` only works if the response doesn't already have a `selectedAnswer` (or if it's the current question). Skipped questions (no answer) can still be answered later.

**Q: What happens if the browser crashes?**
A: `useTestSession` saves to localStorage every 5 seconds. On next visit, `loadSavedSession()` finds the saved state, `ResumePrompt` offers Resume/Start Fresh. Resume restores: questions, responses, currentIndex, timeRemaining, seed.

**Q: How does auto-submit work?**
A: Three triggers: (1) Timer reaches 0 → `handleAutoSubmit()`, (2) 2 fullscreen exits → `handleViolationAutoSubmit()`, (3) User clicks Submit. All call `submitTest()`.

**Q: How is time-per-question tracked?**
A: `questionStartRef` records `Date.now()` when a question is shown. `recordTimeSpent()` calculates elapsed time and adds it to `responses[index].timeSpent`. Called on every navigation and on submit.

**Q: What's `useNavigationBlock`?**
A: Uses `window.onbeforeunload` to show browser's native "Leave page?" dialog when test is in progress. Prevents accidental tab close/refresh.

---

## 8. Practice Mode

**File:** `src/pages/test/PracticeMode.js` | **Route:** `/test/practice` | **Access:** Protected

### Differences from Mock Test

| Feature | Mock Test | Practice Mode |
|---------|-----------|---------------|
| Timer | Countdown | None |
| Fullscreen | Enforced | No |
| Anti-cheat | Full | None |
| Answer locking | Yes | No (can change) |
| Feedback | After submit only | Instant per question |
| AI Explanations | On result page | Inline after wrong answer |
| Bookmarks | Available | Available |
| Error Reports | Available | Available |

### Unique Modules

**Module: Instant Feedback**
- After selecting an answer, `QuestionCard` immediately shows:
  - Green highlight on correct option
  - Red highlight on wrong option (if selected)
  - Solution text below options
  - "Get AI Explanation" button for wrong answers

**Module: No Anti-Cheat**
- No `useAntiCheat` hook
- No fullscreen enforcement
- No `useVisibilityTracking`
- Copy/paste allowed

### Q&A

**Q: Why no timer in practice?**
A: Practice is for learning, not testing. Removing time pressure lets students focus on understanding concepts and reading explanations.

**Q: How do AI explanations work here?**
A: When you get a question wrong, "Get AI Explanation" button appears. Calls `generateExplanation()` from `aiService.js` → POST `/api/ai-explanation` → Groq LLM → returns markdown explanation rendered with ReactMarkdown.

---

## 9. Custom Test Setup

**File:** `src/pages/test/CustomTestSetup.js` | **Route:** `/test/custom-setup` | **Access:** Protected

### Modules & Functionality

**Module: Settings Form**
```js
settings = {
  examType: 'CDS',           // Dropdown
  subjects: [],               // Multi-select checkboxes
  topics: [],                 // Multi-select (filtered by subjects)
  difficulty: 'all',          // Easy / Medium / Hard / all
  numberOfQuestions: 20,      // Slider: 5-100
  timeLimit: 30,              // Minutes (0 = no timer)
  hasTimer: true,             // Toggle
  showInstantFeedback: false, // Toggle (practice-like mode)
  shuffleQuestions: true,     // Toggle
  negativeMarking: true,      // Toggle
}
```

**Module: Dynamic Subject/Topic Loading**
```js
// Subjects update when exam type changes
useEffect(() => {
  setAvailableSubjects(getSubjectsByExam(settings.examType));
}, [settings.examType]);
// Topics update when subjects change
useEffect(() => {
  const allTopics = new Set();
  settings.subjects.forEach(s => getTopicsBySubject(s).forEach(t => allTopics.add(t)));
  setAvailableTopics(Array.from(allTopics));
}, [settings.subjects]);
```

**Module: Live Question Count** — Shows available questions matching current filters
```js
// Re-queries Firestore as filters change
const snapshot = await getDocs(query(collection(db, 'questions'),
  where('examType', '==', settings.examType),
  // + subject, difficulty filters
));
setQuestionCount(snapshot.size);
```

### Q&A

**Q: Can you have instant feedback with a timer?**
A: Yes — `showInstantFeedback: true` + `hasTimer: true`. Works like a timed practice session.

**Q: What if fewer questions available than requested?**
A: Shows warning "Only X questions available". Adjusts `numberOfQuestions` to available count.

---

## 10. Custom Test

**File:** `src/pages/test/CustomTest.js` | **Route:** `/test/custom` | **Access:** Protected

### How it differs from MockTest
- Receives `settings` from `location.state` (from CustomTestSetup)
- Timer optional (`settings.hasTimer`)
- Instant feedback optional (`settings.showInstantFeedback`)
- Negative marking optional (`settings.negativeMarking`)
- Anti-cheat only if timer enabled
- Session key: `customTestSession` (separate from mock/practice)
- Questions filtered by settings (subjects, topics, difficulty) then shuffled and sliced

---

## 11. Test Result

**File:** `src/pages/test/TestResult.js` | **Route:** `/test/result` or `/test/result/:testId` | **Access:** Protected

### Modules & Functionality

**Module: Data Loading** — Two sources
```js
// Source 1: Navigation state (immediate after test)
const questions = location.state?.questions;
const responses = location.state?.responses;

// Source 2: URL param (viewing past results)
const { testId } = useParams();
if (testId) {
  const testDoc = await getDoc(doc(db, 'tests', testId));
  const questionIds = testDoc.data().questions;
  // Fetch each question doc
  const questionDocs = await Promise.all(questionIds.map(id => getDoc(doc(db, 'questions', id))));
}
```

**Module: Score Display**
- Score / Total Marks with percentage
- Correct / Incorrect / Skipped counts
- Accuracy percentage with color coding

**Module: Percentile Calculation**
```js
const allTests = await getDocs(query(
  collection(db, 'tests'), where('examType', '==', examType), where('completed', '==', true)
));
const scores = allTests.docs.map(d => d.data().accuracy);
const belowMe = scores.filter(s => s < myAccuracy).length;
const percentile = (belowMe / scores.length) * 100;
```

**Module: AI Explanations** — On-demand per question
```js
const handleGetExplanation = async (index) => {
  setLoadingAi(prev => ({ ...prev, [index]: true }));
  const explanation = await generateExplanation({
    questionText, options, correctAnswer, userAnswer, subject, topic
  });
  setAiExplanations(prev => ({ ...prev, [index]: explanation }));
};
// Rendered with ReactMarkdown
```

**Module: Solutions Section** — Expandable per-question review
- Filter: all / correct / incorrect / skipped
- Each question shows: text, options (green=correct, red=wrong), solution, AI explanation button
- Scroll-to-solutions on toggle

**Module: Next Step Recommendation**
- Low accuracy → "Practice weak topics" with link
- High accuracy → "Take another mock test"
- Based on weakest subject from responses

### Q&A

**Q: How does it work for past tests?**
A: URL has `:testId` → fetch test doc from Firestore → get question IDs array → fetch each question doc → reconstruct full view. Handles missing questions gracefully.

**Q: What if the test doc doesn't exist?**
A: Shows toast "Test result not found" and redirects to dashboard.

---

## 12. Test History

**File:** `src/pages/test/TestHistory.js` | **Route:** `/test/history` | **Access:** Protected

### Modules & Functionality

**Module: History List**
```js
const q = query(
  collection(db, 'tests'),
  where('userId', '==', currentUser.uid),
  where('completed', '==', true),
  orderBy('endTime', 'desc')
);
```
- Each item: exam type badge, score, accuracy, time taken, date
- Click → fetch question docs → navigate to `/test/result/:testId`
- Loading skeleton, empty state

### Q&A

**Q: Why fetch question docs on click instead of storing them in the test doc?**
A: Storage efficiency. Questions are large (text + 4 options + solution). Storing IDs (array of strings) is much smaller. Questions are fetched on demand only when viewing a specific result.

---

## 13. Leaderboard

**File:** `src/pages/user/Leaderboard.js` | **Route:** `/leaderboard` | **Access:** Protected

### Modules & Functionality

**Module: Ranking Algorithm**
```js
// 1. Fetch completed tests for exam type
// 2. Group by userId — keep best score per user
const userBestMap = {};
tests.forEach(test => {
  if (!userBestMap[test.userId] || test.percentage > userBestMap[test.userId].percentage) {
    userBestMap[test.userId] = test;
  }
});
// 3. Sort: score desc, time asc (tiebreaker)
const sorted = Object.values(userBestMap)
  .sort((a, b) => b.percentage - a.percentage || a.timeSpent - b.timeSpent);
// 4. Enrich with user profile (name, photo)
```

**Module: Week Navigation**
- Current week + previous weeks dropdown
- ISO week calculation with `date-fns`: `startOfWeek`, `getISOWeek`, `getISOWeekYear`
- Past weeks check `/leaderboard/{examType_year_Wweek}` for cached snapshots

**Module: Leaderboard Cache** — In-memory `Map` with 5-min TTL
- Key: `${examType}_${weekOffset}`
- Prevents re-fetching on exam type/week changes

### Q&A

**Q: How is "best score" determined?**
A: Highest `percentage` (accuracy) among all completed tests for that exam type. Tiebreaker: less time spent wins.

**Q: Why not real-time leaderboard?**
A: Cost. Real-time listeners on the `tests` collection would fire on every test submission across all users. Weekly snapshots + client-side computation is much cheaper.

---

## 14. User Bookmarks

**File:** `src/pages/user/Bookmarks.js` | **Route:** `/bookmarks` | **Access:** Protected

### Modules & Functionality

**Module: Bookmark Fetching** — Joins bookmark + question data
```js
const bookmarks = await getUserBookmarks(userId, examType);
const questionDocs = await Promise.all(
  bookmarks.map(b => getDoc(doc(db, 'questions', b.questionId)))
);
```

**Module: BookmarkCard** — Expandable question card
- Collapsed: question text preview + exam type + date
- Expanded: full question, all options, correct answer highlighted, solution
- Handles different option formats (object `{A,B,C,D}` vs array)
- Remove bookmark button

### Q&A

**Q: When are bookmarks created?**
A: During any test mode (mock/practice/custom). `QuestionCard` has a bookmark toggle button. `useBookmarks` hook handles the CRUD via `bookmarkService.js`.

**Q: How does the bookmark toggle work?**
A: `toggleBookmark(userId, questionId, examType, existingId)` — if `existingId` exists, removes it. If null, creates new bookmark. Returns `{ action: 'added'|'removed', id }`.

---

## 15. User Profile

**File:** `src/pages/user/Profile.js` | **Route:** `/profile` | **Access:** Protected

### Modules & Functionality

**Module: Profile Photo Upload**
```js
// 1. User selects image → FileReader → base64 preview
// 2. Crop with react-easy-crop → pixel coordinates
// 3. createCroppedImage() → canvas 200x200 → JPEG compression
//    Iteratively reduces quality until < 100KB
// 4. Upload to Firebase Storage: /profiles/{userId}/{timestamp}.jpg
// 5. getDownloadURL() → update Firestore user doc
// 6. Delete old photo (best effort)
// Fallback: if Storage not configured, stores base64 as photoURL directly
```

**Module: Image Compression**
```js
const createCroppedImage = async (imageSrc, pixelCrop, maxSize = 200, quality = 0.8) => {
  canvas.width = maxSize; canvas.height = maxSize;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, maxSize, maxSize);
  let q = quality;
  const tryCompress = () => {
    const base64 = canvas.toDataURL('image/jpeg', q);
    if ((base64.length * 0.75) / 1024 > 100 && q > 0.3) { q -= 0.1; tryCompress(); }
    else resolve(base64);
  };
};
```

**Module: Profile Editing** — Name, target exam, theme, logout

### Q&A

**Q: What if Firebase Storage isn't set up?**
A: The upload catches the error and falls back to storing base64 image as `photoURL` in Firestore. Works fine, just larger doc size (~50-100KB vs a URL string).

**Q: How is the photo URL validated?**
A: `getSafePhotoURL()` in `avatarUtils.js` checks for valid protocols (https, data:), blocks `javascript:` URLs (XSS prevention), returns null for invalid URLs. Avatar falls back to first letter of name.

---

## 16. AI Chat Widget

**File:** `src/components/ui/AiChatWidget.js` | **Access:** Floating on all pages (hidden during tests/admin/login)

### Modules & Functionality

**Module: Chat Interface**
- Floating button (bottom-right) → expandable panel
- Message list with user/AI bubbles
- Input field + send button + voice input button
- Loading animation (typing indicator)
- Copy message, clear chat, close

**Module: Message Flow**
```js
User types message
  → sanitizeInput() — strip HTML tags, collapse whitespace, limit 1000 chars
  → sendChatMessage() (chatService.js)
    → Client-side rate limit check (aiRequestLimiter)
    → Get Firebase auth token (auth.currentUser.getIdToken())
    → POST /api/ai-chat { message, conversationHistory (last 10), context }
    → Server: verify token → rate limit (20/min) → classify query → pick model → call Groq → return
  → sanitizeMarkdown() — strip scripts, iframes, images, JS links
  → Render with ReactMarkdown (lazy-loaded)
```

**Module: Context Awareness**
```js
const chatContext = {
  userName: userDetails?.name,
  examType: userDetails?.targetExam,
  currentPage: location.pathname,
  // + currentQuestion (if on test page)
  // + learningProfile (weak/strong topics from test history)
  // + performanceSummary
};
```

**Module: Voice Input** — Web Speech API
```js
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
rec = new SR();
rec.continuous = false; rec.interimResults = true; rec.lang = 'en-IN';
rec.onresult = (e) => { /* accumulate transcript */ };
rec.onerror = (e) => { /* handle: not-allowed, network, audio-capture */ };
// Auto-stop after 3s silence (sttSilenceRef timeout)
// Secure context check (requires HTTPS)
// Microphone permission request
```

**Module: Text-to-Speech** — Web Speech Synthesis
- Splits AI response into sentences
- Speaks each sentence sequentially with 60ms gap
- Stop button to cancel

**Module: User Stats** — Shows test count + accuracy in chat header
```js
// Fetches from Firestore with index fallback
const snap = await getDocs(query(
  collection(db, 'tests'), where('userId', '==', uid),
  where('completed', '==', true), orderBy('endTime', 'desc'), limit(20)
));
```

**Module: Boundary Enforcement**
- Server detects jailbreak/unsafe content → returns boundary flag
- Client tracks violations: 3 off-topic messages → chat closes with warning
- `violationCountRef` persists across messages

**Module: Markdown Sanitization**
```js
const sanitizeMarkdown = (md) => (md || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/!\[.*?\]\(.*?\)/g, '')                    // Remove images
  .replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '$1') // Strip JS links
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<video|<audio|<embed|<object|<source|<picture|<img|<canvas/gi, '');
```

### Q&A

**Q: Why lazy-load ReactMarkdown?**
A: It's 30KB+. Only loaded when chat is opened, not on every page load.

**Q: How does query classification work on the server?**
A: Regex-based classification in `/api/ai-chat.js`:
- Math: keywords like `solve`, `calculate`, `percentage`, or patterns like `\d+\s*[+\-*/]\s*\d+`
- Factual: `who`, `when`, `where`, `what is`, `define`, `capital of`
- Conceptual: `explain`, `why`, `how does`, `difference between`
- Greeting: `hi`, `hello`, `thanks`, `bye`
- Each type gets a different model chain and system prompt

**Q: Why 3 models in a chain?**
A: Cost and reliability. Qwen3-32B is best for math (has thinking mode) but expensive and rate-limited. If it returns 429/503, falls back to Llama-70B (good general), then 8B (fast, cheap). Users always get a response.

**Q: What's the arithmetic evaluator?**
A: The server has a built-in RPN (Reverse Polish Notation) parser that evaluates simple math expressions like `2+3*4`. If the user asks "what is 25% of 400", it computes the answer directly without calling the LLM. Faster and more accurate for simple calculations.

**Q: How is rate limiting implemented?**
A: Two layers:
1. Client-side: `aiRequestLimiter` in `securityUtils.js` — sliding window, blocks if too many requests
2. Server-side: Firestore collection `rateLimits` — per-user, per-minute bucket. `isRateLimited(uid)` uses a Firestore transaction to atomically increment the counter.

---

## 17-23. Admin Panel Pages

### 17. Admin Dashboard (`src/pages/admin/Dashboard.js`)
- Route: `/admin/dashboard`
- Shows: total questions, total users, tests taken (parallel `getDocs` on 3 collections)
- Navigation cards to all admin tools
- Double-guarded: `AdminRoute` + component-level `if (!isAdmin) return <Navigate>`

### 18. Add Question (`src/pages/admin/AddQuestion.js`)
- Route: `/admin/add-question`
- Form: examType → subject (auto-populated from `getSubjectsByExam`) → topic (from `getTopicsBySubject`) → subtopic → difficulty → questionText → options A/B/C/D → correctAnswer → solution → tags
- `sanitizeForStorage()` on all text fields before saving
- `addDoc(collection(db, 'questions'), {...})` → `logAdminAction('add_question', {...})`

### 19. Manage Questions (`src/pages/admin/ManageQuestions.js`)
- Route: `/admin/manage-questions`
- Fetches ALL questions from Firestore (no pagination at DB level — client-side filtering)
- Filters: examType, subject, difficulty, search text
- Client-side pagination: 20 per page with `useMemo` for slicing
- Edit modal: inline editing of all fields → `updateDoc` → audit log
- Delete: confirmation modal → `deleteDoc` → audit log

### 20. Bulk Upload (`src/pages/admin/BulkUpload.js`)
- Route: `/admin/bulk-upload`
- Accepts CSV files only (`.csv` extension check)
- Parses with PapaParse (`header: true, skipEmptyLines: true`)
- Validates each row: required fields, valid examType, valid correctAnswer (A/B/C/D)
- Preview table with valid/invalid counts
- Batch write: `addDoc` for each valid row → audit log with count
- Download template CSV button

### 21. Users (`src/pages/admin/Users.js`)
- Route: `/admin/users`
- Fetches all users ordered by `createdAt desc`
- Search by name/email
- Toggle admin: `updateDoc(userRef, { isAdmin: !current })` → confirmation modal → audit log
- Delete user: `deleteDoc` → confirmation modal → audit log
- `isSuperAdmin` check for certain destructive actions

### 22. Error Reports (`src/pages/admin/ErrorReports.js`)
- Route: `/admin/error-reports`
- Fetches all error reports + joins with question docs + user docs
- Filter by status: all / pending / reviewed / resolved / rejected
- Admin can: add notes (textarea per report), change status (dropdown), delete
- `updateDoc(reportRef, { status, adminNote, reviewedAt, reviewedBy })` → audit log

### 23. Admin Bookmarks (`src/pages/admin/Bookmarks.js`)
- Route: `/admin/bookmarks`
- Fetches ALL bookmarks + joins with question docs + user docs
- Filter by status: all / reviewed / unreviewed
- Admin can: add notes, mark as reviewed, delete
- Shows: question text, user name, exam type, date, admin notes

### Q&A for Admin Panel

**Q: Why fetch ALL questions/users/reports client-side instead of paginated queries?**
A: Simplicity. For an admin panel with <10K questions and <1K users, fetching all docs is fast (<500ms) and enables instant client-side filtering/search without additional Firestore queries. If the dataset grows, we'd add server-side pagination with `startAfter()`.

**Q: What's audit logging?**
A: Every admin action (add/edit/delete question, toggle admin, resolve report) calls `logAdminAction(action, details)` which writes to `/auditLogs/{logId}` with: `{ action, details, adminId, adminEmail, timestamp }`. This creates an immutable trail of who did what and when.

**Q: How does bulk upload validation work?**
A: Each CSV row is checked for: (1) required fields present (examType, questionText, options, correctAnswer), (2) examType matches known patterns, (3) correctAnswer is A/B/C/D, (4) all text fields are sanitized with `sanitizeForStorage()`. Invalid rows are shown in red in the preview.

---

## 24. Legal Pages & 404

### Terms of Service (`/terms`) & Privacy Policy (`/privacy`)
- Static content pages, no data fetching
- Required for Google OAuth compliance
- Cover: service overview, data collection, AI usage, user rights
- Link to GitHub issues for support

### 404 Not Found (`*` catch-all route)
- Shows "404 Page not found"
- Two buttons: "Go Back" (`navigate(-1)`) and "Dashboard" (`navigate('/dashboard')`)

---

# Part C: Cross-Cutting Systems

---

## Anti-Cheat System

Active during Mock Test and Custom Test (when timer is enabled).

### Components

| Hook/Component | What it does |
|---------------|-------------|
| `useAntiCheat` | Fullscreen enforcement, violation counting, auto-submit trigger |
| `useVisibilityTracking` | Tab switch (`visibilitychange`) + window blur detection |
| `useKeyboardShortcuts` | Blocks Ctrl+C/V/A, F12, PrintScreen, context menu |
| `ViolationModal` | Warning popup when fullscreen is exited |

### How Fullscreen Works
```js
// Enter fullscreen
const enterFullscreen = async () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) await elem.requestFullscreen();
  else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
  wasFullscreenRef.current = true;
};

// Detect fullscreen exit
document.addEventListener('fullscreenchange', () => {
  const isFS = !!document.fullscreenElement;
  if (wasFullscreenRef.current && !isFS && isActiveRef.current) {
    // Violation! User exited fullscreen
    violationCountRef.current++;
    setShowViolationModal(true);
    if (violationCountRef.current >= maxFullscreenExits) {
      onAutoSubmitRef.current(); // auto-submit test
    }
  }
});
```

### How Tab Switch Detection Works
```js
// useVisibilityTracking
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    handleViolation('tab_switch');
    onTabSwitchRef.current?.();
  }
});
window.addEventListener('blur', () => {
  handleViolation('window_blur');
  onWindowBlurRef.current?.();
});
```

### How Keyboard Blocking Works
```js
// Blocked keys during test
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && ['c','v','a','p','s','u'].includes(e.key.toLowerCase())) e.preventDefault();
  if (['F12','PrintScreen'].includes(e.key)) e.preventDefault();
});
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('cut', e => e.preventDefault());
document.addEventListener('paste', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
```

### Q&A

**Q: Can a tech-savvy user bypass the anti-cheat?**
A: Yes — client-side anti-cheat is a deterrent, not a guarantee. A user could disable JavaScript, use browser dev tools, or modify localStorage. For a competitive exam platform, server-side proctoring (webcam, screen recording) would be needed. Our approach is appropriate for a practice/mock test platform.

**Q: Why 2 fullscreen exits before auto-submit?**
A: Balance between strictness and usability. Accidental Escape key press or notification popup can trigger a fullscreen exit. 1 warning is too strict (false positives). 3 is too lenient. 2 gives one genuine warning before consequences.

**Q: Does tab switch detection work on mobile?**
A: `visibilitychange` works on mobile browsers. `blur` is less reliable on mobile. The combination covers most scenarios.

---

## AI System Deep Dive

### Architecture
```
Browser → POST /api/ai-chat → Vercel Serverless Function
  → Verify Firebase auth token (admin SDK)
  → Server-side rate limit (Firestore counter: 20 req/min)
  → Classify query (regex-based)
  → Check boundary (jailbreak/unsafe detection)
  → Try arithmetic evaluation (RPN parser for simple math)
  → Select model chain based on query type
  → Call Groq API with fallback chain
  → Strip <think> tags (Qwen3 thinking mode)
  → Post-process (clean whitespace, validate length)
  → Return { reply, boundary, meta }
```

### Model Routing
```js
const modelChains = {
  math: [
    { id: 'qwen/qwen3-32b', maxTokens: 1024, temperature: 0.2, useThinking: true },
    { id: 'llama-3.3-70b-versatile', maxTokens: 1024, temperature: 0.2 },
    { id: 'llama-3.1-8b-instant', maxTokens: 1024, temperature: 0.2 },
  ],
  factual: [
    { id: 'llama-3.3-70b-versatile', maxTokens: 1024, temperature: 0.15 },
    { id: 'llama-3.1-8b-instant', maxTokens: 1024, temperature: 0.15 },
  ],
  greeting: [
    { id: 'llama-3.1-8b-instant', maxTokens: 256, temperature: 0.5 },
  ],
  general: [
    { id: 'llama-3.3-70b-versatile', maxTokens: 1024, temperature: 0.3 },
    { id: 'llama-3.1-8b-instant', maxTokens: 1024, temperature: 0.3 },
  ],
};
```

### Query Classification (Regex)
```js
if (/\b(solve|calculate|percentage|ratio|probability|algebra)\b/.test(lower)) queryType = 'math';
else if (/\b(who|when|where|what is|define|capital of)\b/.test(lower)) queryType = 'factual';
else if (/\b(explain|why|how does|difference between)\b/.test(lower)) queryType = 'conceptual';
else if (/^(hi|hello|hey|thanks|bye)\b/.test(lower)) queryType = 'greeting';
```

### System Prompt (condensed)
```
You are Mockzam AI, expert tutor for UPSC/SSC/NDA/CDS exams.
RULES: Accuracy first. Step-by-step for math. Bold key terms. Under 200 words.
MATH MODE: Show every step. Verify by substitution.
FACTUAL MODE: Direct answer first, then context.
BOUNDARIES: Only academics. Off-topic → "Ask me a study question 📖"
```

### Rate Limiting
```js
// Server-side: Firestore transaction
const bucket = Math.floor(Date.now() / 60000); // 1-min window
const docId = `${uid}_${bucket}`;
const ref = admin.firestore().collection('rateLimits').doc(docId);
const count = await admin.firestore().runTransaction(async (tx) => {
  const snap = await tx.get(ref);
  const next = (snap.exists ? snap.data().count : 0) + 1;
  tx.set(ref, { uid, count: next, bucket, expiresAt: ... }, { merge: true });
  return next;
});
return count > 20; // rate limited
```

### Q&A

**Q: Why Groq instead of OpenAI?**
A: Speed and cost. Groq runs LLMs on custom LPU hardware — inference is 5-10x faster than GPU-based providers. Free tier is generous (30 req/min). For an exam prep app where students expect instant answers, latency matters.

**Q: Why not call Groq directly from the browser?**
A: The API key would be exposed in browser network tab. Anyone could steal it and use your quota. Serverless functions keep the key server-side. They also add auth verification and rate limiting.

**Q: What's the thinking mode for Qwen3?**
A: `chat_template_kwargs: { enable_thinking: true }` makes Qwen3 output its reasoning in `<think>...</think>` tags before the final answer. We strip these tags before returning to the user. This improves math accuracy significantly.

**Q: How does the fallback chain work?**
A: If a model returns HTTP 429 (rate limited) or 503 (unavailable), we skip it and try the next model. The loop continues until one succeeds or all fail. If all fail, return 429 to the client with "AI service busy."

**Q: What's boundary detection?**
A: Server checks for: (1) Jailbreak: "ignore previous instructions", "reveal prompt", "developer instructions" → returns canned response. (2) Unsafe: explicit content keywords → returns "I can help only with study questions." (3) Ambiguous: very short/vague messages → asks for clarification.

---

## Database & Security Rules

### Firestore Collections Summary

| Collection | Docs | Written By | Read By | Key Fields |
|-----------|------|-----------|---------|------------|
| `users` | User profiles | Auth flow, user, admin | Any signed-in | name, email, targetExam, isAdmin, onboardingComplete |
| `questions` | Question bank | Admin only | Any signed-in | examType, subject, topic, questionText, options, correctAnswer, solution |
| `tests` | Test results | User on submit | Owner, completed, admin | userId, examType, score, accuracy, responses[], completed |
| `bookmarks` | Saved questions | User | Owner, admin | userId, questionId, examType, note |
| `errorReports` | Question errors | User | Admin only | userId, questionId, description, status |
| `emails` | Email→UID map | Auth flow | Admin only | userId, email |
| `leaderboard` | Weekly snapshots | Admin/CF | Any signed-in | entries[] |
| `auditLogs` | Admin actions | Admin | Admin only | action, details, adminId, timestamp |
| `rateLimits` | AI chat limits | Serverless (admin SDK) | None | uid, count, bucket |

### Security Rules Key Patterns

```js
// Users: can't self-promote to admin
allow update: if isOwner(userId) && isValidOwnerUserUpdate();
// isValidOwnerUserUpdate checks: isAdmin NOT in changed fields

// Questions: read-only for users
allow read: if isSignedIn();
allow create, update, delete: if isAdmin();

// Tests: users can only create their own
allow create: if isSignedIn() && incomingData().userId == request.auth.uid;

// Bookmarks: scoped to owner
allow read: if resource.data.userId == request.auth.uid || isAdmin();
allow create: if incomingData().userId == request.auth.uid;

// Audit logs: immutable
allow create: if isAdmin();
allow update, delete: if false;
```

### Q&A

**Q: How do security rules work?**
A: Every Firestore read/write from the client SDK passes through security rules on Firebase's servers. Rules are declarative — they check `request.auth` (who's asking), `request.resource.data` (what they're writing), and `resource.data` (what exists). If the rule returns `false`, the operation is denied. Admin SDK (used by serverless functions) bypasses rules entirely.

**Q: Can a user read other users' test results?**
A: Yes, but only completed tests (for leaderboard). The rule: `allow read: if resource.data.userId == request.auth.uid || resource.data.completed == true || isAdmin()`.

**Q: What prevents a user from writing fake test scores?**
A: The `create` rule only checks `incomingData().userId == request.auth.uid`. A user could theoretically write a fake test doc with inflated scores. For a production app, you'd validate scores server-side (Cloud Function trigger). For a mock test platform, this is acceptable — users are only cheating themselves.

---

## Performance & Optimization

### Code Splitting
- 23 pages lazy-loaded with `React.lazy()` + `Suspense`
- Only Auth and Dashboard are eagerly loaded (most common entry points)
- Vendor chunks: `vendor-react` (67KB), `vendor-firebase` (370KB), `vendor-ui` (282KB), `vendor-date` (12KB), `vendor-utils` (25KB)

### Caching Strategy
| What | Where | TTL | Purpose |
|------|-------|-----|---------|
| Dashboard stats | In-memory (`statsCache`) | 5 min | Avoid re-fetching on navigation |
| Question counts | sessionStorage | 5 min | TestSelection page |
| Leaderboard data | In-memory (`Map`) | 5 min | Avoid re-fetching on filter change |
| AI explanations | In-memory (`Map`) | Session | Avoid duplicate API calls (max 100) |
| AI chat stats | sessionStorage | 10 min | Chat widget user stats |
| Questions by exam | In-memory (`Map`) | 5 min | questionService cache |

### React Optimizations
- `memo()` on QuestionCard, Timer, QuestionPalette (prevent re-renders)
- `useCallback` on all event handlers passed as props
- `useMemo` on computed values (filtered lists, sorted arrays)
- `useRef` for values that shouldn't trigger re-renders (timer refs, fetch guards)
- Lazy-loaded ReactMarkdown in chat widget

### Canvas/Animation Optimizations
- Aurora canvas: 30fps throttle, pauses when hidden, DPR capped at 1.5
- Floating particles: CSS keyframes (no JS animation overhead)
- `will-change` and `transform` for GPU-accelerated animations

### Q&A

**Q: What's the largest bundle chunk?**
A: `vendor-firebase` at 370KB (gzipped: 114KB). Firebase SDK is large but tree-shaking removes unused modules. We only import `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`.

**Q: How do you prevent unnecessary re-renders?**
A: (1) `memo()` on frequently-rendered components, (2) `useCallback` on handlers, (3) `useMemo` on computed values, (4) `useRef` for mutable values that don't need re-renders, (5) Context split (Auth and Theme are separate contexts).

---

## PWA & Deployment

### PWA Features
- `manifest.json`: app name, icons (SVG + PNG 192px), theme color, shortcuts
- Install banner: custom prompt for Chrome's `beforeinstallprompt` event
- iOS fallback: manual "Add to Home Screen" instructions
- Standalone mode detection: `window.matchMedia('(display-mode: standalone)')`

### Deployment Pipeline
```
git push → Vercel auto-deploys
  → npm run build (vite build)
  → Output: dist/ (static files + serverless functions)
  → CDN distribution with security headers
```

### Security Headers (vercel.json)
- `Content-Security-Policy` — restricts script/style/connect sources
- `X-Frame-Options: DENY` — prevents clickjacking
- `Strict-Transport-Security` — enforces HTTPS
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — needed for Google Auth popup

### Q&A

**Q: Why Vercel over Firebase Hosting?**
A: Vercel provides serverless functions natively (for AI endpoints). Firebase Hosting would require Cloud Functions (separate billing, cold starts). Vercel also has better DX (auto-deploy from Git, preview deployments).

**Q: What's the CSP header doing?**
A: Content Security Policy restricts what resources the browser can load. Our CSP allows: scripts from self + Google APIs, styles from self + Google Fonts, connections to Firebase + Groq + Google, frames from Firebase (for auth). This prevents XSS attacks.

---

## Testing

### Setup
- **Framework:** Vitest (Vite-native, compatible with Jest API)
- **Environment:** jsdom (simulates browser DOM in Node.js)
- **Libraries:** @testing-library/react, @testing-library/user-event, @testing-library/jest-dom
- **Config:** `vitest.config` in `vite.config.js` → `test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.js' }`

### Test Coverage
- 25 test files, 265 tests, all passing
- Tests cover: hooks (useAntiCheat, useTimer, useTestState, useLocalStorage, useVisibilityTracking, useKeyboardShortcuts), services (questionService, testService, bookmarkService), components (ErrorBoundary, Modal, QuestionCard, Timer, LoadingSkeleton, StatsCard), utils (examPatterns, securityUtils, testUtils, errorTracking, logger, performance), pages (MockTest, TestResult, Dashboard), context (ThemeContext)

### Test Patterns
```js
// Component test example
it('should call onAnswerSelect when option is clicked', () => {
  render(<QuestionCard {...defaultProps} />);
  const optionB = screen.getByRole('radio', { name: /Option B/ });
  fireEvent.click(optionB);
  expect(defaultProps.onAnswerSelect).toHaveBeenCalledWith('B');
});

// Hook test example
it('should start and count down', () => {
  const { result } = renderHook(() => useTimer(60, onExpire));
  act(() => result.current.start());
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.timeRemaining).toBe(59);
});

// Service test example (mocked Firestore)
it('should fetch questions by exam type', async () => {
  getDocs.mockResolvedValue({ docs: [{ id: '1', data: () => mockQuestion }] });
  const result = await fetchQuestionsByExam('CDS');
  expect(result).toHaveLength(1);
});
```

### Q&A

**Q: Why Vitest over Jest?**
A: Vitest is Vite-native — shares the same config, uses the same transform pipeline, supports ESM natively. Jest requires separate Babel config and doesn't understand Vite's import.meta.env. Vitest is also faster (parallel execution, no cold start).

**Q: How are Firestore calls mocked in tests?**
A: `src/setupTests.js` mocks the entire `firebase/firestore` module with `vi.mock()`. Each test sets up specific return values with `getDocs.mockResolvedValue()`, `getDoc.mockResolvedValue()`, etc.

**Q: Why co-located test files?**
A: Tests in `__tests__/` folders next to their source files. Benefits: easy to find tests for a component, tests move with the component if refactored, clear ownership.
