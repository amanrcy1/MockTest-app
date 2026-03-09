// ============================================
// PLANET INFO PANEL
// Detailed info overlay when a planet is selected
// ============================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLANET_INFO } from "../data";
import { PLANET_COLORS } from "../constants";

const PlanetInfo = ({ planetName, onClose, onCompare }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const info = PLANET_INFO[planetName];
  if (!info) return null;

  const color = PLANET_COLORS[planetName] || "#4488ff";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "facts", label: "Facts" },
    { id: "data", label: "Data" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="absolute inset-x-3 bottom-3 sm:inset-auto sm:top-4 sm:right-4 sm:w-80 max-h-[70vh] sm:max-h-[85vh] overflow-y-auto z-30 pointer-events-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative p-5 pb-3">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{info.name}</h2>
                <p className="text-xs text-white/50 mt-0.5">{info.type}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label="Close panel"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Planet color indicator */}
            <div className="mt-3 w-12 h-12 rounded-full mx-auto shadow-lg" style={{ background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}44)`, boxShadow: `0 0 20px ${color}33` }} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="px-5 pb-5">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                  <p className="text-sm text-white/70 leading-relaxed">{info.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {info.diameter && <InfoChip label="Diameter" value={info.diameter} />}
                    {info.temperature && <InfoChip label="Temperature" value={info.temperature} />}
                    {info.gravity && <InfoChip label="Gravity" value={info.gravity} />}
                    {info.dayLength && <InfoChip label="Day Length" value={info.dayLength} />}
                    {info.yearLength && <InfoChip label="Year Length" value={info.yearLength} />}
                    {info.distanceFromSun && <InfoChip label="From Sun" value={info.distanceFromSun} />}
                  </div>
                </motion.div>
              )}

              {activeTab === "facts" && (
                <motion.div key="facts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                  {info.facts?.map((fact, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-2 items-start"
                    >
                      <span className="text-xs mt-1" style={{ color }}>●</span>
                      <p className="text-sm text-white/70 leading-relaxed">{fact}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === "data" && (
                <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                  <DataRow label="Mass" value={info.mass} />
                  <DataRow label="Atmosphere" value={info.atmosphere || "None"} />
                  <DataRow label="Moons" value={`${info.moons} known`} />
                  {info.moonNames && <DataRow label="Major Moons" value={info.moonNames.join(", ")} />}
                  <DataRow label="Rings" value={info.hasRings ? "Yes" : "No"} />
                  <DataRow label="Discovered" value={info.discoveredBy} />
                  {info.composition && <DataRow label="Composition" value={info.composition} />}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
              {onCompare && (
                <button
                  onClick={() => onCompare(planetName)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/70 hover:text-white transition-colors"
                >
                  Compare
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const InfoChip = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg p-2">
    <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
    <p className="text-xs text-white/80 font-medium mt-0.5">{value}</p>
  </div>
);

const DataRow = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
    <span className="text-xs text-white/40 flex-shrink-0">{label}</span>
    <span className="text-xs text-white/70 text-right">{value}</span>
  </div>
);

export default PlanetInfo;
