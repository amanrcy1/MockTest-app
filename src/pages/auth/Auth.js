import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ThemeToggle, AuthAuroraCanvas } from '../../components';

// Same icons as landing page floating particles
const PARTICLE_ICONS = [
  <svg
    key="book"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>,
  <svg
    key="check"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>,
  <svg
    key="pencil"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
    />
  </svg>,
  <svg
    key="star"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>,
  <svg
    key="bolt"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>,
  <svg
    key="trophy"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0"
    />
  </svg>,
  <svg
    key="cap"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
    />
  </svg>,
  <svg
    key="globe"
    className="w-full h-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>,
];

const PARTICLE_COLORS = [
  'text-blue-400/30 dark:text-blue-400/20',
  'text-purple-400/30 dark:text-purple-400/20',
  'text-pink-400/30 dark:text-pink-400/20',
  'text-emerald-400/30 dark:text-emerald-400/20',
  'text-amber-400/30 dark:text-amber-400/20',
  'text-indigo-400/30 dark:text-indigo-400/20',
  'text-cyan-400/30 dark:text-cyan-400/20',
  'text-rose-400/30 dark:text-rose-400/20',
];

const FloatingParticles = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length],
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 14 + Math.random() * 18,
        x: Math.random() * 100,
        duration: 16 + Math.random() * 14,
        delay: -(Math.random() * 20),
      })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${p.color}`}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            animation: `authFloatUp ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0,
          }}
        >
          {p.icon}
        </div>
      ))}
      <style>{`
        @keyframes authFloatUp {
          0% { transform: translateY(100vh) translateX(0px); opacity: 0; }
          8% { opacity: 0.5; }
          85% { opacity: 0.5; }
          100% { transform: translateY(-10vh) translateX(25px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    const result = await loginWithGoogle();

    if (result?.success) {
      if (result.redirected) {
        // Browser is leaving this page for Google auth.
        setTimeout(() => {
          // If redirect did not happen (blocked), recover button state.
          setLoading(false);
          toast.info('If Google page did not open, allow popups/cookies and try again.');
        }, 4000);
        return;
      }
      // Popup success — show toast, then let PublicRoute handle the redirect
      // based on userDetails.onboardingComplete. This avoids competing navigations.
      toast.success(result.isNewUser ? "Welcome! Let's set up your profile." : 'Welcome back!');
      // Don't reset loading — PublicRoute will redirect us away
      return;
    }

    // Reset loading for any non-success case
    setLoading(false);

    // Show error toast only for real errors (not cancelled)
    if (result?.error && result.error !== 'Sign-in cancelled.') {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AuthAuroraCanvas />
      <FloatingParticles />

      {/* Back to home button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-10 p-2 min-h-11 min-w-11 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
        aria-label="Back to home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </motion.button>

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Glow */}
        <div className="absolute -inset-1 rounded-3xl blur-lg opacity-30 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30 overflow-hidden"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <svg
                className="w-16 h-16"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="authBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="authGlow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M16 48 L16 20 L26 35 L32 20 L38 35 L48 20 L48 48"
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z"
                  fill="url(#authBolt)"
                  filter="url(#authGlow)"
                >
                  <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z"
                  fill="#fef3c7"
                  opacity="0"
                >
                  <animate
                    attributeName="opacity"
                    values="0;0.5;0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold gradient-text mb-2">Mockzam</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Practice smarter, score higher
            </p>
          </div>

          {/* Google Sign-In Button */}
          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-11 flex items-center justify-center gap-3 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-500" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </motion.button>

          {/* Info text */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-500 dark:hover:text-gray-400">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-gray-500 dark:hover:text-gray-400">
              Privacy Policy
            </a>
          </p>

          {/* Features hint */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex justify-center mb-1">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  Mock Tests
                </p>
              </div>
              <div>
                <div className="flex justify-center mb-1">
                  <svg
                    className="w-5 h-5 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  Analytics
                </p>
              </div>
              <div>
                <div className="flex justify-center mb-1">
                  <svg
                    className="w-5 h-5 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0"
                    />
                  </svg>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  Leaderboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
