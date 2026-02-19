import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

/**
 * Elegant celebration effect for test completion
 */
const CelebrationEffect = memo(({ show, score, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.5 + Math.random() * 1,
        color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"][Math.floor(Math.random() * 4)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Auto-dismiss after 2 seconds
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const getGrade = (score) => {
    if (score >= 90) return { grade: "A+", color: "text-green-500", message: "Outstanding!" };
    if (score >= 80) return { grade: "A", color: "text-green-500", message: "Excellent!" };
    if (score >= 70) return { grade: "B", color: "text-blue-500", message: "Great Job!" };
    if (score >= 60) return { grade: "C", color: "text-yellow-500", message: "Good Effort!" };
    if (score >= 50) return { grade: "D", color: "text-orange-500", message: "Keep Practicing!" };
    return { grade: "F", color: "text-red-500", message: "Don't Give Up!" };
  };

  const gradeInfo = getGrade(score);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${particle.x}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: window.innerHeight + 100,
                opacity: [1, 1, 0],
                rotate: particle.rotation + 720,
                x: [0, (Math.random() - 0.5) * 200],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Central celebration badge - Smaller */}
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.1 
            }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-400/20 blur-2xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            
            {/* Trophy/Badge - Compact */}
            <motion.div
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 text-center min-w-[200px]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Trophy icon */}
              <motion.div
                className="text-5xl mb-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" /></svg>
              </motion.div>
              
              {/* Grade */}
              <motion.div
                className={`text-4xl font-bold ${gradeInfo.color} mb-1`}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.1, 1] }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {gradeInfo.grade}
              </motion.div>
              
              {/* Score */}
              <motion.div
                className="text-xl font-semibold text-gray-700 dark:text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score?.toFixed(1)}%
              </motion.div>
              
              {/* Message */}
              <motion.p
                className="text-gray-500 dark:text-gray-400 text-sm mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {gradeInfo.message}
              </motion.p>

              {/* Skip button */}
              <motion.button
                onClick={onComplete}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Skip
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CelebrationEffect.displayName = "CelebrationEffect";

CelebrationEffect.propTypes = {
  show: PropTypes.bool.isRequired,
  score: PropTypes.number.isRequired,
  onComplete: PropTypes.func.isRequired,
};

export default CelebrationEffect;
