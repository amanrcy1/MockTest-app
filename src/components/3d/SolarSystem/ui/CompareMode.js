// ============================================
// PLANET COMPARISON MODE
// Side-by-side comparison of two planets
// ============================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLANET_INFO, COMPARISON_METRICS, COMPARISON_VALUES } from "../data";
import { PLANET_COLORS } from "../constants";

const PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

const CompareMode = ({ initialPlanet, onClose }) => {
  const [planetA, setPlanetA] = useState(initialPlanet || "Earth");
  const [planetB, setPlanetB] = useState(initialPlanet === "Mars" ? "Earth" : "Mars");

  const infoA = PLANET_INFO[planetA];
  const infoB = PLANET_INFO[planetB];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[95vw] sm:w-[90vw] max-w-2xl"
      >
        <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Planet Comparison</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              aria-label="Close comparison"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Planet selectors */}
          <div className="flex items-center justify-between px-5 py-3">
            <PlanetSelector value={planetA} onChange={setPlanetA} exclude={planetB} />
            <span className="text-white/20 text-xs font-bold">VS</span>
            <PlanetSelector value={planetB} onChange={setPlanetB} exclude={planetA} />
          </div>

          {/* Comparison bars */}
          <div className="px-5 pb-4 space-y-2">
            {COMPARISON_METRICS.map((metric) => {
              const values = COMPARISON_VALUES[metric.key];
              if (!values) {
                // Text comparison
                const valA = infoA?.[metric.key] || "—";
                const valB = infoB?.[metric.key] || "—";
                return (
                  <div key={metric.key} className="flex items-center justify-between py-1">
                    <span className="text-xs text-white/60 w-20 text-right">{typeof valA === "number" ? valA : String(valA).slice(0, 15)}</span>
                    <span className="text-[10px] text-white/30 flex-1 text-center">{metric.label}</span>
                    <span className="text-xs text-white/60 w-20">{typeof valB === "number" ? valB : String(valB).slice(0, 15)}</span>
                  </div>
                );
              }

              const valA = values[planetA] || 0;
              const valB = values[planetB] || 0;
              const max = Math.max(valA, valB, 0.001);
              const pctA = (valA / max) * 100;
              const pctB = (valB / max) * 100;

              return (
                <div key={metric.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-mono">{valA.toLocaleString()}</span>
                    <span className="text-[10px] text-white/30">{metric.label}</span>
                    <span className="text-xs text-white/60 font-mono">{valB.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="flex-1 flex justify-end">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctA}%` }}
                        className="h-full rounded-l-full"
                        style={{ background: PLANET_COLORS[planetA] }}
                      />
                    </div>
                    <div className="flex-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctB}%` }}
                        className="h-full rounded-r-full"
                        style={{ background: PLANET_COLORS[planetB] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const PlanetSelector = ({ value, onChange, exclude }) => (
  <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
    {PLANETS.filter((p) => p !== exclude).map((planet) => (
      <button
        key={planet}
        onClick={() => onChange(planet)}
        className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
          value === planet
            ? "text-white"
            : "text-white/30 hover:text-white/60"
        }`}
        style={value === planet ? { background: `${PLANET_COLORS[planet]}33`, borderColor: `${PLANET_COLORS[planet]}55`, borderWidth: 1 } : {}}
      >
        {planet}
      </button>
    ))}
  </div>
);

export default CompareMode;
