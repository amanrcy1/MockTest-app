import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ThemeToggle } from "../components";

// ============================================
// CANVAS AURORA WAVE BACKGROUND
// ============================================
const AuroraCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const isDarkRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    isDarkRef.current = document.documentElement.classList.contains("dark");
    const dark = isDarkRef.current;

    // Wave configuration — each wave is an aurora band
    const waves = [
      { color: dark ? "rgba(96,165,250," : "rgba(59,130,246,", amp: 120, freq: 0.0015, speed: 0.0004, yOffset: 0.18, width: 280 },
      { color: dark ? "rgba(167,139,250," : "rgba(139,92,246,", amp: 100, freq: 0.002, speed: -0.0003, yOffset: 0.30, width: 250 },
      { color: dark ? "rgba(244,114,182," : "rgba(236,72,153,", amp: 90, freq: 0.0018, speed: 0.00035, yOffset: 0.45, width: 220 },
      { color: dark ? "rgba(52,211,153," : "rgba(16,185,129,", amp: 80, freq: 0.0022, speed: -0.00025, yOffset: 0.60, width: 200 },
      { color: dark ? "rgba(129,140,248," : "rgba(99,102,241,", amp: 110, freq: 0.0012, speed: 0.00045, yOffset: 0.75, width: 260 },
    ];

    let time = 0;

    const render = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      // Base fill
      if (dark) {
        ctx.fillStyle = "#030712";
      } else {
        ctx.fillStyle = "#f8fafc";
      }
      ctx.fillRect(0, 0, w, h);

      for (const wave of waves) {
        const baseY = h * wave.yOffset;
        const opacity = dark ? 0.12 : 0.08;

        // Draw the aurora band as a filled wave with vertical gradient
        ctx.beginPath();
        ctx.moveTo(0, h);

        // Bottom edge of wave
        for (let x = 0; x <= w; x += 3) {
          const y =
            baseY +
            Math.sin(x * wave.freq + time * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.8 + time * wave.speed * 0.7) * (wave.amp * 0.4) +
            Math.sin(x * wave.freq * 0.5 + time * wave.speed * 1.3) * (wave.amp * 0.6);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        // Vertical gradient fill for each band
        const grad = ctx.createLinearGradient(0, baseY - wave.amp * 1.5, 0, baseY + wave.width);
        grad.addColorStop(0, wave.color + "0)");
        grad.addColorStop(0.3, wave.color + (opacity * 1.5) + ")");
        grad.addColorStop(0.6, wave.color + opacity + ")");
        grad.addColorStop(1, wave.color + "0)");
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright edge line on top of wave
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y =
            baseY +
            Math.sin(x * wave.freq + time * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.8 + time * wave.speed * 0.7) * (wave.amp * 0.4) +
            Math.sin(x * wave.freq * 0.5 + time * wave.speed * 1.3) * (wave.amp * 0.6);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color + (dark ? "0.25)" : "0.15)");
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const cleanup = draw();

    // Redraw on resize
    const handleResize = () => {
      cancelAnimationFrame(animRef.current);
      draw();
    };
    window.addEventListener("resize", handleResize);

    // Redraw on theme change
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animRef.current);
      draw();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      if (cleanup) cleanup();
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [draw]);

  // Respect reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      cancelAnimationFrame(animRef.current);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.9 }}
      aria-hidden="true"
    />
  );
};

// ============================================
// ANIMATED COUNTER
// ============================================
const AnimatedCounter = ({ target, suffix = "", duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const end = parseInt(target);
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration, started]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ============================================
// 3D TILT CARD
// ============================================
const TiltCard = ({ children, className = "" }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};


// ============================================
// 3D FEATURE CARD
// ============================================
const FeatureCard = ({ icon, title, description, gradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, rotateX: 15 }}
    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, delay, type: "spring", stiffness: 100 }}
    className="perspective-1000"
  >
    <TiltCard className="relative group cursor-default h-full">
      {/* Glow behind card */}
      <div
        className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full overflow-hidden">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
        {/* Icon with 3D pop */}
        <motion.div
          className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-5 shadow-md border border-gray-200 dark:border-gray-600 relative"
          style={{ transform: "translateZ(40px)" }}
          whileHover={{ scale: 1.15, rotate: 5 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </TiltCard>
  </motion.div>
);

// ============================================
// DEMO QUIZ DATA
// ============================================
const DEMO_QUESTIONS = [
  {
    question: "Which of the following is NOT a fundamental right guaranteed by the Indian Constitution?",
    options: ["Right to Equality", "Right to Property", "Right to Freedom", "Right against Exploitation"],
    correct: 1,
    explanation: "Right to Property was removed as a fundamental right by the 44th Amendment Act, 1978. It is now a legal right under Article 300A.",
  },
  {
    question: "The Preamble of the Indian Constitution was amended by which Constitutional Amendment?",
    options: ["42nd Amendment", "44th Amendment", "52nd Amendment", "61st Amendment"],
    correct: 0,
    explanation: "The 42nd Amendment (1976) added the words 'Socialist', 'Secular', and 'Integrity' to the Preamble.",
  },
  {
    question: "Which river is known as the 'Sorrow of Bihar'?",
    options: ["Ganga", "Son", "Kosi", "Gandak"],
    correct: 2,
    explanation: "The Kosi river is called the 'Sorrow of Bihar' due to its frequent devastating floods and course changes.",
  },
  {
    question: "The first session of the Indian National Congress was held in which city?",
    options: ["Calcutta", "Bombay", "Madras", "Allahabad"],
    correct: 1,
    explanation: "The first session of INC was held in Bombay (now Mumbai) in December 1885, presided over by W.C. Bonnerjee.",
  },
  {
    question: "Which Article of the Indian Constitution deals with the abolition of untouchability?",
    options: ["Article 14", "Article 15", "Article 17", "Article 21"],
    correct: 2,
    explanation: "Article 17 abolishes untouchability and forbids its practice in any form. Enforcement of any disability arising out of untouchability is a punishable offence.",
  },
];

// ============================================
// INTERACTIVE DEMO QUIZ (Hero visual)
// ============================================
const DemoQuiz = () => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState([]); // Track correct/incorrect for each question
  const navigate = useNavigate();

  const q = DEMO_QUESTIONS[currentQ];

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === q.correct;
    setResults((prev) => [...prev, isCorrect]);
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentQ < DEMO_QUESTIONS.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setResults([]);
  };

  const getOptionStyle = (idx) => {
    if (!answered) {
      return selected === idx
        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer";
    }
    if (idx === q.correct) return "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
    if (idx === selected && idx !== q.correct) return "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
    return "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500";
  };

  const getRadioStyle = (idx) => {
    if (!answered) {
      return selected === idx ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-600";
    }
    if (idx === q.correct) return "border-green-500 bg-green-500";
    if (idx === selected && idx !== q.correct) return "border-red-500 bg-red-500";
    return "border-gray-300 dark:border-gray-600";
  };

  return (
    <div className="relative mx-auto max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
        className="relative"
      >
        {/* Browser frame */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                Try it out — no sign up needed
              </div>
            </div>
          </div>

          {finished ? (
            /* Score screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center space-y-4"
            >
              <div className="text-5xl mb-2 flex justify-center">{score >= 4 ? <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" /></svg> : score >= 2 ? <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3.75A.75.75 0 0114.25 3a2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75" /></svg> : <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}</div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {score} / {DEMO_QUESTIONS.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {score === 5 ? "Perfect score! You're ready!" : score >= 3 ? "Great job! Keep practicing." : "Good start! Practice makes perfect."}
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRestart}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Try Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/login")}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25"
                >
                  Sign Up for Full Access
                </motion.button>
              </div>
            </motion.div>
          ) : (
            /* Quiz UI */
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Quick Demo</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    Question {currentQ + 1} of {DEMO_QUESTIONS.length}
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Score: {score}/{currentQ + (answered ? 1 : 0)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    answered
                      ? selected === q.correct
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-red-500 to-rose-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQ + (answered ? 1 : 0)) / DEMO_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Question */}
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{q.question}</p>
              </motion.div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <motion.div
                    key={`${currentQ}-${i}`}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelect(i)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${getOptionStyle(i)}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${getRadioStyle(i)}`}>
                      {answered && i === q.correct && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {answered && i === selected && i !== q.correct && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {!answered && selected === i && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span>{opt}</span>
                  </motion.div>
                ))}
              </div>

              {/* Explanation */}
              {answered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3"
                >
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1"><svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>Explanation</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{q.explanation}</p>
                </motion.div>
              )}

              {/* Bottom bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {DEMO_QUESTIONS.map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i < currentQ 
                        ? results[i] 
                          ? "bg-green-400" 
                          : "bg-red-400"
                        : i === currentQ 
                          ? answered
                            ? selected === q.correct
                              ? "bg-green-400"
                              : "bg-red-400"
                            : "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-600"
                    }`} />
                  ))}
                </div>
                {answered && (
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-semibold text-white transition-colors shadow-lg shadow-blue-500/25"
                  >
                    {currentQ < DEMO_QUESTIONS.length - 1 ? "Next →" : "See Score"}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};


// ============================================
// STEP CARD (How it works)
// ============================================
const StepCard = ({ step, title, desc, icon, gradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, scale: 0.9 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    className="relative"
  >
    <TiltCard className="text-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Step number watermark */}
        <div className="absolute -top-4 -right-2 text-8xl font-black text-gray-100 dark:text-gray-800/50 select-none pointer-events-none">
          {step}
        </div>
        <motion.div
          className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg relative text-white`}
          whileHover={{ scale: 1.1, rotate: -5 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </TiltCard>
  </motion.div>
);

// ============================================
// TESTIMONIAL CARD
// ============================================
const TestimonialCard = ({ quote, name, exam, avatar, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, rotateY: 10 }}
    whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <TiltCard className="h-full">
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full">
        {/* Quote mark */}
        <div className="absolute top-4 right-4 text-4xl text-blue-100 dark:text-blue-900/50 font-serif select-none">&ldquo;</div>
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-4 h-4 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-5 leading-relaxed relative z-10">&ldquo;{quote}&rdquo;</p>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{exam}</p>
          </div>
        </div>
      </div>
    </TiltCard>
  </motion.div>
);

// ============================================
// STAT CARD
// ============================================
const StatCard = ({ value, suffix, label, icon, gradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
    whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
    viewport={{ once: true }}
    transition={{ delay, type: "spring", stiffness: 100 }}
  >
    <TiltCard>
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700 text-center overflow-hidden">
        <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${gradient} opacity-10 rounded-full`} />
        <div className="text-2xl mb-2 flex justify-center">{icon}</div>
        <p className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">
          <AnimatedCounter target={value} suffix={suffix || ""} />
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      </div>
    </TiltCard>
  </motion.div>
);


// ============================================
// MAIN LANDING COMPONENT
// ============================================
const Landing = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
      title: "Real Exam Simulation",
      description: "Experience actual UPSC exam conditions with timed tests, negative marking, and section-wise analysis.",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
      title: "AI-Powered Explanations",
      description: "Get instant, detailed explanations for every question powered by advanced AI to deepen your understanding.",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" /></svg>,
      title: "Live Leaderboard",
      description: "Compete with aspirants nationwide. Weekly rankings keep you motivated and on track.",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
      title: "Practice Mode",
      description: "Learn at your own pace. No timer, instant answers, and bookmark questions for revision.",
      gradient: "from-orange-500 to-amber-600",
    },
    {
      icon: <svg className="w-7 h-7 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>,
      title: "Custom Tests",
      description: "Build your own test — pick subjects, topics, difficulty, and question count to target weak areas.",
      gradient: "from-rose-500 to-red-600",
    },
    {
      icon: <svg className="w-7 h-7 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
      title: "Anti-Cheat System",
      description: "Tab-switch detection and copy protection ensure fair practice and build real exam discipline.",
      gradient: "from-cyan-500 to-blue-600",
    },
  ];


  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Full-page aurora canvas */}
      <AuroraCanvas />

      {/* All content sits above the canvas */}
      <div className="relative z-10">

      {/* ========== NAVBAR ========== */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled
            ? "glass-card shadow-lg"
            : "bg-transparent"
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden"
              whileHover={{ rotate: 10 }}
            >
              <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="navBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#f59e0b"/>
                  </linearGradient>
                  <filter id="navGlow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path d="M16 48 L16 20 L26 35 L32 20 L38 35 L48 20 L48 48" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z" fill="url(#navBolt)" filter="url(#navGlow)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
                </path>
                <path d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z" fill="#fef3c7" opacity="0">
                  <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite"/>
                </path>
              </svg>
            </motion.div>
            <span className="font-bold text-lg gradient-text hidden sm:block">Mockzam</span>
          </motion.div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-24 pb-8 md:pt-32 md:pb-16 px-4">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              {/* Left: Text */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-6 border border-blue-100 dark:border-blue-800"
                >
                  <motion.span
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Free for all UPSC aspirants</span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.1] mb-6"
                >
                  Crack UPSC{" "}
                  <br className="hidden sm:block" />
                  with{" "}
                  <span className="gradient-text relative">
                    Smart Practice
                    <motion.div
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                    />
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                >
                  The most comprehensive mock test platform for UPSC Prelims. Real exam simulation, AI explanations, and performance analytics.
                </motion.p>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59,130,246,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 transition-all relative overflow-hidden group"
                  >
                    <span className="relative z-10">Start Practicing — It&apos;s Free</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.button>
                </motion.div>
              </div>

              {/* Right: Interactive Demo Quiz */}
              <div className="hidden lg:block">
                <DemoQuiz />
              </div>
            </div>
          </div>
        </motion.div>
      </section>


      {/* ========== MOBILE DEMO QUIZ ========== */}
      <section className="lg:hidden py-8 px-4">
        <div className="max-w-lg mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center"
          >
            <svg className="w-5 h-5 inline-block mr-1.5 -mt-0.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>Try it now — no sign up needed
          </motion.p>
          <DemoQuiz />
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value="5000" suffix="+" label="Questions" icon={<svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>} gradient="from-blue-500 to-indigo-600" delay={0} />
          <StatCard value="1000" suffix="+" label="Aspirants" icon={<svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} gradient="from-purple-500 to-pink-600" delay={0.1} />
          <StatCard value="4" suffix="" label="Exam Types" icon={<svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>} gradient="from-emerald-500 to-teal-600" delay={0.2} />
          <StatCard value="98" suffix="%" label="Satisfaction" icon={<svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>} gradient="from-orange-500 to-amber-600" delay={0.3} />
        </div>
      </section>

      {/* ========== EXAM TYPES ========== */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6"
          >
            Covers all major UPSC exams
          </motion.p>
          <div className="flex flex-wrap justify-center gap-3">
            {["IAS Prelims (GS)", "IAS Prelims (CSAT)", "CDS", "CSAT Aptitude", "Indian Polity", "Geography", "History", "Economics", "Science & Tech", "Environment"].map((exam, i) => (
              <motion.span
                key={exam}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, type: "spring" }}
                whileHover={{ scale: 1.1, y: -2 }}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm cursor-default hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                {exam}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-full mb-4 border border-purple-100 dark:border-purple-800"
            >
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300"><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>Powerful Features</span>
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Everything you need to{" "}
              <span className="gradient-text">ace UPSC</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-lg">
              Built by aspirants, for aspirants.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 dark:via-blue-950/20 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Get started in{" "}
              <span className="gradient-text">3 simple steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard step="01" title="Sign In" desc="Continue with Google — one click and you're in." icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>} gradient="from-blue-500 to-indigo-600" delay={0} />
            <StepCard step="02" title="Choose Your Exam" desc="Select your target exam — CDS, CSAT, IAS GS, or IAS CSAT." icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>} gradient="from-purple-500 to-pink-600" delay={0.15} />
            <StepCard step="03" title="Start Practicing" desc="Take mock tests, practice by topic, or build custom tests." icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>} gradient="from-emerald-500 to-teal-600" delay={0.3} />
          </div>

          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 dark:from-blue-700 dark:via-purple-700 dark:to-emerald-700 opacity-30 -z-10" />
        </div>
      </section>


      {/* ========== TESTIMONIALS ========== */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Loved by{" "}
              <span className="gradient-text">aspirants</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Real feedback from real users</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="The mock tests feel exactly like the real exam. The timer, negative marking, and section-wise analysis helped me identify my weak areas."
              name="Ankita Yadav"
              exam="UPSC CSE 2025 Aspirant"
              avatar="from-blue-500 to-indigo-600"
              delay={0}
            />
            <TestimonialCard
              quote="AI explanations are a game-changer. Instead of just knowing the answer, I now understand the concept behind every question."
              name="Chirag Mishra"
              exam="CDS Aspirant"
              avatar="from-emerald-500 to-teal-600"
              delay={0.1}
            />
            <TestimonialCard
              quote="The practice mode and bookmarks feature helped me revise efficiently. The leaderboard keeps me motivated every week."
              name="Amit Yadav"
              exam="UPSC Prelims 2025"
              avatar="from-purple-500 to-pink-600"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-16 md:py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80 }}
          className="max-w-4xl mx-auto perspective-1000"
        >
          <TiltCard>
            <div className="relative overflow-hidden rounded-3xl">
              <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 md:p-16 text-center overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                />

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full mb-6 border border-white/20"
                  >
                    <span className="text-sm font-medium text-white/90"><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>Join the community</span>
                  </motion.div>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                    Your UPSC journey
                    <br />
                    starts here
                  </h2>
                  <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                    Join thousands of aspirants who are already practicing smarter. Completely free, no credit card needed.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                    className="px-10 py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all relative overflow-hidden group"
                  >
                    <span className="relative z-10">Create Free Account</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                </div>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md overflow-hidden">
              <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footerBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#f59e0b"/>
                  </linearGradient>
                  <filter id="footerGlow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path d="M16 48 L16 20 L26 35 L32 20 L38 35 L48 20 L48 48" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z" fill="url(#footerBolt)" filter="url(#footerGlow)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
                </path>
                <path d="M38 8 L30 24 L36 24 L28 40 L42 20 L36 20 L42 8 Z" fill="#fef3c7" opacity="0">
                  <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite"/>
                </path>
              </svg>
            </div>
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">Mockzam</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600 hidden md:block">•</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Made with <svg className="w-4 h-4 inline-block mx-1 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg> for UPSC Aspirants
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Landing;
