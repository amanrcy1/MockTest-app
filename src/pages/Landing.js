import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  AnimatePresence,
} from 'framer-motion';
import { ThemeToggle } from '../components';

// ============================================
// CANVAS AURORA WAVE BACKGROUND
// ============================================
// Throttle to ~30fps for a background effect — no one notices the difference
const FRAME_INTERVAL = 1000 / 30;

const AuroraCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const isDarkRef = useRef(false);
  const isVisibleRef = useRef(true);
  const lastFrameRef = useRef(0);
  const timeRef = useRef(0);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }, []);

  const draw = useCallback(() => {
    const setup = setupCanvas();
    if (!setup) return;
    const { ctx, w, h } = setup;

    // Larger step on mobile for better perf
    const step = w < 640 ? 8 : 4;

    isDarkRef.current = document.documentElement.classList.contains('dark');
    const dark = isDarkRef.current;

    const waves = [
      {
        color: dark ? 'rgba(96,165,250,' : 'rgba(59,130,246,',
        amp: 120,
        freq: 0.0015,
        speed: 0.0004,
        yOffset: 0.18,
        width: 280,
      },
      {
        color: dark ? 'rgba(167,139,250,' : 'rgba(139,92,246,',
        amp: 100,
        freq: 0.002,
        speed: -0.0003,
        yOffset: 0.3,
        width: 250,
      },
      {
        color: dark ? 'rgba(244,114,182,' : 'rgba(236,72,153,',
        amp: 90,
        freq: 0.0018,
        speed: 0.00035,
        yOffset: 0.45,
        width: 220,
      },
      {
        color: dark ? 'rgba(52,211,153,' : 'rgba(16,185,129,',
        amp: 80,
        freq: 0.0022,
        speed: -0.00025,
        yOffset: 0.6,
        width: 200,
      },
      {
        color: dark ? 'rgba(129,140,248,' : 'rgba(99,102,241,',
        amp: 110,
        freq: 0.0012,
        speed: 0.00045,
        yOffset: 0.75,
        width: 260,
      },
    ];

    // Pre-compute gradient objects (reuse across frames)
    const gradients = waves.map((wave) => {
      const baseY = h * wave.yOffset;
      const opacity = dark ? 0.12 : 0.08;
      const grad = ctx.createLinearGradient(0, baseY - wave.amp * 1.5, 0, baseY + wave.width);
      grad.addColorStop(0, wave.color + '0)');
      grad.addColorStop(0.3, wave.color + opacity * 1.5 + ')');
      grad.addColorStop(0.6, wave.color + opacity + ')');
      grad.addColorStop(1, wave.color + '0)');
      return grad;
    });

    const baseFill = dark ? '#030712' : '#f8fafc';

    const render = (timestamp) => {
      if (!isVisibleRef.current) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      // Throttle frame rate
      const elapsed = timestamp - lastFrameRef.current;
      if (elapsed < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameRef.current = timestamp - (elapsed % FRAME_INTERVAL);
      timeRef.current++;
      const time = timeRef.current;

      ctx.fillStyle = baseFill;
      ctx.fillRect(0, 0, w, h);

      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];
        const baseY = h * wave.yOffset;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += step) {
          const y =
            baseY +
            Math.sin(x * wave.freq + time * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.8 + time * wave.speed * 0.7) * (wave.amp * 0.4) +
            Math.sin(x * wave.freq * 0.5 + time * wave.speed * 1.3) * (wave.amp * 0.6);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = gradients[wi];
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
  }, [setupCanvas]);

  useEffect(() => {
    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      // Draw a single static frame
      const setup = setupCanvas();
      if (setup) {
        const { ctx, w, h } = setup;
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#030712' : '#f8fafc';
        ctx.fillRect(0, 0, w, h);
      }
      return;
    }

    draw();

    // Pause when tab is hidden
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Debounced resize
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(animRef.current);
        draw();
      }, 200);
    };
    window.addEventListener('resize', handleResize);

    // Theme change
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animRef.current);
      draw();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
    };
  }, [draw, setupCanvas]);

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
// EFFECT 1: FLOATING PARTICLES (Antigravity)
// ============================================
const PARTICLE_ICONS = [
  // Book
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
  // Checkmark
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
  // Pencil
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
  // Star
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
  // Lightning
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
  // Trophy
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
  // Academic cap
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
  // Globe
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
  'text-blue-400/40 dark:text-blue-400/25',
  'text-purple-400/40 dark:text-purple-400/25',
  'text-pink-400/40 dark:text-pink-400/25',
  'text-emerald-400/40 dark:text-emerald-400/25',
  'text-amber-400/40 dark:text-amber-400/25',
  'text-indigo-400/40 dark:text-indigo-400/25',
  'text-cyan-400/40 dark:text-cyan-400/25',
  'text-rose-400/40 dark:text-rose-400/25',
];

const FloatingParticles = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length],
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 16 + Math.random() * 20,
        x: Math.random() * 100,
        startY: 80 + Math.random() * 30,
        duration: 14 + Math.random() * 16,
        delay: Math.random() * -20,
        drift: (Math.random() - 0.5) * 60,
        rotate: Math.random() * 360,
        rotateDelta: (Math.random() - 0.5) * 180,
      })),
    []
  );

  // Use CSS keyframes instead of Framer Motion for infinite animations
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${p.color}`}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0,
          }}
        >
          {p.icon}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(90vh) translateX(0px); opacity: 0; }
          10% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-10vh) translateX(30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// EFFECT 2: MAGNETIC CTA BUTTON
// ============================================
const MagneticButton = ({ children, onClick, className = '' }) => {
  const ref = useRef(null);
  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const springX = useSpring(magnetX, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(magnetY, { stiffness: 150, damping: 15, mass: 0.1 });
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const rafRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (isTouch || rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const maxDist = 200;
        if (distance < maxDist) {
          const strength = 1 - distance / maxDist;
          magnetX.set(distX * strength * 0.4);
          magnetY.set(distY * strength * 0.4);
        } else {
          magnetX.set(0);
          magnetY.set(0);
        }
      });
    },
    [magnetX, magnetY, isTouch]
  );

  const handleMouseLeave = useCallback(() => {
    magnetX.set(0);
    magnetY.set(0);
  }, [magnetX, magnetY]);

  useEffect(() => {
    if (isTouch) return;
    const el = ref.current;
    const parent = el?.parentElement?.parentElement;
    if (!parent) return;
    parent.addEventListener('mousemove', handleMouseMove, { passive: true });
    parent.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseLeave, isTouch]);

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(59,130,246,0.4)' }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
};

// ============================================
// EFFECT 3: LIFT-OFF SCROLL ANIMATION WRAPPER
// ============================================
const LiftOff = ({ children, delay = 0, className = '', hover = 6 }) => (
  <motion.div
    initial={{ opacity: 0, y: 60 }}
    whileInView={{
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 12,
        mass: 0.8,
        delay,
      },
    }}
    viewport={{ once: true, margin: '-60px' }}
    whileHover={{ y: -hover, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================
// EFFECT 6: TYPEWRITER ROTATING WORDS
// ============================================
const ROTATING_WORDS = ['Smart Practice', 'Confidence', 'Success', 'Discipline', 'Results'];

const RotatingText = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className="relative inline-block min-h-[1.2em]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[index]}
          initial={{ y: 30, opacity: 0, rotateX: -40 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -30, opacity: 0, rotateX: 40 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="inline-block gradient-text"
          style={{ perspective: 200 }}
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
      <motion.div
        className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      />
    </span>
  );
};

// ============================================
// EFFECT 7: SCROLL PROGRESS BAR
// ============================================
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-[40] origin-left pointer-events-none"
      style={{ scaleX }}
    />
  );
};

// ============================================
// EFFECT 8: ANIMATED GRADIENT BORDER
// ============================================
const GlowBorder = ({ children, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {/* CSS-animated rotating border — no JS needed */}
      <div
        className="absolute -inset-[1.5px] rounded-2xl"
        style={{
          background:
            'conic-gradient(from var(--glow-angle, 0deg), rgba(99,102,241,0.3), rgba(59,130,246,0.15), transparent 40%, transparent 60%, rgba(139,92,246,0.15), rgba(99,102,241,0.3))',
          animation: 'glowRotate 12s linear infinite',
        }}
      />
      {/* Soft ambient glow behind card */}
      <div
        className="absolute -inset-3 rounded-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15), transparent 70%)',
          animation: 'glowPulse 4s ease-in-out infinite',
        }}
      />
      <style>{`
        @property --glow-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes glowRotate { to { --glow-angle: 360deg; } }
        @keyframes glowPulse { 0%, 100% { opacity: 0; } 50% { opacity: 0.4; } }
      `}</style>
      <div className="relative">{children}</div>
    </div>
  );
};

// ============================================
// EFFECT 11: SCROLL-DRAWN CONNECTING LINE
// ============================================
const DrawLine = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 40%'],
  });
  const pathLength = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div
      ref={ref}
      className="hidden md:block absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 -z-10 h-8"
    >
      <svg className="w-full h-full" viewBox="0 0 800 30" fill="none" preserveAspectRatio="none">
        <motion.path
          d="M 0 15 Q 200 0, 400 15 Q 600 30, 800 15"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// ============================================
// 3D TILT CARD
// ============================================
const TiltCard = ({ children, className = '' }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const handleMouse = (e) => {
    if (isTouch) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={isTouch ? {} : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// ============================================
// DEMO QUIZ DATA
// ============================================
const DEMO_QUESTIONS = [
  {
    question:
      'Which of the following is NOT a fundamental right guaranteed by the Indian Constitution?',
    options: [
      'Right to Equality',
      'Right to Property',
      'Right to Freedom',
      'Right against Exploitation',
    ],
    correct: 1,
    explanation:
      'Right to Property was removed as a fundamental right by the 44th Amendment Act, 1978. It is now a legal right under Article 300A.',
  },
  {
    question:
      'The Preamble of the Indian Constitution was amended by which Constitutional Amendment?',
    options: ['42nd Amendment', '44th Amendment', '52nd Amendment', '61st Amendment'],
    correct: 0,
    explanation:
      "The 42nd Amendment (1976) added the words 'Socialist', 'Secular', and 'Integrity' to the Preamble.",
  },
  {
    question: "Which river is known as the 'Sorrow of Bihar'?",
    options: ['Ganga', 'Son', 'Kosi', 'Gandak'],
    correct: 2,
    explanation:
      "The Kosi river is called the 'Sorrow of Bihar' due to its frequent devastating floods and course changes.",
  },
  {
    question: 'The first session of the Indian National Congress was held in which city?',
    options: ['Calcutta', 'Bombay', 'Madras', 'Allahabad'],
    correct: 1,
    explanation:
      'The first session of INC was held in Bombay (now Mumbai) in December 1885, presided over by W.C. Bonnerjee.',
  },
  {
    question:
      'Which Article of the Indian Constitution deals with the abolition of untouchability?',
    options: ['Article 14', 'Article 15', 'Article 17', 'Article 21'],
    correct: 2,
    explanation:
      'Article 17 abolishes untouchability and forbids its practice in any form. Enforcement of any disability arising out of untouchability is a punishable offence.',
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
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer';
    }
    if (idx === q.correct)
      return 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
    if (idx === selected && idx !== q.correct)
      return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    return 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500';
  };

  const getRadioStyle = (idx) => {
    if (!answered) {
      return selected === idx
        ? 'border-blue-500 bg-blue-500'
        : 'border-gray-300 dark:border-gray-600';
    }
    if (idx === q.correct) return 'border-green-500 bg-green-500';
    if (idx === selected && idx !== q.correct) return 'border-red-500 bg-red-500';
    return 'border-gray-300 dark:border-gray-600';
  };

  return (
    <div className="relative mx-auto max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, type: 'spring' }}
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
              <div className="text-5xl mb-2 flex justify-center">
                {score >= 4 ? (
                  <svg
                    className="w-12 h-12 text-amber-500"
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
                ) : score >= 2 ? (
                  <svg
                    className="w-12 h-12 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3.75A.75.75 0 0114.25 3a2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-12 h-12 text-emerald-500"
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
                  </svg>
                )}
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {score} / {DEMO_QUESTIONS.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {score === 5
                    ? "Perfect score! You're ready!"
                    : score >= 3
                      ? 'Great job! Keep practicing.'
                      : 'Good start! Practice makes perfect.'}
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
                  onClick={() => navigate('/login')}
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
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((currentQ + (answered ? 1 : 0)) / DEMO_QUESTIONS.length) * 100}%`,
                  }}
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
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {q.question}
                </p>
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
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${getRadioStyle(i)}`}
                    >
                      {answered && i === q.correct && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {answered && i === selected && i !== q.correct && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M6 18L18 6M6 6l12 12"
                          />
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
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3"
                >
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    <svg
                      className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                      />
                    </svg>
                    Explanation
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    {q.explanation}
                  </p>
                </motion.div>
              )}

              {/* Bottom bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {DEMO_QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i < currentQ
                          ? results[i]
                            ? 'bg-green-400'
                            : 'bg-red-400'
                          : i === currentQ
                            ? answered
                              ? selected === q.correct
                                ? 'bg-green-400'
                                : 'bg-red-400'
                              : 'bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
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
                    {currentQ < DEMO_QUESTIONS.length - 1 ? 'Next →' : 'See Score'}
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
    transition={{ delay, type: 'spring', stiffness: 100 }}
    className="relative"
  >
    <TiltCard className="text-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-8 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Step number watermark */}
        <div className="absolute -top-4 -right-2 text-8xl font-black text-gray-100 dark:text-gray-800/50 select-none pointer-events-none">
          {step}
        </div>
        <motion.div
          className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 sm:mb-5 shadow-lg relative text-white`}
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
// ============================================
// SOCIAL PROOF TICKER
// ============================================
const TICKER_ITEMS = [
  '🎯 2,847 tests completed this week',
  '🏆 Ankita scored 92% on IAS Prelims mock',
  '📚 150+ new questions added this month',
  '⚡ 340 aspirants practicing right now',
  '🌟 Chirag improved 23% in 2 weeks',
  '🔥 98% user satisfaction rate',
  '📈 Average score improvement: 31%',
  '🎓 Covers 10+ UPSC subjects',
];

const SocialProofTicker = () => {
  return (
    <div className="relative overflow-hidden py-4" aria-label="Social proof statistics">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{ animation: 'marquee 30s linear infinite' }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span
            key={i}
            className="text-sm text-gray-500 dark:text-gray-400 font-medium flex-shrink-0"
          >
            {item}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
};

// ============================================
// ============================================
// NAV LINKS (smooth scroll)
// ============================================
const NAV_SECTIONS = [
  { label: 'Features', id: 'features-section' },
  { label: 'How it Works', id: 'steps-section' },
  { label: 'Try Demo', id: 'testimonials-section' },
];

// ============================================
// ENHANCEMENT 1: SPOTLIGHT CARD (cursor light follows inside card)
// ============================================
const SpotlightCard = ({ children, className = '' }) => {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const spotBg = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgba(99,102,241,0.12), transparent 70%)`;

  return (
    <motion.div ref={ref} onMouseMove={handleMouseMove} className={`relative group ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: spotBg }}
      />
      {children}
    </motion.div>
  );
};

// ============================================
// ENHANCEMENT 2: MORPHING COUNTER
// ============================================
const MorphingNumber = ({ target, suffix = '', duration = 2 }) => {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const end = parseInt(target);
    const totalFrames = duration * 30; // 30fps instead of 60fps — halves re-renders
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * end);
      setDisplay(current.toLocaleString());
      if (frame >= totalFrames) {
        clearInterval(timer);
      }
    }, 1000 / 30);
    return () => clearInterval(timer);
  }, [target, duration, started]);

  return (
    <span ref={ref} className="inline-block">
      {display}
      {suffix}
    </span>
  );
};

// ============================================
// ENHANCEMENT 3: SCROLL-GRADIENT TEXT
// ============================================
const ScrollGradientText = ({ children, className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 90%', 'start 40%'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const clipRight = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      {/* Gray base text */}
      <span className="text-gray-300 dark:text-gray-600">{children}</span>
      {/* Gradient overlay that reveals on scroll */}
      <motion.span
        className="absolute inset-0 gradient-text"
        style={{ clipPath: useMotionTemplate`inset(0 calc(100% - ${clipRight}) 0 0)` }}
        aria-hidden="true"
      >
        {children}
      </motion.span>
    </span>
  );
};

// ============================================
// ENHANCEMENT 4: HORIZONTAL SCROLL SHOWCASE
// ============================================
const SHOWCASE_ITEMS = [
  {
    title: 'Real Exam Timer',
    desc: 'Countdown with auto-submit keeps you exam-ready',
    color: 'from-blue-500 to-indigo-600',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'AI Explanations',
    desc: 'Understand the why behind every answer instantly',
    color: 'from-purple-500 to-pink-600',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
  },
  {
    title: 'Performance Analytics',
    desc: 'Track progress with detailed charts and insights',
    color: 'from-emerald-500 to-teal-600',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  {
    title: 'Leaderboard',
    desc: 'Compete nationally and track your rank weekly',
    color: 'from-amber-500 to-orange-600',
    icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172',
  },
  {
    title: 'Bookmarks & Revision',
    desc: 'Save tough questions and revisit them anytime',
    color: 'from-rose-500 to-red-600',
    icon: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
  },
];

const SHOWCASE_CARDS = [...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS]; // 3x for seamless loop

const HorizontalShowcase = () => {
  const scrollRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const setWidthRef = useRef(0);

  const CARD_GAP = 20; // gap-5
  const CARD_W_SM = 260;
  const CARD_W_MD = 320;

  // Measure actual card width based on viewport
  const getCardWidth = useCallback(() => {
    return window.innerWidth >= 768 ? CARD_W_MD : CARD_W_SM;
  }, []);

  const getSetWidth = useCallback(() => {
    return SHOWCASE_ITEMS.length * (getCardWidth() + CARD_GAP);
  }, [getCardWidth]);

  // Seamless infinite scroll: jump back/forward when reaching set boundaries
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const sw = setWidthRef.current;
    if (!el || !sw) return;
    if (el.scrollLeft >= sw * 2) {
      el.scrollLeft -= sw;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += sw;
    }
  }, []);

  // Auto-scroll: 1px per frame
  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf;
    const step = () => {
      el.scrollLeft += 1;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // Position in middle set + recalc on resize
  useEffect(() => {
    const init = () => {
      setWidthRef.current = getSetWidth();
      const el = scrollRef.current;
      if (el) el.scrollLeft = setWidthRef.current;
    };
    init();
    const onResize = () => init();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getSetWidth]);

  // Resume auto-scroll 4s after user stops interacting
  useEffect(() => {
    if (!paused) return;
    const timer = setTimeout(() => setPaused(false), 4000);
    return () => clearTimeout(timer);
  }, [paused]);

  return (
    <section className="py-10 md:py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3"
        >
          What you get
        </motion.p>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
          <ScrollGradientText>Everything in one place</ScrollGradientText>
        </h2>
      </div>
      {/* Infinite scrollable carousel */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-16 md:w-32 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 md:w-32 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(true)}
          className="flex gap-5 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          role="region"
          aria-label="Feature showcase carousel"
        >
          {SHOWCASE_CARDS.map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[260px] md:w-[320px]">
              <SpotlightCard className="h-full">
                <div className="relative bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 h-full overflow-hidden group">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg text-white`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1 sm:mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.desc}
                  </p>
                  <div
                    className={`absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br ${item.color} opacity-[0.06] rounded-full`}
                  />
                </div>
              </SpotlightCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// BEFORE/AFTER COMPARISON (Social proof)
// ============================================
const COMPARISON_ITEMS = [
  {
    before: 'Scattered PDFs and YouTube',
    after: 'One platform, all subjects',
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  },
  {
    before: 'No idea where you stand',
    after: 'Real-time rank and analytics',
    gradient: 'from-purple-500 to-pink-600',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  {
    before: 'Memorize answers blindly',
    after: 'AI explains the why behind every answer',
    gradient: 'from-emerald-500 to-teal-600',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
  },
  {
    before: 'No exam-day pressure practice',
    after: 'Timed tests with anti-cheat system',
    gradient: 'from-amber-500 to-orange-600',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const ComparisonSection = () => (
  <section className="py-10 md:py-14 px-4">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
          <ScrollGradientText>Why aspirants switch to Mockzam</ScrollGradientText>
        </h2>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COMPARISON_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <SpotlightCard>
              <div className="relative bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/80 dark:border-gray-700/80 overflow-hidden group hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                {/* Gradient accent line on top */}
                <div
                  className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg text-white`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                {/* Before (crossed out) */}
                <p className="text-sm text-red-400/80 dark:text-red-400/70 line-through decoration-red-300/50 mb-2">
                  {item.before}
                </p>
                {/* After */}
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {item.after}
                  </span>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// ============================================
// ENHANCEMENT 5: BENTO GRID FEATURES
// ============================================
const BentoCard = ({ icon, title, description, gradient, className = '', large = false }) => (
  <SpotlightCard className={`${className} h-full`}>
    <div
      className={`relative bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl ${large ? 'p-5 sm:p-8' : 'p-4 sm:p-6'} border border-gray-200/80 dark:border-gray-700/80 h-full overflow-hidden group transition-colors duration-300 hover:border-gray-300 dark:hover:border-gray-600`}
    >
      <div
        className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <motion.div
        className={`${large ? 'w-14 h-14' : 'w-11 h-11'} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg bento-icon`}
        whileHover={{ scale: 1.1, rotate: -5 }}
      >
        {icon}
      </motion.div>
      <h3
        className={`${large ? 'text-xl' : 'text-base'} font-bold text-gray-900 dark:text-white mb-2`}
      >
        {title}
      </h3>
      <p
        className={`${large ? 'text-base' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-relaxed`}
      >
        {description}
      </p>
      <div
        className={`absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.07] rounded-full transition-opacity duration-500`}
      />
    </div>
  </SpotlightCard>
);

// ============================================
// ENHANCEMENT 6: STICKY REVEAL SECTIONS
// ============================================
const RevealSection = ({ children, className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start 30%'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  return (
    <motion.div ref={ref} style={{ y, opacity }} className={`relative ${className}`}>
      {children}
    </motion.div>
  );
};

// ============================================
// ENHANCEMENT 7: TRUST MARQUEE BAR
// ============================================
const TRUST_BADGES = [
  'UPSC CSE',
  'IAS Prelims',
  'CDS',
  'CSAT',
  'Indian Polity',
  'Geography',
  'Modern History',
  'Economics',
  'Science & Tech',
  'Environment',
  'Current Affairs',
  'Art & Culture',
];

const TrustMarquee = () => (
  <div className="relative py-5 overflow-hidden" aria-label="Exam categories covered">
    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10 pointer-events-none" />
    <div
      className="flex gap-4 whitespace-nowrap"
      style={{ animation: 'marqueeTrust 25s linear infinite' }}
    >
      {[...TRUST_BADGES, ...TRUST_BADGES].map((badge, i) => (
        <span
          key={i}
          className="flex-shrink-0 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300"
        >
          {badge}
        </span>
      ))}
    </div>
    <style>{`@keyframes marqueeTrust { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
  </div>
);

// ============================================
// MAIN LANDING COMPONENT
// ============================================
const Landing = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: (
        <svg
          className="w-7 h-7 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      ),
      title: 'Real Exam Simulation',
      description:
        'Experience actual UPSC exam conditions with timed tests, negative marking, and section-wise analysis.',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: (
        <svg
          className="w-7 h-7 text-purple-600 dark:text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      ),
      title: 'AI-Powered Explanations',
      description:
        'Get instant, detailed explanations for every question powered by advanced AI to deepen your understanding.',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: (
        <svg
          className="w-7 h-7 text-amber-600 dark:text-amber-400"
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
      ),
      title: 'Live Leaderboard',
      description:
        'Compete with aspirants nationwide. Weekly rankings keep you motivated and on track.',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: (
        <svg
          className="w-7 h-7 text-orange-600 dark:text-orange-400"
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
        </svg>
      ),
      title: 'Practice Mode',
      description:
        'Learn at your own pace. No timer, instant answers, and bookmark questions for revision.',
      gradient: 'from-orange-500 to-amber-600',
    },
    {
      icon: (
        <svg
          className="w-7 h-7 text-rose-600 dark:text-rose-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      ),
      title: 'Custom Tests',
      description:
        'Build your own test — pick subjects, topics, difficulty, and question count to target weak areas.',
      gradient: 'from-rose-500 to-red-600',
    },
    {
      icon: (
        <svg
          className="w-7 h-7 text-cyan-600 dark:text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      ),
      title: 'Anti-Cheat System',
      description:
        'Tab-switch detection and copy protection ensure fair practice and build real exam discipline.',
      gradient: 'from-cyan-500 to-blue-600',
    },
  ];

  /* =============================================
   * PAGE STRUCTURE (based on top-100 landing page research):
   * 1. HERO — centered headline + product preview (demo quiz)
   * 2. TRUST BAR — stats + social proof ticker
   * 3. PROBLEM — why aspirants need this (before/after)
   * 4. FEATURES — bento grid (problem-oriented)
   * 5. PRODUCT SHOWCASE — auto-scroll feature cards
   * 6. HOW IT WORKS — 3 steps
   * 7. SOCIAL PROOF — testimonials
   * 8. FINAL CTA — full-width, distinct
   * 9. FOOTER — minimal
   * ============================================= */

  return (
    <div className="min-h-screen overflow-hidden relative">
      <AuroraCanvas />
      <ScrollProgress />

      <div className="relative z-10">
        {/* ===== 0. NAVBAR ===== */}
        <motion.nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'glass-card shadow-lg' : 'bg-transparent'}`}
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden"
                whileHover={{ rotate: 10 }}
              >
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="navBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <filter id="navGlow">
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
                    fill="url(#navBolt)"
                    filter="url(#navGlow)"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.7;1;0.7"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </motion.div>
              <span className="font-bold text-lg gradient-text hidden sm:block">Mockzam</span>
            </motion.div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 mr-2">
                {NAV_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <ThemeToggle />
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.97]"
              >
                Get Started
              </button>
            </div>
          </div>
        </motion.nav>

        {/* ===== 1. HERO — Headline + CTA ===== */}
        <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 px-4">
          <FloatingParticles />

          <motion.div style={{ y: heroY }} className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, type: 'spring' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-6 border border-blue-100 dark:border-blue-800"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Free for all UPSC aspirants
                </span>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
                Your path to <RotatingText />
                <br />
                <span className="text-gray-500 dark:text-gray-400 text-[0.85em]">starts here.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                Practice with 5000+ real exam questions, AI explanations, and detailed analytics.
                Built by aspirants, for aspirants.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <MagneticButton
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  Start Practicing &mdash; It&apos;s Free
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ===== 2. TRUST BAR — Stats + social proof (immediately, no gap) ===== */}
        <section id="stats-section" className="pt-10 pb-2 md:pt-14 md:pb-4 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                value: '5000',
                suffix: '+',
                label: 'Questions',
                gradient: 'from-blue-500 to-indigo-600',
                iconPath:
                  'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
                color: 'text-blue-600 dark:text-blue-400',
              },
              {
                value: '1000',
                suffix: '+',
                label: 'Aspirants',
                gradient: 'from-purple-500 to-pink-600',
                iconPath:
                  'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
                color: 'text-purple-600 dark:text-purple-400',
              },
              {
                value: '4',
                suffix: '',
                label: 'Exam Types',
                gradient: 'from-emerald-500 to-teal-600',
                iconPath:
                  'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
                color: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                value: '98',
                suffix: '%',
                label: 'Satisfaction',
                gradient: 'from-orange-500 to-amber-600',
                iconPath:
                  'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
                color: 'text-orange-600 dark:text-orange-400',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
              >
                <SpotlightCard>
                  <div className="relative bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-3 sm:p-5 border border-gray-200/80 dark:border-gray-700/80 text-center overflow-hidden">
                    <div
                      className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full`}
                    />
                    <div className="text-2xl mb-2 flex justify-center">
                      <svg
                        className={`w-7 h-7 ${stat.color}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={stat.iconPath} />
                      </svg>
                    </div>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1">
                      <span className="gradient-text">
                        <MorphingNumber target={stat.value} suffix={stat.suffix} />
                      </span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {stat.label}
                    </p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== 2b. SOCIAL PROOF TICKER ===== */}
        <SocialProofTicker />

        {/* ===== 3. PROBLEM — Why aspirants switch ===== */}
        <ComparisonSection />

        {/* ===== 4. FEATURES — Bento grid ===== */}
        <section id="features-section" className="py-10 md:py-14 px-4 relative">
          <div className="max-w-6xl mx-auto relative">
            <RevealSection>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-full mb-4 border border-purple-100 dark:border-purple-800"
                >
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    <svg
                      className="w-4 h-4 inline-block mr-1 -mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                    Built for serious aspirants
                  </span>
                </motion.div>
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-3">
                  <ScrollGradientText>Stop guessing. Start preparing.</ScrollGradientText>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-lg">
                  Every feature solves a real problem aspirants face daily.
                </p>
              </motion.div>
            </RevealSection>

            {/* Bento Grid — asymmetric layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Large featured card spanning 2 cols + 2 rows */}
              <div className="lg:col-span-2 lg:row-span-2">
                <LiftOff delay={0} hover={6} className="h-full">
                  <BentoCard
                    large
                    icon={features[0].icon}
                    title={features[0].title}
                    description={features[0].description}
                    gradient={features[0].gradient}
                    className="h-full"
                  />
                </LiftOff>
              </div>
              <LiftOff delay={0.08} hover={6} className="h-full">
                <BentoCard
                  icon={features[1].icon}
                  title={features[1].title}
                  description={features[1].description}
                  gradient={features[1].gradient}
                  className="h-full"
                />
              </LiftOff>
              <LiftOff delay={0.16} hover={6} className="h-full">
                <BentoCard
                  icon={features[2].icon}
                  title={features[2].title}
                  description={features[2].description}
                  gradient={features[2].gradient}
                  className="h-full"
                />
              </LiftOff>
              {/* Bottom row: Three equal */}
              <LiftOff delay={0.24} hover={6} className="h-full">
                <BentoCard
                  icon={features[3].icon}
                  title={features[3].title}
                  description={features[3].description}
                  gradient={features[3].gradient}
                  className="h-full"
                />
              </LiftOff>
              <LiftOff delay={0.32} hover={6} className="h-full">
                <BentoCard
                  icon={features[4].icon}
                  title={features[4].title}
                  description={features[4].description}
                  gradient={features[4].gradient}
                  className="h-full"
                />
              </LiftOff>
              <LiftOff delay={0.4} hover={6} className="h-full">
                <BentoCard
                  icon={features[5].icon}
                  title={features[5].title}
                  description={features[5].description}
                  gradient={features[5].gradient}
                  className="h-full"
                />
              </LiftOff>
            </div>
          </div>
        </section>

        {/* ===== 5. PRODUCT SHOWCASE — Auto-scroll cards ===== */}
        <HorizontalShowcase />

        {/* ===== 5b. EXAM CATEGORIES ===== */}
        <TrustMarquee />

        {/* ===== 6. HOW IT WORKS — 3 steps ===== */}
        <RevealSection>
          <section id="steps-section" className="py-10 md:py-14 px-4 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 dark:via-blue-950/20 to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                  <ScrollGradientText>Get started in 3 simple steps</ScrollGradientText>
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LiftOff delay={0} hover={6}>
                  <StepCard
                    step="01"
                    title="Sign In"
                    desc="Continue with Google — one click and you're in."
                    icon={
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                        />
                      </svg>
                    }
                    gradient="from-blue-500 to-indigo-600"
                    delay={0}
                  />
                </LiftOff>
                <LiftOff delay={0.15} hover={6}>
                  <StepCard
                    step="02"
                    title="Choose Your Exam"
                    desc="Select your target exam — CDS, CSAT, IAS GS, or IAS CSAT."
                    icon={
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                        />
                      </svg>
                    }
                    gradient="from-purple-500 to-pink-600"
                    delay={0}
                  />
                </LiftOff>
                <LiftOff delay={0.3} hover={6}>
                  <StepCard
                    step="03"
                    title="Start Practicing"
                    desc="Take mock tests, practice by topic, or build custom tests."
                    icon={
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                        />
                      </svg>
                    }
                    gradient="from-emerald-500 to-teal-600"
                    delay={0}
                  />
                </LiftOff>
              </div>

              {/* Scroll-drawn connecting line (desktop) */}
              <DrawLine />
            </div>
          </section>
        </RevealSection>

        {/* ===== 7. TRY IT OUT — Interactive Demo Quiz ===== */}
        <RevealSection>
          <section id="testimonials-section" className="py-10 md:py-14 px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                  <ScrollGradientText>Try it yourself</ScrollGradientText>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Take a quick 5-question demo — no sign up needed
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="max-w-xl mx-auto"
              >
                <GlowBorder>
                  <DemoQuiz />
                </GlowBorder>
              </motion.div>
            </div>
          </section>
        </RevealSection>

        {/* ===== 9. FOOTER — Minimal ===== */}
        <footer className="relative pt-6 pb-8 px-4" role="contentinfo">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 max-w-md h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
          <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
            <nav className="flex flex-wrap justify-center gap-4" aria-label="Footer navigation">
              {NAV_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/privacy')}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Privacy
              </button>
              <button
                onClick={() => navigate('/terms')}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Terms
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
                <svg
                  className="w-7 h-7"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="footerBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
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
                    fill="url(#footerBolt)"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Mockzam &middot; Made with{' '}
                <svg
                  className="w-3.5 h-3.5 inline-block mx-0.5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>{' '}
                for UPSC aspirants
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
