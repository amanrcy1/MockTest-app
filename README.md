# Mockzam — Smart Mock Test Platform

Practice smarter. Score higher. Track everything.

[![Live Demo](https://img.shields.io/badge/Live_Demo-amanrcy.vercel.app-blue?style=for-the-badge)](https://amanrcy.vercel.app)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)](https://vercel.com)

---

## Table of Contents

1. [What is Mockzam](#what-is-mockzam)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Authentication Flow](#authentication-flow)
8. [Test Modes](#test-modes)
9. [AI System](#ai-system)
10. [Anti-Cheat System](#anti-cheat-system)
11. [Database Design](#database-design)
12. [Security](#security)
13. [Routing & Navigation](#routing--navigation)
14. [Custom Hooks](#custom-hooks)
15. [Services Layer](#services-layer)
16. [Admin Panel](#admin-panel)
17. [PWA Features](#pwa-features)
18. [Build & Deployment](#build--deployment)
19. [Testing](#testing)
20. [Scripts Reference](#scripts-reference)

---

## What is Mockzam

Mockzam is a full-stack mock test platform built for UPSC aspirants preparing for competitive exams like CDS, IAS Prelims (GS & CSAT), and CSAT. It provides:

- 5000+ real exam-pattern questions across 4 exam types
- Three test modes: Mock (full exam simulation), Practice (learn at your pace), Custom (pick your own questions)
- AI-powered doubt resolution chat and per-question explanations using Groq LLMs
- Real-time leaderboards, detailed analytics, and performance tracking
- Anti-cheat measures (fullscreen enforcement, tab-switch detection, copy prevention)
- Admin panel for question management, user management, and error report review
- PWA support — installable on mobile and desktop

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 | UI library with hooks, lazy loading, Suspense |
| Build Tool | Vite 7 | Dev server, HMR, production bundling with code splitting |
| Styling | Tailwind CSS 3 | Utility-first CSS with dark mode support |
| Animations | Framer Motion | Page transitions, scroll animations, micro-interactions |
| Auth | Firebase Auth | Google OAuth (popup + redirect fallback) |
| Database | Cloud Firestore | NoSQL document database for all app data |
| Storage | Firebase Storage | Profile images, question images |
| AI Backend | Groq API | LLM inference (Llama 3.3 70B, Qwen3 32B, Llama 3.1 8B) |
| Serverless | Vercel Functions | API endpoints for AI chat and explanations |
| Hosting | Vercel | Frontend hosting with CDN, security headers |
| Testing | Vitest + Testing Library | Unit and component tests |
| Linting | ESLint 9 + Prettier | Code quality and formatting |
| Git Hooks | Husky | Pre-commit lint checks |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Client)                    │
│                                                          │
│  React 19 SPA ──── Tailwind CSS ──── Framer Motion      │
│       │                                                  │
│       ├── Firebase Auth SDK (Google OAuth)                │
│       ├── Firestore SDK (reads/writes)                   │
│       └── fetch() ──→ /api/* (AI endpoints)              │
└────────────┬──────────────────────┬──────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐   ┌─────────────────────────┐
│   Firebase Cloud   │   │   Vercel Serverless      │
│                    │   │                          │
│  • Auth (Google)   │   │  /api/ai-chat            │
│  • Firestore DB    │   │  /api/ai-explanation     │
│  • Storage         │   │         │                │
│  • Security Rules  │   │         ▼                │
└────────────────────┘   │  ┌──────────────┐        │
                         │  │  Groq API    │        │
                         │  │  (LLM Cloud) │        │
                         │  └──────────────┘        │
                         └─────────────────────────┘
```

**Data flow:**
1. User authenticates via Google → Firebase Auth issues JWT
2. Client reads/writes Firestore directly using Firebase SDK (security rules enforce access)
3. AI requests go through Vercel serverless functions → functions verify Firebase JWT → call Groq API → return response
4. All AI API keys stay server-side (never exposed to browser)

---

## Project Structure

```
mockzam/
├── api/                          # Vercel serverless functions
│   ├── ai-chat.js                #   AI doubt resolver chat endpoint
│   └── ai-explanation.js         #   Per-question AI explanation endpoint
├── public/                       # Static assets (copied to dist/)
│   ├── favicon.svg / .ico        #   App favicon (SVG + ICO fallback)
│   ├── logo.svg                  #   App logo
│   ├── manifest.json             #   PWA manifest
│   ├── email-action.html         #   Firebase email action handler
│   └── firebase-runtime-config.js#   Runtime Firebase config for email-action page
├── scripts/                      # Utility scripts
│   ├── data/                     #   Generated CSV question banks
│   ├── generate-questions.cjs    #   CDS question generator
│   └── generate-remaining-exams.cjs # CSAT/IAS question generator
├── src/
│   ├── components/
│   │   ├── layout/               #   TopNav, BottomNav
│   │   ├── test/                 #   QuestionCard, QuestionPalette, Timer, ViolationModal
│   │   ├── ui/                   #   Modal, StatsCard, AiChatWidget, ThemeToggle, etc.
│   │   ├── ErrorBoundary.js      #   Global error boundary
│   │   └── index.js              #   Barrel exports
│   ├── config/
│   │   └── firebase.js           #   Firebase app initialization + App Check
│   ├── constants/
│   │   └── index.js              #   Collection names, storage keys, test modes, thresholds
│   ├── context/
│   │   ├── AuthContext.js         #   Auth state, Google login, session management
│   │   └── ThemeContext.js        #   Dark/light theme with system preference detection
│   ├── hooks/
│   │   ├── useAntiCheat.js       #   Fullscreen enforcement, violation tracking
│   │   ├── useBookmarks.js       #   Bookmark CRUD operations
│   │   ├── useErrorReport.js     #   Question error reporting
│   │   ├── useKeyboardShortcuts.js#  Keyboard event handling
│   │   ├── useLocalStorage.js    #   Persistent state in localStorage
│   │   ├── useOptimizedFetch.js  #   Fetch with caching
│   │   ├── usePWAInstall.js      #   PWA install prompt handling
│   │   ├── useSessionTimeout.js  #   30-min inactivity auto-logout
│   │   ├── useTestSession.js     #   Test session persistence (resume after refresh)
│   │   ├── useTestState.js       #   Question navigation, answer tracking
│   │   ├── useTimer.js           #   Countdown timer with pause/resume
│   │   └── useVisibilityTracking.js # Tab switch & window blur detection
│   ├── pages/
│   │   ├── admin/                #   Dashboard, AddQuestion, ManageQuestions, BulkUpload,
│   │   │                         #   Users, ErrorReports, Bookmarks
│   │   ├── auth/                 #   Google sign-in page
│   │   ├── legal/                #   TermsOfService, PrivacyPolicy
│   │   ├── test/                 #   MockTest, PracticeMode, CustomTest, CustomTestSetup,
│   │   │                         #   TestResult, TestHistory, TestSelection, PaperSelection
│   │   ├── user/                 #   Dashboard, Profile, Leaderboard, Bookmarks
│   │   ├── Landing.js            #   Public landing page with demo quiz
│   │   ├── NotFound.js           #   404 page
│   │   └── Onboarding.js         #   First-time user setup (name, exam target)
│   ├── services/
│   │   ├── aiService.js          #   AI explanation generation with caching
│   │   ├── bookmarkService.js    #   Bookmark Firestore operations
│   │   ├── chatService.js        #   AI chat messaging
│   │   ├── questionService.js    #   Question fetching with in-memory cache
│   │   ├── testService.js        #   Test results, history, leaderboard, stats
│   │   └── userService.js        #   User profile CRUD
│   ├── utils/
│   │   ├── auditLog.js           #   Admin action audit logging
│   │   ├── avatarUtils.js        #   Safe photo URL handling
│   │   ├── errorTracking.js      #   Error logging (Sentry-ready)
│   │   ├── examPatterns.js       #   Exam configs (CDS, IAS-GS, IAS-CSAT, CSAT)
│   │   ├── logger.js             #   Dev/prod-aware console logger
│   │   ├── performance.js        #   Web Vitals, long task detection
│   │   ├── securityUtils.js      #   Rate limiters, CSP, secure storage
│   │   ├── testUtils.js          #   Shuffling, scoring, email validation
│   │   └── toast.js              #   Toast notification helpers
│   ├── App.js                    #   Root component with routing
│   ├── index.js                  #   Entry point
│   ├── index.css                 #   Global styles + Tailwind directives
│   └── setupTests.js             #   Vitest setup
├── .env / .env.example           # Environment variables
├── firebase.json                 # Firebase hosting config
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore composite indexes
├── storage.rules                 # Firebase Storage security rules
├── vercel.json                   # Vercel deployment config (headers, rewrites, CSP)
├── vite.config.js                # Vite config + dev API proxy
├── tailwind.config.cjs           # Tailwind configuration
├── eslint.config.js              # ESLint flat config
└── package.json                  # Dependencies and scripts
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/amanrcy1/MockTest-app.git
cd MockTest-app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your Firebase and Groq API keys (see Environment Variables section)

# 4. Start development server
npm run dev
# Opens at http://localhost:3000
```

**Prerequisites:** Node.js 20+, a Firebase project with Auth + Firestore + Storage enabled, and a Groq API key (free at https://console.groq.com/keys).

---

## Environment Variables

| Variable | Required | Where Used | Purpose |
|----------|----------|------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Client | Firebase client SDK — identifies your app |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Client | Domain for Firebase Auth popups/redirects |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Client | Your Firebase project identifier |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Client | Cloud Storage bucket for file uploads |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Client | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Client | Unique ID for this web app in Firebase |
| `GROQ_API_KEY` | Yes | Server | Groq API key for AI (serverless functions only) |
| `FIREBASE_PROJECT_ID` | Yes | Server | Firebase project ID for admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Prod | Server | Service account email for token verification |
| `FIREBASE_PRIVATE_KEY` | Prod | Server | Service account private key |
| `ALLOWED_ORIGINS` | Prod | Server | CORS whitelist for API endpoints |
| `VITE_API_URL` | No | Client | Override API base URL (defaults to `/api`) |
| `VITE_RECAPTCHA_SITE_KEY` | No | Client | Firebase App Check (production security) |
| `VITE_SENTRY_DSN` | No | Client | Sentry error tracking DSN |

`VITE_` prefixed variables are exposed to the browser. Non-prefixed variables stay server-side only.

---

## Authentication Flow

```
User clicks "Continue with Google"
        │
        ▼
┌─ Is in-app browser or standalone PWA? ─┐
│  YES → signInWithRedirect()            │
│  NO  → signInWithPopup()              │
└────────────────────────────────────────┘
        │
        ▼ (on success)
┌─ User doc exists in Firestore? ─┐
│  YES → Update lastLoginAt,      │
│        loginCount, fetch profile │
│  NO  → Create new user doc,     │
│        create email mapping,     │
│        redirect to /onboarding   │
└──────────────────────────────────┘
        │
        ▼
┌─ onboardingComplete? ─┐
│  YES → /dashboard      │
│  NO  → /onboarding     │
└────────────────────────┘
```

**Key details:**
- Auth persistence: `browserLocalPersistence` (falls back to `browserSessionPersistence` if blocked)
- Session timeout: 30 minutes of inactivity → auto-logout
- Popup fallback: if popup is blocked by browser, falls back to redirect flow
- User-cancelled popup: returns gracefully without triggering redirect
- Email deduplication: `/emails` collection maps email → userId

---

## Test Modes

### 1. Mock Test (Full Exam Simulation)
- Fetches questions from Firestore filtered by exam type
- Randomizes question order and option order (seeded Fisher-Yates shuffle)
- Enforces fullscreen mode with anti-cheat
- Countdown timer based on exam pattern (e.g., 120 minutes for CDS)
- Question palette shows status: not-visited, answered, not-answered, marked, answered+marked
- Auto-submits when timer expires or max fullscreen violations reached
- Saves detailed result to Firestore (score, accuracy, time taken, per-question breakdown)
- Session persistence: if browser refreshes, test resumes from where you left off

### 2. Practice Mode
- Same question pool, but one question at a time
- Immediate feedback after each answer (correct/incorrect + explanation)
- AI-generated explanations for wrong answers
- No timer pressure, no anti-cheat
- Bookmark questions for later review

### 3. Custom Test
- User selects: exam type, subjects, topics, difficulty, number of questions, time limit
- Questions filtered and randomized based on selections
- Same anti-cheat and timer as mock test
- Results saved with custom test metadata

### Exam Patterns Supported

| Exam | Papers | Questions | Duration | Marks | Negative Marking |
|------|--------|-----------|----------|-------|-----------------|
| CDS | 3 (English, GK, Math) | 120/120/100 | 2h each | 100/100/100 | -1/3 per wrong |
| IAS-GS | 1 (General Studies) | 100 | 2h | 200 | -1/3 per wrong |
| IAS-CSAT | 1 (CSAT) | 80 | 2h | 200 | -1/3 per wrong |
| CSAT | 1 (Aptitude) | 80 | 2h | 200 | -1/3 per wrong |

---

## AI System

Mockzam uses Groq's LLM API through two Vercel serverless endpoints:

### `/api/ai-chat` — Doubt Resolver Chat
- Floating chat widget available on all pages (except during tests and admin)
- Smart query classification: math, factual, conceptual, strategy, greeting
- Model routing based on query type:
  - **Math:** Qwen3-32B (with chain-of-thought thinking) → Llama 3.3 70B → Llama 3.1 8B
  - **Factual:** Llama 3.3 70B → Llama 3.1 8B
  - **Greeting:** Llama 3.1 8B (fast, low tokens)
  - **General:** Llama 3.3 70B → Llama 3.1 8B
- Fallback chain: if a model returns 429/503, automatically tries the next model
- Built-in arithmetic evaluator (RPN parser) for simple calculations
- Boundary detection: blocks jailbreak attempts and off-topic content
- Context-aware: knows user's name, exam type, current page, active question, learning profile
- Rate limited: 20 requests/minute per user (server-side Firestore counter)
- Response caching: identical queries return cached responses (5-min TTL)

### `/api/ai-explanation` — Question Explanations
- Triggered when user gets a question wrong or skips it in practice mode
- Explains why the correct answer is right and why the user's answer is wrong
- Includes memory tips and mnemonics
- Math questions get step-by-step solutions with verification
- Rate limited: 15 requests/minute per user
- Client-side cache: up to 100 explanations cached in memory

### Dev Mode
- Vite dev server includes a proxy plugin (`devApiProxy`) that calls Groq directly
- Skips Firebase admin auth verification locally
- Same model routing and query classification as production

---

## Anti-Cheat System

Active during Mock Test and Custom Test modes:

| Feature | How It Works |
|---------|-------------|
| Fullscreen enforcement | Requests fullscreen on test start. Exiting triggers violation modal. |
| Violation tracking | Tracks fullscreen exits. After 2 exits → auto-submit test. |
| Tab switch detection | `visibilitychange` event detects tab switches. Logged as violations. |
| Window blur detection | `blur` event detects switching to other apps. |
| Copy/paste prevention | `copy`, `cut`, `paste` events are blocked via `preventDefault()`. |
| Right-click prevention | Context menu disabled during active test. |
| Keyboard blocking | Blocks Ctrl+C, Ctrl+V, Ctrl+A, F12, PrintScreen during test. |
| Question randomization | Seeded Fisher-Yates shuffle — same seed = same order for fairness. |
| Option randomization | Answer options are shuffled per question. |

**Hooks involved:** `useAntiCheat`, `useVisibilityTracking`, `useKeyboardShortcuts`

---

## Database Design

### Firestore Collections

```
firestore/
├── users/{userId}
│   ├── userId, name, email, photoURL
│   ├── targetExam (CDS/IAS-GS/IAS-CSAT/CSAT)
│   ├── isAdmin (boolean)
│   ├── onboardingComplete (boolean)
│   ├── createdAt, lastLoginAt, loginCount
│
├── questions/{questionId}
│   ├── examType, subject, topic, subtopic, difficulty
│   ├── questionText, optionA/B/C/D, correctAnswer
│   ├── solution, tags
│
├── tests/{testId}
│   ├── userId, examType, mode (mock/practice/custom)
│   ├── score, totalMarks, accuracy, percentage
│   ├── totalQuestions, attempted, correct, incorrect, skipped
│   ├── timeSpent, startTime, endTime
│   ├── answers (per-question breakdown)
│   ├── completed (boolean)
│
├── bookmarks/{bookmarkId}
│   ├── userId, questionId, examType
│   ├── note (optional), createdAt
│
├── errorReports/{reportId}
│   ├── userId, questionId, examType
│   ├── reportType, description
│   ├── status (pending/reviewed/resolved/rejected)
│
├── emails/{sanitizedEmail}
│   ├── userId, email, createdAt
│
├── rateLimits/{uid_bucket}          # AI chat rate limiting
├── rateLimitsExplanations/{uid_bucket} # AI explanation rate limiting
└── auditLogs/{logId}               # Admin action audit trail
```

### Firebase Storage

```
storage/
├── profiles/{userId}/              # User profile images (5MB limit, image/* only)
└── questions/                      # Question images (admin-only write)
```

---

## Security

### Firestore Rules (Summary)
- **Users:** Any signed-in user can read (needed for leaderboard). Users can only create/update their own doc. Cannot self-promote to admin. Only admins can delete users or change `isAdmin`.
- **Questions:** All signed-in users can read. Only admins can create/update/delete.
- **Tests:** Users can create their own tests. Read allowed if owner, completed, or admin.
- **Bookmarks:** Owner or admin can read/write. Users can only create bookmarks for themselves.
- **Error Reports:** Owner or admin can read. Users can create reports for themselves. Only admins can update status.

### Storage Rules
- Profile images: owner can write (5MB limit, images only), all signed-in users can read
- Question images: admin-only write, all signed-in users can read
- Everything else: denied by default

### Vercel Security Headers
- `Content-Security-Policy` — restricts script/style/connect sources
- `X-Frame-Options: DENY` — prevents clickjacking
- `Strict-Transport-Security` — enforces HTTPS
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — needed for Google Auth popup

### Client-Side Security
- Rate limiters on AI requests (client + server)
- Input sanitization on all AI inputs (truncation, boundary detection)
- Secure localStorage wrapper with error handling
- Firebase Auth token sent with all API requests
- API keys never exposed to browser (`GROQ_API_KEY` is server-side only)

---

## Routing & Navigation

| Path | Component | Access | Description |
|------|-----------|--------|-------------|
| `/` | Landing | Public | Landing page with demo quiz |
| `/login` | Auth | Public | Google sign-in |
| `/terms` | TermsOfService | Public | Terms of service |
| `/privacy` | PrivacyPolicy | Public | Privacy policy |
| `/onboarding` | Onboarding | Protected | First-time user setup |
| `/dashboard` | Dashboard | Protected | User home — stats, recent tests, quick actions |
| `/profile` | Profile | Protected | Edit profile, change exam target, upload photo |
| `/test-selection` | TestSelection | Protected | Choose exam type and test mode |
| `/test/paper-selection` | PaperSelection | Protected | CDS paper selection (multi-paper exam) |
| `/test/mock` | MockTest | Protected | Full mock test with timer and anti-cheat |
| `/test/practice` | PracticeMode | Protected | Practice mode with instant feedback |
| `/test/custom-setup` | CustomTestSetup | Protected | Configure custom test parameters |
| `/test/custom` | CustomTest | Protected | Custom test execution |
| `/test/result` | TestResult | Protected | Detailed test results and analysis |
| `/test/result/:testId` | TestResult | Protected | View specific past test result |
| `/test/history` | TestHistory | Protected | All past test results |
| `/leaderboard` | Leaderboard | Protected | Exam-wise leaderboards |
| `/bookmarks` | Bookmarks | Protected | Saved questions |
| `/admin/dashboard` | AdminDashboard | Admin | Admin stats overview |
| `/admin/add-question` | AddQuestion | Admin | Add single question |
| `/admin/manage-questions` | ManageQuestions | Admin | Edit/delete questions |
| `/admin/bulk-upload` | BulkUpload | Admin | CSV bulk question upload |
| `/admin/users` | AdminUsers | Admin | User management |
| `/admin/error-reports` | AdminErrorReports | Admin | Review reported question errors |
| `/admin/bookmarks` | AdminBookmarks | Admin | View all user bookmarks |

**Route guards:**
- `PublicRoute` — redirects to `/dashboard` if already logged in
- `ProtectedRoute` — redirects to `/login` if not authenticated, to `/onboarding` if not onboarded
- `AdminRoute` — redirects to `/dashboard` if not admin

**Code splitting:** All pages except Auth and Dashboard are lazy-loaded with `React.lazy()` + `Suspense`.

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAntiCheat` | Fullscreen enforcement, violation counting, copy/paste/right-click prevention |
| `useVisibilityTracking` | Tab visibility and window focus detection for anti-cheat |
| `useKeyboardShortcuts` | Block Ctrl+C, F12, PrintScreen during tests |
| `useTimer` | Countdown timer with start/pause/reset, warning/critical thresholds |
| `useTestState` | Question navigation, answer selection, marking, status tracking |
| `useTestSession` | Persist test state to localStorage (resume after refresh) |
| `useBookmarks` | Bookmark CRUD with optimistic UI updates |
| `useErrorReport` | Submit question error reports |
| `useLocalStorage` | Generic persistent state hook |
| `useOptimizedFetch` | Data fetching with in-memory caching |
| `usePWAInstall` | Handle PWA install prompt (Chrome + iOS fallback) |
| `useSessionTimeout` | Auto-logout after 30 minutes of inactivity |

---

## Services Layer

All Firestore operations are abstracted into service modules:

| Service | Responsibilities |
|---------|-----------------|
| `questionService` | Fetch questions by exam/filters, in-memory cache (5-min TTL, max 50 entries) |
| `testService` | Save test results, get history, leaderboard (best score per user), aggregate stats |
| `userService` | Get/create/update user profiles, toggle admin status |
| `bookmarkService` | Add/remove/toggle bookmarks, get bookmark map |
| `aiService` | Generate AI explanations with client-side cache (max 100 entries) |
| `chatService` | Send messages to AI chat endpoint with auth token and rate limiting |

---

## Admin Panel

Accessible only to users with `isAdmin: true` in their Firestore user document.

| Page | What It Does |
|------|-------------|
| Dashboard | Total questions, users, tests, reports — at a glance |
| Add Question | Form to add a single question with all metadata |
| Manage Questions | Search, filter, edit, delete questions |
| Bulk Upload | Upload CSV file to add questions in bulk (uses PapaParse) |
| Users | View all users, promote/demote admin status |
| Error Reports | Review user-submitted question errors, mark as resolved/rejected |
| Bookmarks | View all bookmarks across users |

All admin actions are logged to the `auditLogs` Firestore collection.

---

## PWA Features

- **Web App Manifest** (`public/manifest.json`) — app name, icons, theme color, shortcuts
- **Install Banner** — custom prompt for Chrome's `beforeinstallprompt` event
- **iOS Fallback** — manual "Add to Home Screen" instructions for Safari
- **Standalone Mode** — detects if running as installed PWA
- **App Shortcuts** — "Start Mock Test" and "Practice Mode" shortcuts in manifest

---

## Build & Deployment

### Development
```bash
npm run dev          # Vite dev server at http://localhost:3000
                     # Includes API proxy for /api/* routes (calls Groq directly)
```

### Production Build
```bash
npm run build        # Outputs to dist/
npm run preview      # Preview production build locally
```

**Build optimizations:**
- Code splitting by vendor: `react`, `firebase`, `framer-motion`, `date-fns`, `papaparse`
- esbuild minification (faster than terser)
- Target: ES2015
- Chunk size warning: 550KB

### Deploy to Vercel
```bash
npm run deploy           # vercel --prod
npm run deploy:preview   # vercel (preview deployment)
```

Or push to GitHub → Vercel auto-deploys.

**Vercel settings:**
- Build command: `vite build`
- Output directory: `dist`
- Set all environment variables in Vercel dashboard

### Deploy to Firebase Hosting (alternative)
```bash
firebase login
firebase deploy --only hosting
```

---

## Testing

```bash
npm test             # Run all tests once (vitest --run)
```

- 25 test files, 265 tests
- Uses Vitest + jsdom + React Testing Library
- Tests cover: hooks, services, components, utilities, pages
- Test files are co-located with source in `__tests__/` folders

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `vite build` | Production build to `dist/` |
| `preview` | `vite preview` | Preview production build |
| `test` | `vitest --run` | Run all tests once |
| `lint` | `eslint src` | Check for lint errors |
| `lint:fix` | `eslint src --fix` | Auto-fix lint errors |
| `format` | `prettier --write "src/**/*"` | Format all source files |
| `format:check` | `prettier --check "src/**/*"` | Check formatting |
| `deploy` | `vercel --prod` | Deploy to Vercel production |
| `deploy:preview` | `vercel` | Deploy preview to Vercel |
