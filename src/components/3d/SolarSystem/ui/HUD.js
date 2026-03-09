// ============================================
// HEADS-UP DISPLAY
// Minimal info overlay — time, selected planet, distance
// ============================================
import { motion } from "framer-motion";

const HUD = ({ simTime, selectedPlanet, speed, isPaused }) => {
  // Convert sim time to readable format
  const simDays = Math.floor(simTime);
  const simYears = (simDays / 365.25).toFixed(1);

  return (
    <div className="absolute top-14 sm:top-4 left-2 sm:left-4 z-30 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/5 px-3 py-2 sm:px-4 sm:py-3 space-y-1"
      >
        {/* Time display */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-green-400"} animate-pulse`} />
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {isPaused ? "Paused" : `${speed}× Speed`}
          </span>
        </div>

        <div className="text-xs sm:text-sm font-mono text-white/80">
          Day {simDays.toLocaleString()} <span className="text-white/30">|</span> Year {simYears}
        </div>

        {/* Selected planet */}
        {selectedPlanet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-blue-300/70 mt-1"
          >
            Viewing: {selectedPlanet}
          </motion.div>
        )}
      </motion.div>

      {/* Keyboard hints — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-2 text-[9px] text-white/20 space-y-0.5 hidden sm:block"
      >
        <p>Drag to orbit • Scroll to zoom</p>
        <p>Arrow keys to rotate • +/- to zoom</p>
        <p>Click planet for details • ESC to deselect</p>
      </motion.div>
    </div>
  );
};

export default HUD;
