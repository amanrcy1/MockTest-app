// ============================================
// SOLAR SYSTEM CONSTANTS
// Scale factors, colors, orbital parameters
// ============================================

// Scale: 1 unit = ~10,000 km (approximate, adjusted for visual clarity)
// Real distances are compressed for viewability

export const SCALE = {
  // Sun radius in scene units
  SUN_RADIUS: 1.8,
  // Planet size multiplier (exaggerated for visibility)
  PLANET_SIZE_MULT: 1.0,
  // Orbit distance multiplier
  ORBIT_MULT: 1.0,
  // Time multiplier (1 = real relative speeds)
  TIME_MULT: 0.3,
  // Asteroid count
  ASTEROID_COUNT: 300,
  // Kuiper belt object count
  KUIPER_COUNT: 150,
  // Star count in background
  STAR_COUNT: 10000,
  // Nebula count
  NEBULA_COUNT: 10,
  // Constellation line count
  CONSTELLATION_COUNT: 8,
};

// ============================================
// PLANET ORBITAL DATA (real ratios)
// ============================================
export const ORBITAL_DATA = {
  Mercury: {
    semiMajorAxis: 4.0,
    eccentricity: 0.2056,
    inclination: 7.0,       // degrees
    orbitalPeriod: 87.97,   // Earth days
    rotationPeriod: 58.65,  // Earth days
    axialTilt: 0.034,       // radians
    meanAnomaly: 174.796,   // degrees at epoch
  },
  Venus: {
    semiMajorAxis: 5.5,
    eccentricity: 0.0068,
    inclination: 3.39,
    orbitalPeriod: 224.7,
    rotationPeriod: -243.02, // negative = retrograde
    axialTilt: 2.64,
    meanAnomaly: 50.115,
  },
  Earth: {
    semiMajorAxis: 7.2,
    eccentricity: 0.0167,
    inclination: 0.0,
    orbitalPeriod: 365.25,
    rotationPeriod: 1.0,
    axialTilt: 0.4101,
    meanAnomaly: 357.517,
  },
  Mars: {
    semiMajorAxis: 9.0,
    eccentricity: 0.0934,
    inclination: 1.85,
    orbitalPeriod: 686.97,
    rotationPeriod: 1.026,
    axialTilt: 0.4396,
    meanAnomaly: 19.373,
  },
  Jupiter: {
    semiMajorAxis: 12.0,
    eccentricity: 0.0489,
    inclination: 1.31,
    orbitalPeriod: 4332.59,
    rotationPeriod: 0.4135,
    axialTilt: 0.0546,
    meanAnomaly: 20.020,
  },
  Saturn: {
    semiMajorAxis: 15.5,
    eccentricity: 0.0565,
    inclination: 2.49,
    orbitalPeriod: 10759.22,
    rotationPeriod: 0.4440,
    axialTilt: 0.4665,
    meanAnomaly: 317.020,
  },
  Uranus: {
    semiMajorAxis: 18.5,
    eccentricity: 0.0457,
    inclination: 0.77,
    orbitalPeriod: 30688.5,
    rotationPeriod: -0.7183, // retrograde
    axialTilt: 1.7064,
    meanAnomaly: 142.238,
  },
  Neptune: {
    semiMajorAxis: 21.0,
    eccentricity: 0.0113,
    inclination: 1.77,
    orbitalPeriod: 60182.0,
    rotationPeriod: 0.6713,
    axialTilt: 0.4943,
    meanAnomaly: 256.228,
  },
};

// ============================================
// PLANET PHYSICAL DATA
// ============================================
export const PLANET_SIZES = {
  Mercury: 0.25,
  Venus: 0.40,
  Earth: 0.42,
  Mars: 0.30,
  Jupiter: 1.10,
  Saturn: 0.95,
  Uranus: 0.60,
  Neptune: 0.58,
};

export const PLANET_COLORS = {
  Mercury: "#a0a0a0",
  Venus: "#e8cda0",
  Earth: "#4488ff",
  Mars: "#cc5533",
  Jupiter: "#d4a574",
  Saturn: "#e8d5a0",
  Uranus: "#88ccdd",
  Neptune: "#4466ee",
  Sun: "#ffaa00",
  Pluto: "#ccbbaa",
};

// ============================================
// ATMOSPHERE COLORS
// ============================================
export const ATMOSPHERE_COLORS = {
  Earth: { inner: "#6699ff", outer: "#3366cc", intensity: 0.15 },
  Venus: { inner: "#ffcc88", outer: "#cc9944", intensity: 0.2 },
  Mars: { inner: "#cc8866", outer: "#aa5533", intensity: 0.05 },
  Jupiter: { inner: "#ddbb88", outer: "#aa8855", intensity: 0.08 },
  Saturn: { inner: "#ddcc99", outer: "#bbaa77", intensity: 0.06 },
  Uranus: { inner: "#99ddee", outer: "#66aabb", intensity: 0.08 },
  Neptune: { inner: "#5577ee", outer: "#3344aa", intensity: 0.1 },
};

// ============================================
// RING SYSTEMS
// ============================================
export const RING_DATA = {
  Saturn: {
    innerRadius: 1.3,  // multiplier of planet size
    outerRadius: 2.5,
    rings: [
      { name: "D Ring", start: 1.11, end: 1.24, opacity: 0.15, color: "#b8a070" },
      { name: "C Ring", start: 1.24, end: 1.53, opacity: 0.35, color: "#c0a878" },
      { name: "B Ring", start: 1.53, end: 1.95, opacity: 0.7, color: "#d4b888" },
      // Cassini Division
      { name: "Cassini Division", start: 1.95, end: 2.02, opacity: 0.05, color: "#444444" },
      { name: "A Ring", start: 2.02, end: 2.27, opacity: 0.55, color: "#c8b080" },
      // Encke Gap
      { name: "F Ring", start: 2.32, end: 2.36, opacity: 0.3, color: "#b0a070" },
    ],
    tilt: Math.PI / 2.5,
  },
  Uranus: {
    innerRadius: 1.5,
    outerRadius: 2.0,
    rings: [
      { name: "Inner rings", start: 1.5, end: 1.65, opacity: 0.12, color: "#7799aa" },
      { name: "Epsilon ring", start: 1.75, end: 1.85, opacity: 0.2, color: "#88aabb" },
      { name: "Outer rings", start: 1.9, end: 2.0, opacity: 0.08, color: "#6688aa" },
    ],
    tilt: Math.PI / 2, // Uranus rings are nearly vertical
  },
};

// ============================================
// MOON DATA
// ============================================
export const MOON_DATA = {
  Earth: [
    { name: "Moon", size: 0.11, orbit: 0.85, speed: 2.5, color: "#ddddcc", texType: "moon" },
  ],
  Mars: [
    { name: "Phobos", size: 0.04, orbit: 0.5, speed: 4.5, color: "#bbaa99", texType: "rocky" },
    { name: "Deimos", size: 0.025, orbit: 0.7, speed: 2.8, color: "#aa9988", texType: "rocky" },
  ],
  Jupiter: [
    { name: "Io", size: 0.08, orbit: 1.8, speed: 3.0, color: "#ddcc44", texType: "io" },
    { name: "Europa", size: 0.07, orbit: 2.2, speed: 2.2, color: "#ccddee", texType: "europa" },
    { name: "Ganymede", size: 0.1, orbit: 2.7, speed: 1.5, color: "#bbaa99", texType: "rocky" },
    { name: "Callisto", size: 0.09, orbit: 3.2, speed: 1.0, color: "#887766", texType: "rocky" },
  ],
  Saturn: [
    { name: "Titan", size: 0.1, orbit: 3.0, speed: 1.2, color: "#ddaa55", texType: "titan" },
    { name: "Enceladus", size: 0.04, orbit: 2.0, speed: 2.5, color: "#eeeeff", texType: "icy" },
    { name: "Mimas", size: 0.03, orbit: 1.6, speed: 3.5, color: "#cccccc", texType: "rocky" },
  ],
  Uranus: [
    { name: "Titania", size: 0.06, orbit: 1.5, speed: 2.0, color: "#bbbbcc", texType: "icy" },
    { name: "Oberon", size: 0.055, orbit: 1.9, speed: 1.5, color: "#aaaabb", texType: "rocky" },
  ],
  Neptune: [
    { name: "Triton", size: 0.08, orbit: 1.5, speed: 2.0, color: "#aabbcc", texType: "icy" },
  ],
};

// ============================================
// CAMERA PRESETS
// ============================================
export const CAMERA_PRESETS = {
  overview: { position: [0, 15, 30], lookAt: [0, 0, 0], fov: 50 },
  topDown: { position: [0, 40, 0], lookAt: [0, 0, 0], fov: 60 },
  innerPlanets: { position: [0, 8, 14], lookAt: [0, 0, 2], fov: 45 },
  outerPlanets: { position: [0, 12, 35], lookAt: [0, 0, 10], fov: 55 },
  sunClose: { position: [4, 2, 4], lookAt: [0, 0, 0], fov: 40 },
};

// ============================================
// UI COLORS
// ============================================
export const UI_COLORS = {
  panelBg: "rgba(0,0,0,0.8)",
  panelBorder: "rgba(255,255,255,0.1)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.4)",
  accent: "#4488ff",
  danger: "#ff4444",
  success: "#44ff88",
  warning: "#ffaa44",
};

// ============================================
// CONSTELLATION DATA (simplified)
// ============================================
export const CONSTELLATIONS = [
  {
    name: "Orion",
    stars: [[-40, 15, -60], [-38, 18, -62], [-36, 20, -61], [-37, 22, -63], [-39, 24, -60], [-35, 16, -64], [-41, 17, -58]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 6]],
  },
  {
    name: "Ursa Major",
    stars: [[30, 20, -55], [33, 22, -57], [36, 21, -56], [38, 19, -58], [35, 17, -60], [32, 16, -59], [29, 18, -57]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  },
  {
    name: "Cassiopeia",
    stars: [[-20, 25, -65], [-17, 28, -63], [-14, 26, -66], [-11, 29, -64], [-8, 27, -67]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: "Scorpius",
    stars: [[45, -5, -50], [47, -7, -52], [49, -10, -51], [48, -13, -53], [46, -15, -55], [44, -17, -54], [42, -14, -52]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  {
    name: "Leo",
    stars: [[-50, 8, -45], [-47, 10, -47], [-44, 9, -46], [-42, 7, -48], [-45, 5, -44], [-48, 6, -46]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
];

// ============================================
// SPEED PRESETS
// ============================================
export const SPEED_OPTIONS = [
  { label: "0.1×", value: 0.1 },
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "5×", value: 5 },
  { label: "10×", value: 10 },
  { label: "50×", value: 50 },
  { label: "100×", value: 100 },
];
