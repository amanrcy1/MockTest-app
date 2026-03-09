// ============================================
// SOLAR SYSTEM SCENE ORCHESTRATOR
// Main component that assembles everything
// ============================================
import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Sun from "./Sun";
import Planet from "./planets/Planet";
import AsteroidBelt from "./AsteroidBelt";
import KuiperBelt, { Pluto } from "./KuiperBelt";
import Comet from "./Comet";
import Background from "./Background";
import OrbitLines from "./OrbitLines";
import CameraSystem from "./CameraSystem";
import SolarWindParticles, { SpaceDust } from "./effects/Particles";
import LensFlare from "./effects/LensFlare";
import { ORBITAL_DATA } from "./constants";
import { computeOrbitalPosition, realTimeToSimDays } from "./physics";

// UI Components (rendered outside Canvas)
import PlanetInfo from "./ui/PlanetInfo";
import Controls from "./ui/Controls";
import HUD from "./ui/HUD";
import CompareMode from "./ui/CompareMode";

const PLANET_NAMES = Object.keys(ORBITAL_DATA);

// ============================================
// SIMULATION CLOCK (inside Canvas)
// ============================================
const SimClock = ({ speed, isPaused, onTimeUpdate }) => {
  const simTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (isPaused) return;
    const simDelta = realTimeToSimDays(delta * 1000, speed);
    simTimeRef.current += simDelta;
    onTimeUpdate(simTimeRef.current);
  });

  return null;
};

// ============================================
// SCENE CONTENT (inside Canvas)
// ============================================
const SceneContent = ({
  simTime,
  speed,
  isPaused,
  selectedPlanet,
  hoveredPlanet,
  showOrbits,
  showConstellations,
  onSelectPlanet,
  onHoverPlanet,
  onUnhoverPlanet,
  onTimeUpdate,
  cameraMode,
  targetPosition,
  onCameraArrived,
}) => (
  <>
    {/* Simulation clock */}
    <SimClock speed={speed} isPaused={isPaused} onTimeUpdate={onTimeUpdate} />

    {/* Camera */}
    <CameraSystem
      target={selectedPlanet}
      targetPosition={targetPosition}
      mode={cameraMode}
      onArrived={onCameraArrived}
      speed={speed}
    />

    {/* Ambient light (very dim — space is dark) */}
    <ambientLight intensity={0.04} />

    {/* Sun */}
    <Sun
      onClick={onSelectPlanet}
      isHovered={hoveredPlanet === "Sun"}
      onPointerOver={onHoverPlanet}
      onPointerOut={onUnhoverPlanet}
    />

    {/* Solar wind */}
    <SolarWindParticles count={150} />

    {/* Planets */}
    {PLANET_NAMES.map((name) => (
      <Planet
        key={name}
        name={name}
        simTime={simTime}
        onClick={onSelectPlanet}
        onPointerOver={onHoverPlanet}
        onPointerOut={onUnhoverPlanet}
        isHovered={hoveredPlanet === name}
        isSelected={selectedPlanet === name}
        showOrbit={showOrbits}
      />
    ))}

    {/* Orbit lines */}
    <OrbitLines visible={showOrbits} />

    {/* Asteroid belt */}
    <AsteroidBelt />

    {/* Kuiper belt + Pluto */}
    <KuiperBelt />
    <Pluto
      simTime={simTime}
      onClick={onSelectPlanet}
      onPointerOver={onHoverPlanet}
      onPointerOut={onUnhoverPlanet}
    />

    {/* Comets */}
    <Comet orbitRadius={14} speed={0.12} eccentricity={0.75} inclination={30} startAngle={1} />
    <Comet orbitRadius={18} speed={0.08} eccentricity={0.8} inclination={-20} startAngle={4} />

    {/* Background */}
    <Background showConstellations={showConstellations} />

    {/* Space dust */}
    <SpaceDust count={300} />

    {/* Lens flare */}
    <LensFlare sunPosition={[0, 0, 0]} intensity={0.8} />
  </>
);

// ============================================
// MAIN EXPORTED COMPONENT
// ============================================
const SolarSystemScene = ({ embedded = false }) => {
  const [simTime, setSimTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConstellations, setShowConstellations] = useState(false);
  const [compareMode, setCompareMode] = useState(null);
  const [cameraMode, setCameraMode] = useState("orbit");
  const [targetPosition, setTargetPosition] = useState(null);

  // Handle planet selection
  const handleSelectPlanet = useCallback((name) => {
    if (selectedPlanet === name) {
      // Deselect
      setSelectedPlanet(null);
      setCameraMode("orbit");
      setTargetPosition(null);
    } else {
      setSelectedPlanet(name);
      if (name === "Sun") {
        setTargetPosition([0, 0, 0]);
      } else if (name === "Pluto") {
        // Pluto has special orbit handling
        setTargetPosition([23, 0, 0]);
      } else {
        const pos = computeOrbitalPosition(name, simTime);
        setTargetPosition(pos);
      }
      setCameraMode("flyTo");
    }
  }, [selectedPlanet, simTime]);

  const handleCameraArrived = useCallback(() => {
    setCameraMode("orbit");
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedPlanet(null);
    setCameraMode("orbit");
    setTargetPosition(null);
  }, []);

  // ESC to deselect
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleResetView();
        setCompareMode(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleResetView]);

  const containerClass = embedded
    ? "w-full h-full relative"
    : "w-full h-[100dvh] relative bg-black";

  return (
    <div className={containerClass}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 15, 30], fov: 50, near: 0.01, far: 200 }}
        gl={{ antialias: true, alpha: embedded, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 1.5]}
        style={{ background: embedded ? "transparent" : "#000005" }}
      >
        <SceneContent
          simTime={simTime}
          speed={speed}
          isPaused={isPaused}
          selectedPlanet={selectedPlanet}
          hoveredPlanet={hoveredPlanet}
          showOrbits={showOrbits}
          showConstellations={showConstellations}
          onSelectPlanet={handleSelectPlanet}
          onHoverPlanet={setHoveredPlanet}
          onUnhoverPlanet={() => setHoveredPlanet(null)}
          onTimeUpdate={setSimTime}
          cameraMode={cameraMode}
          targetPosition={targetPosition}
          onCameraArrived={handleCameraArrived}
        />
      </Canvas>

      {/* UI Overlays */}
      <HUD
        simTime={simTime}
        selectedPlanet={selectedPlanet}
        speed={speed}
        isPaused={isPaused}
      />

      <Controls
        speed={speed}
        onSpeedChange={setSpeed}
        onPlanetSelect={handleSelectPlanet}
        selectedPlanet={selectedPlanet}
        showOrbits={showOrbits}
        onToggleOrbits={() => setShowOrbits((v) => !v)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        showConstellations={showConstellations}
        onToggleConstellations={() => setShowConstellations((v) => !v)}
        onResetView={handleResetView}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((v) => !v)}
      />

      {/* Planet info panel */}
      {selectedPlanet && (
        <PlanetInfo
          planetName={selectedPlanet}
          onClose={() => { setSelectedPlanet(null); setCameraMode("orbit"); setTargetPosition(null); }}
          onCompare={(name) => setCompareMode(name)}
        />
      )}

      {/* Compare mode */}
      {compareMode && (
        <CompareMode
          initialPlanet={compareMode}
          onClose={() => setCompareMode(null)}
        />
      )}
    </div>
  );
};

export default SolarSystemScene;
