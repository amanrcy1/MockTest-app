import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { ThemeToggle, AuthAuroraCanvas } from "../../components";
import logger from "../../utils/logger";

// Debounced username check hook
const useUsernameCheck = (username) => {
  const [status, setStatus] = useState("idle");
  const timerRef = useRef(null);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length < 3) { setStatus("idle"); return; }

    setStatus("checking");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, "usernames", trimmed.toLowerCase()));
        setStatus(snap.exists() ? "unavailable" : "available");
      } catch (err) {
        logger.error("Username check error:", err);
        setStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timerRef.current);
  }, [username]);

  return status;
};

// Password strength checks
const getPasswordChecks = (pw) => [
  { id: "length", label: "8+ characters", pass: pw.length >= 8 },
  { id: "lower", label: "Lowercase letter", pass: /[a-z]/.test(pw) },
  { id: "upper", label: "Uppercase letter", pass: /[A-Z]/.test(pw) },
  { id: "number", label: "A number", pass: /\d/.test(pw) },
  { id: "special", label: "Special character", pass: /[^A-Za-z0-9]/.test(pw) },
];

// Eye icon SVGs (shared)
const EyeOpen = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeClosed = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const Auth = () => {
  const location = useLocation();
  const initialMode = location.pathname === "/register" ? "register" : "login";
  const [mode, setMode] = useState(initialMode);

  // Shared state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login-specific
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  const { login, register, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const usernameStatus = useUsernameCheck(mode === "register" ? username : "");
  const passwordChecks = getPasswordChecks(password);
  const isStrongPassword = passwordChecks.every((c) => c.pass);

  // Reset errors when switching modes
  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setErrorMsg("");
    setNeedsVerification(false);
    setShake(false);
    // Update URL without navigation
    window.history.replaceState(null, "", newMode === "register" ? "/register" : "/login");
  }, []);

  // Login handler
  const handleLogin = async () => {
    if (!username || !password) { toast.error("Please fill all fields"); return; }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      setErrorMsg("");
      setNeedsVerification(false);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setErrorMsg(result.error);
      if (result.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(result.email);
      } else {
        setNeedsVerification(false);
      }
    }
  };

  // Register handler
  const handleRegister = async () => {
    if (!username || !password) { toast.error("Please fill all fields"); return; }
    if (username.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { toast.error("Username: letters, numbers, underscores only (3-20 chars)"); return; }
    if (usernameStatus === "unavailable") { toast.error("Username already taken"); return; }
    if (!isStrongPassword) { toast.error("Please use a stronger password"); return; }

    setLoading(true);
    const result = await register(username, username, null, password, "CDS");
    setLoading(false);

    if (result.success) {
      toast.success("Account created!");
      navigate("/onboarding");
    } else {
      toast.error(result.error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleRegister();
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) { toast.error("Unable to resend"); return; }
    setResendingEmail(true);
    const loginResult = await login(username, password);
    if (loginResult.needsVerification) {
      const result = await sendVerificationEmail();
      if (result.success) toast.success("Verification email sent!");
      else toast.error(result.error || "Failed to send");
    }
    setResendingEmail(false);
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AuthAuroraCanvas />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glow */}
        <motion.div
          className="absolute -inset-1 rounded-3xl blur-lg opacity-30"
          animate={{
            background: isLogin
              ? "linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899)"
              : "linear-gradient(to right, #8b5cf6, #3b82f6, #ec4899)",
          }}
          transition={{ duration: 0.5 }}
        />

        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
          {/* Logo */}
          <motion.div className="text-center mb-6" layout>
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-3 shadow-lg shadow-blue-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              layout
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </motion.div>
            <h1 className="text-xl font-bold gradient-text">UPSC MockTest</h1>
          </motion.div>

          {/* Mode Toggle */}
          <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-gray-700 shadow-md"
              layout
              style={{ width: "calc(50% - 4px)" }}
              animate={{ x: isLogin ? 0 : "calc(100% + 4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isLogin ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${!isLogin ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={shake ? "animate-shake" : ""}>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Username field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {isLogin ? "Username or Email" : "Username"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); if (errorMsg) setErrorMsg(""); }}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                      placeholder={isLogin ? "Username or email" : "Choose a username"}
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>
                  {/* Username availability (register only) */}
                  {!isLogin && usernameStatus !== "idle" && (
                    <div className="mt-1.5">
                      {usernameStatus === "checking" && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Checking...
                        </span>
                      )}
                      {usernameStatus === "available" && (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Available
                        </span>
                      )}
                      {usernameStatus === "unavailable" && (
                        <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Taken
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    {isLogin && (
                      <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value.replace(/\s/g, "")); if (errorMsg) setErrorMsg(""); }}
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                      placeholder={isLogin ? "Your password" : "Create a strong password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={loading}
                    >
                      {showPassword ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>

                  {/* Login error */}
                  {isLogin && errorMsg && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {errorMsg}
                    </motion.p>
                  )}

                  {/* Verification resend */}
                  {isLogin && needsVerification && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
                      <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-1">Didn't get the verification email?</p>
                      <button type="button" onClick={handleResendVerification} disabled={resendingEmail} className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 underline disabled:opacity-50">
                        {resendingEmail ? "Sending..." : "Resend verification email"}
                      </button>
                    </motion.div>
                  )}

                  {/* Password strength (register only) */}
                  {!isLogin && password.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {passwordChecks.map((c) => (
                          <span key={c.id} className={`text-xs font-medium flex items-center gap-1 ${c.pass ? "text-green-600" : "text-gray-400"}`}>
                            {c.pass ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLogin
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25 hover:shadow-blue-500/40"
                      : "bg-gradient-to-r from-purple-500 to-blue-600 shadow-purple-500/25 hover:shadow-purple-500/40"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      {isLogin ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : isLogin ? "Sign In" : "Create Account"}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </form>

          {/* Footer hint */}
          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            {isLogin ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "register" : "login")}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
