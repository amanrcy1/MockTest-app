// ============================================
// SOLAR SYSTEM CONTROLS
// Speed, view presets, planet selector, toggles
// ============================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPEED_OPTIONS, PLANET_COLORS } from "../constants";

const PLANETS = ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const Controls = ({
  speed,
  onSpeedChange,
  onPlanetSelect,
  selectedPlanet,
  showOrbits,
  onToggleOrbits,
  showLabels,
  onToggleLabels,
  showConstellations,
  onToggleConstellations,
  onResetView,
  isPaused,
  onTogglePause,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 left-2 sm:bottom-4 sm:left-4 z-30 pointer-events-auto max-w-[calc(100vw-1rem)] sm:max-w-none">
      {/* Toggle button */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="w-10 h-10 rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors mb-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle controls"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 p-3 sm:p-4 w-[calc(100vw-2rem)] sm:w-64 shadow-2xl space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto"
          >
            {/* Speed control */}
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Time Speed</p>
              <div className="flex flex-wrap gap-1">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onSpeedChange(opt.value)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      speed === opt.value
                        ? "bg-blue-500/30 text-blue-300 border border-blue-500/30"
                        : "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onTogglePause}
                  className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isPaused ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-white/50 hover:text-white/80"
                  }`}
                >
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
              </div>
            </div>

            {/* Planet selector */}
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Navigate To</p>
              <div className="grid grid-cols-5 gap-1">
                {PLANETS.map((planet) => (
                  <button
                    key={planet}
                    onClick={() => onPlanetSelect(planet)}
                    className={`group relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                      selectedPlanet === planet
                        ? "bg-white/15"
                        : "hover:bg-white/5"
                    }`}
                    title={planet}
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${PLANET_COLORS[planet] || "#888"}dd, ${PLANET_COLORS[planet] || "#888"}66)`,
                        boxShadow: selectedPlanet === planet ? `0 0 8px ${PLANET_COLORS[planet]}44` : "none",
                      }}
                    />
                    <span className="text-[8px] text-white/40 group-hover:text-white/70 truncate w-full text-center">
                      {planet.slice(0, 3)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Display</p>
              <ToggleRow label="Orbit Lines" checked={showOrbits} onChange={onToggleOrbits} />
              <ToggleRow label="Planet Labels" checked={showLabels} onChange={onToggleLabels} />
              <ToggleRow label="Constellations" checked={showConstellations} onChange={onToggleConstellations} />
            </div>

            {/* Reset */}
            <button
              onClick={onResetView}
              className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              Reset View
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ToggleRow = ({ label, checked, onChange }) => (
  <button
    onClick={onChange}
    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
  >
    <span className="text-xs text-white/60">{label}</span>
    <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? "bg-blue-500/40" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${checked ? "left-4 bg-blue-400" : "left-0.5 bg-white/40"}`} />
    </div>
  </button>
);

export default Controls;
