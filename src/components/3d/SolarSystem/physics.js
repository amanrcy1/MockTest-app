// ============================================
// ORBITAL MECHANICS & PHYSICS ENGINE
// Kepler's laws, gravitational calculations
// ============================================
import { ORBITAL_DATA, SCALE } from "./constants";

// ============================================
// KEPLER EQUATION SOLVER
// Solve M = E - e*sin(E) for E using Newton-Raphson
// ============================================
export const solveKepler = (M, e, tolerance = 1e-6, maxIter = 30) => {
  let E = M; // Initial guess
  for (let i = 0; i < maxIter; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
};

// ============================================
// COMPUTE ORBITAL POSITION
// Returns [x, y, z] position for a planet at given time
// ============================================
export const computeOrbitalPosition = (planetName, timeInDays) => {
  const data = ORBITAL_DATA[planetName];
  if (!data) return [0, 0, 0];

  const { semiMajorAxis, eccentricity, inclination, orbitalPeriod, meanAnomaly } = data;

  // Mean anomaly at current time (radians)
  const M = ((meanAnomaly * Math.PI) / 180 + (2 * Math.PI * timeInDays) / orbitalPeriod) % (2 * Math.PI);

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKepler(M, eccentricity);

  // True anomaly
  const cosV = (Math.cos(E) - eccentricity) / (1 - eccentricity * Math.cos(E));
  const sinV = (Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E)) / (1 - eccentricity * Math.cos(E));
  const v = Math.atan2(sinV, cosV);

  // Distance from focus
  const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));

  // Position in orbital plane
  const xOrbit = r * Math.cos(v);
  const yOrbit = r * Math.sin(v);

  // Apply inclination (rotate around x-axis)
  const incRad = (inclination * Math.PI) / 180;
  const x = xOrbit;
  const y = yOrbit * Math.cos(incRad);
  const z = yOrbit * Math.sin(incRad);

  return [x, y, z];
};

// ============================================
// COMPUTE ROTATION ANGLE
// Returns rotation angle in radians for a planet at given time
// ============================================
export const computeRotation = (planetName, timeInDays) => {
  const data = ORBITAL_DATA[planetName];
  if (!data) return 0;
  const rotationsCompleted = timeInDays / Math.abs(data.rotationPeriod);
  const direction = data.rotationPeriod < 0 ? -1 : 1;
  return direction * rotationsCompleted * Math.PI * 2;
};

// ============================================
// COMPUTE MOON POSITION
// Simple circular orbit for moons
// ============================================
export const computeMoonPosition = (orbitRadius, speed, timeInDays, inclination = 0) => {
  const angle = timeInDays * speed * 0.1;
  const incRad = (inclination * Math.PI) / 180;
  const x = orbitRadius * Math.cos(angle);
  const y = orbitRadius * Math.sin(angle) * Math.cos(incRad);
  const z = orbitRadius * Math.sin(angle) * Math.sin(incRad);
  return [x, y, z];
};

// ============================================
// ORBITAL PATH POINTS
// Generate points for drawing orbit ellipse
// ============================================
export const generateOrbitPath = (planetName, segments = 128) => {
  const data = ORBITAL_DATA[planetName];
  if (!data) return [];

  const { semiMajorAxis, eccentricity, inclination } = data;
  const incRad = (inclination * Math.PI) / 180;
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
    const xOrbit = r * Math.cos(angle);
    const yOrbit = r * Math.sin(angle);
    const x = xOrbit;
    const y = yOrbit * Math.cos(incRad);
    const z = yOrbit * Math.sin(incRad);
    points.push([x, y, z]);
  }

  return points;
};

// ============================================
// DISTANCE CALCULATIONS
// ============================================
export const distanceBetween = (pos1, pos2) => {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// ============================================
// CAMERA FLY-TO INTERPOLATION
// Smooth camera transition using cubic easing
// ============================================
export const lerpPosition = (from, to, t) => {
  // Cubic ease in-out
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return [
    from[0] + (to[0] - from[0]) * ease,
    from[1] + (to[1] - from[1]) * ease,
    from[2] + (to[2] - from[2]) * ease,
  ];
};

// ============================================
// TIME CONVERSION UTILITIES
// ============================================
export const SECONDS_PER_DAY = 86400;

export const realTimeToSimDays = (deltaMs, speedMultiplier = 1) => {
  // 1 real second = speedMultiplier sim days
  return (deltaMs / 1000) * speedMultiplier * SCALE.TIME_MULT;
};

// ============================================
// GRAVITATIONAL CONSTANTS (for visual effects)
// ============================================
export const G_VISUAL = 0.001; // Simplified gravitational constant for visual effects

export const gravitationalForce = (mass1, mass2, distance) => {
  if (distance < 0.1) return 0;
  return (G_VISUAL * mass1 * mass2) / (distance * distance);
};
