# Mockzam

Smart Mock Test Platform for UPSC Aspirants

Practice smarter. Score higher. Track everything.

[![Live Demo](https://img.shields.io/badge/Live_Demo-amanrcy.vercel.app-blue?style=for-the-badge)](https://amanrcy.vercel.app)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)](https://vercel.com)

---

## Quick Start

```bash
git clone https://github.com/amanrcy1/MockTest-app.git
cd MockTest-app
npm install
cp .env.example .env
npm run dev   # -> http://localhost:3000
```

Requires Node.js 20+ and a Firebase project.

## Features

- Google authentication and user profiles
- Mock, Practice, and Custom test modes
- Leaderboard and analytics
- AI explanations via serverless API
- Admin panel (questions, users, reports, bookmarks)
- Responsive UI with PWA support

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS 3
- Firebase Auth + Firestore + Storage
- Vercel serverless functions
- ESLint + Prettier + Vitest

## Project Structure

```txt
mockzam/
|-- api/
|-- public/
|-- src/
|-- functions/
|-- firestore.rules
|-- storage.rules
|-- vite.config.js
`-- firebase.json
```

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
GROQ_API_KEY=your_groq_key
FIREBASE_PROJECT_ID=your_project_id
VITE_RECAPTCHA_SITE_KEY=your_key
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - run lint
- `npm test` - run tests

## Deployment

### Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables
4. Build command: `vite build`
5. Output directory: `dist`

### Firebase Hosting

```bash
firebase login
firebase deploy --only hosting
```

## License

MIT - see `LICENSE`.
