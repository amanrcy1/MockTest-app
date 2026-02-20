<div align="center">

# 📚 Mockzam

### Smart Mock Test Platform for UPSC Aspirants

Practice smarter. Score higher. Track everything.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-amanrcy.vercel.app-blue?style=for-the-badge)](https://amanrcy.vercel.app)

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br />

<img src="public/logo.svg" alt="Mockzam Logo" width="80" />

</div>

---

## ⚡ Quick Start

```bash
git clone https://github.com/amanrcy1/MockTest-app.git
cd MockTest-app
npm install
cp .env.example .env   # Add your Firebase credentials
npm run dev             # → http://localhost:3000
```

> Requires **Node.js 20+** and a [Firebase project](https://console.firebase.google.com).

---

## 🎯 What is Mockzam?

Mockzam is a full-featured exam preparation platform built for UPSC aspirants. It supports multiple exam patterns (CDS, CSAT, IAS-GS, and more) with real exam conditions, AI-powered explanations, and detailed performance analytics.

<details>
<summary><b>🖼️ Screenshots</b> (click to expand)</summary>
<br />

| Dashboard | Mock Test | Results |
|:---------:|:---------:|:-------:|
| Dark/Light theme, stats overview | Timer, question palette, anti-cheat | Score breakdown, AI explanations |

</details>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📝 Test Modes
- **Mock Test** — Real exam conditions with timer & anti-cheat
- **Practice Mode** — No time pressure, instant answers
- **Custom Test** — Pick subjects, topics, and question count

### � Analytics
- Test history with detailed breakdowns
- Subject-wise accuracy tracking
- Time management insights
- Leaderboard rankings

</td>
<td width="50%">

### 🤖 AI-Powered
- Wrong answer explanations via Groq LLaMA 3.3
- Secure server-side API calls
- Per-user rate limiting

### 🛡️ Security
- Firebase Auth (Google sign-in)
- Firestore security rules
- Anti-cheat (fullscreen enforcement, copy/paste blocking)
- CSP headers, HSTS, rate limiting

</td>
</tr>
</table>

<details>
<summary><b>👑 Admin Panel</b></summary>

- Add / edit / delete questions
- Bulk upload via CSV
- User management (promote/demote admins)
- Error report dashboard
- Bookmark review system
- Audit logging

</details>

<details>
<summary><b>🎨 UI/UX</b></summary>

- Dark / Light theme with system preference detection
- Fully responsive (mobile, tablet, desktop)
- Smooth animations (Framer Motion)
- Keyboard shortcuts for navigation
- PWA-ready with install banner
- Bottom navigation on mobile

</details>

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 7 |
| **Styling** | Tailwind CSS 3 |
| **Animations** | Framer Motion |
| **Auth & DB** | Firebase Auth + Cloud Firestore |
| **Storage** | Firebase Storage (profile images) |
| **AI** | Groq API (LLaMA 3.3 70B) |
| **Hosting** | Vercel (app + serverless functions) |
| **Linting** | ESLint 9 (flat config) + Prettier |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure

```
mockzam/
├── api/                    # Vercel serverless functions
│   └── ai-explanation.js   # AI explanation endpoint
├── public/                 # Static assets & security headers
├── src/
│   ├── components/         # Reusable components
│   │   ├── 3d/            #   Celebration effects, 3D timer
│   │   ├── layout/        #   TopNav, BottomNav
│   │   ├── test/          #   QuestionCard, Timer, Palette
│   │   └── ui/            #   Modal, EmptyState, Skeleton
│   ├── pages/
│   │   ├── admin/         # Admin dashboard, question management
│   │   ├── auth/          # Login / signup
│   │   ├── test/          # Mock, Practice, Custom, Results
│   │   └── user/          # Dashboard, Profile, Bookmarks
│   ├── context/           # AuthContext, ThemeContext
│   ├── hooks/             # useAntiCheat, useTimer, useOptimizedFetch...
│   ├── services/          # Firebase CRUD, AI service
│   ├── utils/             # Security, performance, logging
│   ├── config/            # Firebase initialization
│   └── constants/         # App-wide constants
├── functions/             # Firebase Cloud Functions (optional)
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
├── vite.config.js         # Vite + JSX plugin config
├── eslint.config.js       # ESLint 9 flat config
├── tailwind.config.cjs    # Tailwind configuration
└── postcss.config.cjs     # PostCSS configuration
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Firebase (required)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# AI Explanations (optional)
GROQ_API_KEY=your_groq_key          # Server-side only
FIREBASE_PROJECT_ID=your_project_id  # For serverless auth

# Security (optional, production)
VITE_RECAPTCHA_SITE_KEY=your_key     # Enables Firebase App Check
```

> `VITE_` prefixed vars are exposed to the client. `GROQ_API_KEY` stays server-side only.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on `src/` |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run deploy` | Deploy to Vercel (production) |
| `npm run deploy:preview` | Deploy preview to Vercel |

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Set environment variables (see above)
4. Build settings are auto-detected:
   - Framework: **Vite**
   - Build Command: `vite build`
   - Output Directory: `dist`
5. The `api/` folder automatically deploys as serverless functions

### Firebase Hosting (Alternative)

```bash
firebase login
firebase deploy --only hosting
```

> Note: Update `firebase.json` if switching — the AI serverless function would need to move to Firebase Cloud Functions.

---

## 🗺️ Roadmap

- [x] Multiple test modes (Mock, Practice, Custom)
- [x] Google authentication & user profiles
- [x] Leaderboard system
- [x] Dark / Light theme
- [x] Mobile responsive design
- [x] AI-powered explanations (Groq)
- [x] Admin panel with bulk upload
- [x] Anti-cheat system
- [x] Migrated from CRA to Vite
- [ ] Offline mode (service worker)
- [ ] Vitest test suite
- [ ] Mobile app (React Native)
- [ ] Discussion forum
- [ ] Study planner & reminders

---

## ❓ FAQ

<details>
<summary><b>Is Mockzam free?</b></summary>
<br />
Yes, completely free and open source.
</details>

<details>
<summary><b>Which exams are supported?</b></summary>
<br />
CDS, CSAT, IAS-GS, and more. The platform is configurable for any competitive exam by modifying the question bank and exam patterns.
</details>

<details>
<summary><b>How does the AI explanation work?</b></summary>
<br />
When you get a question wrong, you can request an AI explanation. The request goes to a Vercel serverless function that securely calls the Groq API (LLaMA 3.3 70B) — your API key never touches the browser.
</details>

<details>
<summary><b>Is my data secure?</b></summary>
<br />
Yes. Firebase security rules restrict data access per user. The app uses HSTS, CSP headers, and Firebase App Check in production. Test data is only readable by the test owner and admins.
</details>

<details>
<summary><b>Can I self-host this?</b></summary>
<br />
Yes. Clone the repo, set up a Firebase project, add your env vars, and deploy to Vercel (or any static host + serverless platform).
</details>

<details>
<summary><b>How do I become an admin?</b></summary>
<br />
Set <code>isAdmin: true</code> on your user document in Firestore. The first admin must be set manually; after that, admins can promote other users from the admin panel.
</details>

---

## 🤝 Contributing

Contributions are welcome! 

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/cool-thing`)
3. Commit your changes (`git commit -m 'add cool thing'`)
4. Push and open a PR

---

## 📝 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

### 👨‍💻 Built by [Aman Yadav](https://github.com/amanrcy1)

[![GitHub](https://img.shields.io/badge/GitHub-amanrcy1-181717?logo=github)](https://github.com/amanrcy1)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-amanrcy-0A66C2?logo=linkedin)](https://linkedin.com/in/amanrcy)

⭐ Star this repo if you find it useful!

</div>
