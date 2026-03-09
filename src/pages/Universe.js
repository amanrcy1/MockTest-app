// ============================================
// UNIVERSE EXPLORER — Full-page Solar System
// Route: /universe
// ============================================
import { Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const SolarSystemScene = lazy(() =>
  import("../components/3d/SolarSystem/SolarSystemScene")
);

const UniverseLoader = () => (
  <div className="w-full h-[100dvh] bg-black flex flex-col items-center justify-center">
    <div className="relative">
      {/* Animated sun loader */}
      <motion.div
        className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"
        animate={{
          boxShadow: [
            "0 0 20px rgba(255,170,0,0.3)",
            "0 0 40px rgba(255,170,0,0.5)",
            "0 0 20px rgba(255,170,0,0.3)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Orbiting dot */}
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-blue-400"
        style={{ top: "50%", left: "50%", marginTop: -6, marginLeft: -6 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-3 h-3 rounded-full bg-blue-400" style={{ transform: "translateX(30px)" }} />
      </motion.div>
    </div>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="text-white/50 text-sm mt-6"
    >
      Generating solar system...
    </motion.p>
  </div>
);

const Universe = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden">
      <Suspense fallback={<UniverseLoader />}>
        <SolarSystemScene embedded={false} />
      </Suspense>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        onClick={() => navigate("/")}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 px-3 py-2 sm:px-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white text-xs sm:text-sm font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5 sm:gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="hidden sm:inline">Back to Mockzam</span>
        <span className="sm:hidden">Back</span>
      </motion.button>

      {/* Explore prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      >
        <motion.p
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-white/30 text-[10px] sm:text-xs text-center"
        >
          <span className="hidden sm:inline">Click any planet to explore • Drag to orbit • Scroll to zoom</span>
          <span className="sm:hidden">Tap a planet to explore • Pinch to zoom</span>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Universe;
