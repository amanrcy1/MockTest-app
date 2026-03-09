// ============================================
// PROCEDURAL TEXTURE GENERATORS
// High-quality canvas-based textures for all bodies
// ============================================
import * as THREE from "three";

// ============================================
// NOISE UTILITIES
// ============================================
const hash = (x, y) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) / 4294967296 + 0.5;
};

const smoothNoise = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
};

const fbm = (x, y, octaves = 6) => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
};

const turbulence = (x, y, octaves = 5) => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(smoothNoise(x * frequency, y * frequency) * 2 - 1);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
};

// ============================================
// SUN TEXTURE
// ============================================
export const createSunTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / size * 4;
      const n1 = fbm(nx, ny, 6);
      const n2 = turbulence(nx * 2, ny * 2, 4);
      const granulation = fbm(nx * 8, ny * 8, 3) * 0.15;

      const r = Math.min(255, 255);
      const g = Math.min(255, Math.floor(180 + n1 * 50 + n2 * 20 + granulation * 30));
      const b = Math.min(255, Math.floor(30 + n1 * 40 + n2 * 30));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Sunspots
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * size;
    const cy = size * 0.2 + Math.random() * size * 0.6;
    const r = 3 + Math.random() * 8;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(80,40,0,0.7)");
    grad.addColorStop(0.5, "rgba(120,60,0,0.4)");
    grad.addColorStop(1, "rgba(200,120,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// EARTH TEXTURE (day side)
// ============================================
export const createEarthTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Generate continent shapes using multi-octave noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      // Multi-scale continent noise
      const continent = fbm(nx * 2 + 1.5, ny * 2 + nz * 2, 6);
      const detail = fbm(nx * 8, ny * 8 + nz * 4, 4) * 0.15;
      const elevation = continent + detail;

      // Latitude-based biome coloring
      const absLat = Math.abs(y / size - 0.5) * 2; // 0 at equator, 1 at poles

      if (elevation > 0.55) {
        // Mountains
        const snow = absLat > 0.6 ? 1 : elevation > 0.7 ? 0.5 : 0;
        const r = Math.floor(120 + snow * 120 + detail * 80);
        const g = Math.floor(100 + snow * 130 + detail * 60);
        const b = Math.floor(80 + snow * 140 + detail * 40);
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      } else if (elevation > 0.48) {
        // Land
        if (absLat > 0.75) {
          // Tundra/ice
          ctx.fillStyle = `rgb(${200 + Math.random() * 30},${210 + Math.random() * 30},${220 + Math.random() * 30})`;
        } else if (absLat > 0.55) {
          // Temperate forest
          const g = 90 + fbm(nx * 12, ny * 12, 3) * 50;
          ctx.fillStyle = `rgb(${50 + Math.random() * 20},${Math.floor(g)},${30 + Math.random() * 15})`;
        } else if (absLat < 0.2) {
          // Tropical
          const g = 100 + fbm(nx * 10, nz * 10, 3) * 60;
          ctx.fillStyle = `rgb(${30 + Math.random() * 20},${Math.floor(g)},${20 + Math.random() * 15})`;
        } else {
          // Grassland/savanna
          const g = 120 + fbm(nx * 6, ny * 6, 3) * 40;
          ctx.fillStyle = `rgb(${80 + Math.random() * 30},${Math.floor(g)},${40 + Math.random() * 20})`;
        }
      } else if (elevation > 0.44) {
        // Desert/beach
        if (absLat < 0.35 && absLat > 0.15) {
          ctx.fillStyle = `rgb(${195 + Math.random() * 20},${175 + Math.random() * 15},${120 + Math.random() * 20})`;
        } else {
          // Coastal
          ctx.fillStyle = `rgb(${60 + Math.random() * 20},${130 + Math.random() * 20},${50 + Math.random() * 15})`;
        }
      } else if (elevation > 0.40) {
        // Shallow water
        const depth = (0.44 - elevation) / 0.04;
        const r = Math.floor(30 + depth * 10);
        const g = Math.floor(120 - depth * 30 + Math.random() * 10);
        const b = Math.floor(180 + depth * 20 + Math.random() * 10);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        // Deep ocean
        const depth = (0.40 - elevation) / 0.4;
        const r = Math.floor(10 + Math.random() * 8);
        const g = Math.floor(40 + (1 - depth) * 30 + Math.random() * 8);
        const b = Math.floor(100 + (1 - depth) * 60 + Math.random() * 15);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Ice caps
  for (let x = 0; x < size; x++) {
    const topH = Math.floor(12 + fbm(x * 0.05, 0, 3) * 10);
    const botH = Math.floor(15 + fbm(x * 0.05, 100, 3) * 12);
    for (let dy = 0; dy < topH; dy++) {
      const alpha = 1 - dy / topH;
      ctx.fillStyle = `rgba(235,240,250,${alpha * 0.9})`;
      ctx.fillRect(x, dy, 1, 1);
    }
    for (let dy = 0; dy < botH; dy++) {
      const alpha = 1 - dy / botH;
      ctx.fillStyle = `rgba(235,240,250,${alpha * 0.9})`;
      ctx.fillRect(x, size - 1 - dy, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// EARTH NIGHT TEXTURE (city lights)
// ============================================
export const createEarthNightTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Black base
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  // Generate city light clusters on land areas
  // Use same noise as day texture to match continents
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const continent = fbm(nx * 2 + 1.5, ny * 2 + nz * 2, 6);
      const detail = fbm(nx * 8, ny * 8 + nz * 4, 4) * 0.15;
      const elevation = continent + detail;
      const absLat = Math.abs(y / size - 0.5) * 2;

      // Only on land, not poles, not deserts
      if (elevation > 0.46 && elevation < 0.65 && absLat < 0.7) {
        const density = fbm(nx * 15, nz * 15, 4);
        if (density > 0.5 && Math.random() > 0.7) {
          const brightness = (density - 0.5) * 2;
          const r = Math.floor(255 * brightness * (0.8 + Math.random() * 0.2));
          const g = Math.floor(200 * brightness * (0.7 + Math.random() * 0.3));
          const b = Math.floor(100 * brightness * (0.5 + Math.random() * 0.5));
          ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
          ctx.fillRect(x, y, 1, 1);
          // Glow around bright spots
          if (brightness > 0.6 && Math.random() > 0.5) {
            ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
          }
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// EARTH CLOUD TEXTURE
// ============================================
export const createCloudTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const cloud = fbm(nx, ny, 5);
      const detail = fbm(nx * 3, ny * 3, 3) * 0.3;
      const value = cloud + detail;

      if (value > 0.5) {
        const alpha = Math.min(1, (value - 0.5) * 3);
        const white = Math.floor(240 + Math.random() * 15);
        ctx.fillStyle = `rgba(${white},${white},${white},${alpha * 0.6})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// EARTH BUMP MAP
// ============================================
export const createEarthBumpMap = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const continent = fbm(nx * 2 + 1.5, ny * 2 + nz * 2, 6);
      const detail = fbm(nx * 8, ny * 8 + nz * 4, 4) * 0.15;
      const mountain = fbm(nx * 16, ny * 16, 3) * 0.08;
      const elevation = continent + detail + mountain;

      // Ocean = dark (flat), land = bright (elevated)
      const v = elevation > 0.44 ? Math.floor(Math.min(255, (elevation - 0.44) * 500)) : 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// MARS TEXTURE
// ============================================
export const createMarsTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const terrain = fbm(nx * 3 + 0.7, ny * 3 + nz * 2, 6);
      const detail = fbm(nx * 10, ny * 10 + nz * 5, 4) * 0.12;
      const craters = turbulence(nx * 6, nz * 6, 3) * 0.08;
      const elevation = terrain + detail + craters;
      const absLat = Math.abs(y / size - 0.5) * 2;

      let r, g, b;
      if (absLat > 0.85) {
        // Polar ice caps
        const ice = (absLat - 0.85) / 0.15;
        r = Math.floor(180 + ice * 60 + Math.random() * 10);
        g = Math.floor(140 + ice * 80 + Math.random() * 10);
        b = Math.floor(120 + ice * 100 + Math.random() * 10);
      } else if (elevation > 0.6) {
        // Olympus Mons / highlands
        r = Math.floor(160 + detail * 80 + Math.random() * 10);
        g = Math.floor(90 + detail * 40 + Math.random() * 8);
        b = Math.floor(50 + detail * 30 + Math.random() * 6);
      } else if (elevation > 0.45) {
        // Rust-red terrain
        const variation = fbm(nx * 12, ny * 12, 3);
        r = Math.floor(180 + variation * 40 + Math.random() * 15);
        g = Math.floor(100 + variation * 25 + Math.random() * 10);
        b = Math.floor(60 + variation * 20 + Math.random() * 8);
      } else if (elevation > 0.35) {
        // Dark basalt regions (Syrtis Major)
        r = Math.floor(120 + Math.random() * 15);
        g = Math.floor(75 + Math.random() * 10);
        b = Math.floor(50 + Math.random() * 8);
      } else {
        // Valles Marineris / low regions
        r = Math.floor(140 + Math.random() * 12);
        g = Math.floor(85 + Math.random() * 10);
        b = Math.floor(55 + Math.random() * 8);
      }

      // Dust storm haze near equator
      if (absLat < 0.3) {
        const haze = fbm(nx * 4 + 10, nz * 4, 3) * 0.1;
        r = Math.min(255, r + Math.floor(haze * 40));
        g = Math.min(255, g + Math.floor(haze * 25));
        b = Math.min(255, b + Math.floor(haze * 15));
      }

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// JUPITER TEXTURE
// ============================================
export const createJupiterTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    const latFrac = y / size;
    const bandNoise = fbm(latFrac * 20, 0.5, 4);
    // Alternating light/dark bands
    const band = Math.sin(latFrac * Math.PI * 14 + bandNoise * 2);

    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / size * 4;
      const swirl = fbm(nx + band * 0.5, ny, 5);
      const detail = fbm(nx * 3, ny * 3, 3) * 0.15;
      const storm = turbulence(nx * 2, ny * 2, 3) * 0.1;

      let r, g, b;
      if (band > 0.3) {
        // Light zones (cream/tan)
        r = Math.floor(210 + swirl * 30 + detail * 20 + Math.random() * 8);
        g = Math.floor(180 + swirl * 25 + detail * 15 + Math.random() * 6);
        b = Math.floor(130 + swirl * 15 + detail * 10 + Math.random() * 5);
      } else if (band > -0.3) {
        // Transition
        const t = (band + 0.3) / 0.6;
        r = Math.floor(180 + t * 30 + swirl * 20 + Math.random() * 8);
        g = Math.floor(140 + t * 30 + swirl * 15 + Math.random() * 6);
        b = Math.floor(100 + t * 20 + swirl * 10 + Math.random() * 5);
      } else {
        // Dark belts (brown/orange)
        r = Math.floor(160 + swirl * 25 + storm * 30 + Math.random() * 8);
        g = Math.floor(110 + swirl * 15 + storm * 15 + Math.random() * 6);
        b = Math.floor(70 + swirl * 10 + storm * 10 + Math.random() * 5);
      }

      // Great Red Spot (approximate position)
      const spotX = x / size - 0.65;
      const spotY = y / size - 0.58;
      const spotDist = Math.sqrt(spotX * spotX * 4 + spotY * spotY * 16);
      if (spotDist < 0.08) {
        const spotIntensity = 1 - spotDist / 0.08;
        const spotSwirl = fbm(nx * 4 + spotY * 20, ny * 4 + spotX * 20, 4);
        r = Math.min(255, r + Math.floor(spotIntensity * 60 + spotSwirl * 20));
        g = Math.max(60, g - Math.floor(spotIntensity * 40));
        b = Math.max(40, b - Math.floor(spotIntensity * 30));
      }

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// SATURN TEXTURE
// ============================================
export const createSaturnTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    const latFrac = y / size;
    const band = Math.sin(latFrac * Math.PI * 18 + fbm(latFrac * 12, 1, 3) * 1.5);

    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const swirl = fbm(nx + band * 0.3, ny, 4);
      const detail = fbm(nx * 4, ny * 4, 3) * 0.1;

      let r, g, b;
      if (band > 0.2) {
        // Light bands (pale gold)
        r = Math.floor(225 + swirl * 15 + Math.random() * 8);
        g = Math.floor(205 + swirl * 12 + Math.random() * 6);
        b = Math.floor(155 + swirl * 10 + Math.random() * 5);
      } else if (band > -0.2) {
        // Mid bands
        r = Math.floor(210 + swirl * 12 + detail * 15 + Math.random() * 6);
        g = Math.floor(185 + swirl * 10 + detail * 10 + Math.random() * 5);
        b = Math.floor(135 + swirl * 8 + detail * 8 + Math.random() * 4);
      } else {
        // Dark bands (muted brown)
        r = Math.floor(190 + swirl * 15 + Math.random() * 8);
        g = Math.floor(165 + swirl * 10 + Math.random() * 6);
        b = Math.floor(115 + swirl * 8 + Math.random() * 5);
      }

      // Subtle polar darkening
      const absLat = Math.abs(latFrac - 0.5) * 2;
      if (absLat > 0.7) {
        const darken = (absLat - 0.7) / 0.3;
        r = Math.floor(r * (1 - darken * 0.15));
        g = Math.floor(g * (1 - darken * 0.12));
        b = Math.floor(b * (1 - darken * 0.1));
      }

      // North polar hexagon hint
      if (absLat > 0.8 && latFrac < 0.5) {
        const hex = turbulence(nx * 3, ny * 3, 3);
        r = Math.min(255, r + Math.floor(hex * 15));
        g = Math.min(255, g + Math.floor(hex * 10));
      }

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// VENUS TEXTURE
// ============================================
export const createVenusTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const cloud1 = fbm(nx, ny, 6);
      const cloud2 = fbm(nx * 2 + 5, ny * 2 + 3, 5) * 0.3;
      const swirl = turbulence(nx * 1.5, ny * 1.5, 4) * 0.2;
      const value = cloud1 + cloud2 + swirl;

      // Venus is shrouded in thick sulfuric acid clouds
      const r = Math.floor(200 + value * 40 + Math.random() * 8);
      const g = Math.floor(170 + value * 35 + Math.random() * 6);
      const b = Math.floor(100 + value * 25 + Math.random() * 5);

      // Subtle banding from super-rotation
      const band = Math.sin(ny * 8) * 0.05;
      const fr = Math.min(255, r + Math.floor(band * 20));
      const fg = Math.min(255, g + Math.floor(band * 15));
      const fb = Math.min(255, b + Math.floor(band * 10));

      ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// MERCURY TEXTURE
// ============================================
export const createMercuryTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const terrain = fbm(nx * 4, ny * 4 + nz * 2, 6);
      const craters = turbulence(nx * 8, nz * 8, 4) * 0.15;
      const fine = fbm(nx * 16, ny * 16, 3) * 0.05;
      const elevation = terrain + craters + fine;

      // Mercury is gray with subtle brown tints
      const base = Math.floor(120 + elevation * 80 + Math.random() * 8);
      const r = Math.min(255, base + 10);
      const g = Math.min(255, base + 5);
      const b = Math.min(255, base);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Add crater impacts
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const radius = 2 + Math.random() * 12;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(80,78,75,${0.3 + Math.random() * 0.3})`);
    grad.addColorStop(0.4, `rgba(100,98,95,${0.2 + Math.random() * 0.2})`);
    grad.addColorStop(0.7, `rgba(140,138,135,${0.15})`);
    grad.addColorStop(1, "rgba(160,158,155,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // Bright rim
    ctx.strokeStyle = `rgba(170,168,165,${0.2 + Math.random() * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// NEPTUNE TEXTURE
// ============================================
export const createNeptuneTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    const latFrac = y / size;
    const band = Math.sin(latFrac * Math.PI * 10 + fbm(latFrac * 8, 2, 3) * 1.2);

    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const swirl = fbm(nx + band * 0.4, ny, 5);
      const detail = fbm(nx * 3, ny * 3, 3) * 0.12;
      const storm = turbulence(nx * 2, ny * 2, 3) * 0.08;

      // Deep blue with subtle banding
      const r = Math.floor(30 + swirl * 20 + storm * 15 + Math.random() * 5);
      const g = Math.floor(50 + swirl * 25 + detail * 20 + Math.random() * 6);
      const b = Math.floor(160 + band * 25 + swirl * 30 + Math.random() * 10);

      // Great Dark Spot
      const spotX = x / size - 0.4;
      const spotY = y / size - 0.45;
      const spotDist = Math.sqrt(spotX * spotX * 3 + spotY * spotY * 12);
      let fr = r, fg = g, fb = b;
      if (spotDist < 0.06) {
        const si = 1 - spotDist / 0.06;
        fr = Math.max(10, fr - Math.floor(si * 20));
        fg = Math.max(20, fg - Math.floor(si * 25));
        fb = Math.max(100, fb - Math.floor(si * 40));
      }

      // Bright cloud streaks
      const streak = fbm(nx * 5 + latFrac * 3, ny * 0.5, 3);
      if (streak > 0.65) {
        const si = (streak - 0.65) * 3;
        fr = Math.min(255, fr + Math.floor(si * 60));
        fg = Math.min(255, fg + Math.floor(si * 70));
        fb = Math.min(255, fb + Math.floor(si * 40));
      }

      ctx.fillStyle = `rgb(${Math.min(255, fr)},${Math.min(255, fg)},${Math.min(255, fb)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// ============================================
// URANUS TEXTURE
// ============================================
export const createUranusTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    const latFrac = y / size;
    const band = Math.sin(latFrac * Math.PI * 8) * 0.3;

    for (let x = 0; x < size; x++) {
      const nx = x / size * 5;
      const ny = y / size * 2.5;
      const cloud = fbm(nx, ny, 4);
      const detail = fbm(nx * 3, ny * 3, 3) * 0.08;

      // Pale cyan-blue-green
      const r = Math.floor(140 + cloud * 20 + band * 10 + detail * 15 + Math.random() * 5);
      const g = Math.floor(190 + cloud * 15 + band * 8 + detail * 10 + Math.random() * 5);
      const b = Math.floor(210 + cloud * 10 + band * 5 + detail * 8 + Math.random() * 5);

      // Subtle polar brightening
      const absLat = Math.abs(latFrac - 0.5) * 2;
      let fr = r, fg = g, fb = b;
      if (absLat > 0.7) {
        const bright = (absLat - 0.7) / 0.3;
        fr = Math.min(255, fr + Math.floor(bright * 20));
        fg = Math.min(255, fg + Math.floor(bright * 15));
        fb = Math.min(255, fb + Math.floor(bright * 10));
      }

      ctx.fillStyle = `rgb(${Math.min(255, fr)},${Math.min(255, fg)},${Math.min(255, fb)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};


// ============================================
// MOON TEXTURE (Earth's Moon)
// ============================================
export const createMoonTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const terrain = fbm(nx * 4, ny * 4 + nz * 2, 5);
      const craters = turbulence(nx * 10, nz * 10, 4) * 0.12;
      const elevation = terrain + craters;

      // Maria (dark basalt plains) vs highlands
      let v;
      if (elevation < 0.45) {
        // Maria — darker
        v = Math.floor(80 + elevation * 60 + Math.random() * 8);
      } else {
        // Highlands — lighter
        v = Math.floor(140 + (elevation - 0.45) * 120 + Math.random() * 10);
      }

      const r = Math.min(255, v + 5);
      const g = Math.min(255, v + 3);
      const b = Math.min(255, v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Crater impacts
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const radius = 1.5 + Math.random() * 8;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(60,58,55,${0.3 + Math.random() * 0.25})`);
    grad.addColorStop(0.5, `rgba(90,88,85,${0.15})`);
    grad.addColorStop(1, "rgba(130,128,125,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// IO TEXTURE (Jupiter's volcanic moon)
// ============================================
export const createIoTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const terrain = fbm(nx, ny, 5);
      const sulfur = fbm(nx * 3 + 2, ny * 3 + 1, 4) * 0.3;
      const value = terrain + sulfur;

      // Yellow-orange sulfur surface with volcanic dark spots
      let r, g, b;
      if (value > 0.6) {
        // Bright sulfur deposits
        r = Math.floor(220 + Math.random() * 20);
        g = Math.floor(200 + Math.random() * 20);
        b = Math.floor(50 + Math.random() * 20);
      } else if (value > 0.4) {
        // Orange-yellow terrain
        r = Math.floor(200 + value * 30 + Math.random() * 10);
        g = Math.floor(160 + value * 25 + Math.random() * 8);
        b = Math.floor(40 + value * 15 + Math.random() * 6);
      } else {
        // Dark volcanic regions
        r = Math.floor(100 + value * 60 + Math.random() * 10);
        g = Math.floor(80 + value * 40 + Math.random() * 8);
        b = Math.floor(30 + value * 20 + Math.random() * 6);
      }

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Volcanic hotspots
  for (let i = 0; i < 12; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const radius = 2 + Math.random() * 6;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, "rgba(255,100,0,0.6)");
    grad.addColorStop(0.3, "rgba(200,60,0,0.3)");
    grad.addColorStop(1, "rgba(100,30,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// EUROPA TEXTURE (icy cracked surface)
// ============================================
export const createEuropaTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Base icy white
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / size * 4;
      const ice = fbm(nx, ny, 4);
      const v = Math.floor(200 + ice * 40 + Math.random() * 10);
      const r = Math.min(255, v - 5);
      const g = Math.min(255, v);
      const b = Math.min(255, v + 10);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Crack lines (lineae)
  ctx.strokeStyle = "rgba(120,80,50,0.3)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 25; i++) {
    ctx.beginPath();
    let lx = Math.random() * size;
    let ly = Math.random() * size;
    ctx.moveTo(lx, ly);
    const segments = 5 + Math.floor(Math.random() * 10);
    for (let s = 0; s < segments; s++) {
      lx += (Math.random() - 0.5) * 40;
      ly += (Math.random() - 0.5) * 40;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  // Reddish-brown stains along cracks
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const radius = 3 + Math.random() * 10;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, "rgba(140,90,60,0.15)");
    grad.addColorStop(1, "rgba(140,90,60,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// TITAN TEXTURE (orange hazy atmosphere)
// ============================================
export const createTitanTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 5;
      const ny = y / size * 2.5;
      const haze = fbm(nx, ny, 5);
      const detail = fbm(nx * 3, ny * 3, 3) * 0.2;
      const value = haze + detail;

      // Orange-brown haze with methane lake hints
      const r = Math.floor(180 + value * 40 + Math.random() * 8);
      const g = Math.floor(130 + value * 30 + Math.random() * 6);
      const b = Math.floor(50 + value * 20 + Math.random() * 5);

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Dark methane lakes near poles
  for (let i = 0; i < 6; i++) {
    const cx = Math.random() * size;
    const cy = i < 3 ? Math.random() * size * 0.15 : size - Math.random() * size * 0.15;
    const radius = 4 + Math.random() * 10;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, "rgba(40,30,20,0.4)");
    grad.addColorStop(1, "rgba(40,30,20,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// GENERIC ROCKY TEXTURE (for small moons)
// ============================================
export const createRockyTexture = (size = 128, baseColor = [140, 130, 120]) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const terrain = fbm(nx, ny, 4);
      const craters = turbulence(nx * 4, ny * 4, 3) * 0.1;
      const value = terrain + craters;

      const r = Math.min(255, Math.floor(baseColor[0] + value * 50 + Math.random() * 10));
      const g = Math.min(255, Math.floor(baseColor[1] + value * 45 + Math.random() * 8));
      const b = Math.min(255, Math.floor(baseColor[2] + value * 40 + Math.random() * 6));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// GENERIC ICY TEXTURE (for icy moons)
// ============================================
export const createIcyTexture = (size = 128) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / size * 3;
      const ice = fbm(nx, ny, 4);
      const cracks = turbulence(nx * 5, ny * 5, 3) * 0.08;
      const value = ice + cracks;

      const base = Math.floor(190 + value * 50 + Math.random() * 8);
      const r = Math.min(255, base - 5);
      const g = Math.min(255, base);
      const b = Math.min(255, base + 15);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// SATURN RING TEXTURE
// ============================================
export const createSaturnRingTexture = (size = 1024) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  for (let x = 0; x < size; x++) {
    const t = x / size; // 0 = inner, 1 = outer
    const noise = fbm(t * 30, 0.5, 4);
    const detail = fbm(t * 80, 1.5, 3) * 0.15;

    let r, g, b, a;

    // Cassini Division (gap)
    if (t > 0.47 && t < 0.52) {
      a = 0.02 + noise * 0.03;
      r = 60; g = 55; b = 50;
    }
    // Encke Gap
    else if (t > 0.72 && t < 0.74) {
      a = 0.01;
      r = 40; g = 38; b = 35;
    }
    // D Ring (innermost, faint)
    else if (t < 0.08) {
      a = 0.1 + noise * 0.05;
      r = Math.floor(160 + noise * 20);
      g = Math.floor(140 + noise * 15);
      b = Math.floor(100 + noise * 10);
    }
    // C Ring
    else if (t < 0.22) {
      a = 0.25 + noise * 0.1 + detail;
      r = Math.floor(175 + noise * 25);
      g = Math.floor(155 + noise * 20);
      b = Math.floor(110 + noise * 15);
    }
    // B Ring (brightest)
    else if (t < 0.47) {
      a = 0.5 + noise * 0.2 + detail;
      r = Math.floor(210 + noise * 20 + Math.random() * 5);
      g = Math.floor(190 + noise * 18 + Math.random() * 4);
      b = Math.floor(140 + noise * 12 + Math.random() * 3);
    }
    // A Ring
    else if (t < 0.72) {
      a = 0.35 + noise * 0.15 + detail;
      r = Math.floor(195 + noise * 22);
      g = Math.floor(175 + noise * 18);
      b = Math.floor(125 + noise * 12);
    }
    // F Ring (thin outer)
    else if (t > 0.82 && t < 0.88) {
      a = 0.2 + noise * 0.1;
      r = Math.floor(170 + noise * 15);
      g = Math.floor(150 + noise * 12);
      b = Math.floor(105 + noise * 8);
    }
    // G and E rings (very faint outer)
    else if (t > 0.88) {
      a = 0.03 + noise * 0.02;
      r = Math.floor(150 + noise * 10);
      g = Math.floor(140 + noise * 8);
      b = Math.floor(120 + noise * 6);
    }
    else {
      a = 0.15 + noise * 0.08;
      r = Math.floor(180 + noise * 18);
      g = Math.floor(160 + noise * 14);
      b = Math.floor(115 + noise * 10);
    }

    a = Math.min(1, Math.max(0, a));
    for (let y = 0; y < 64; y++) {
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// URANUS RING TEXTURE (faint dark rings)
// ============================================
export const createUranusRingTexture = (size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  for (let x = 0; x < size; x++) {
    const t = x / size;
    const noise = fbm(t * 20, 0.5, 3);

    let a = 0;
    // Epsilon ring (brightest)
    if (t > 0.55 && t < 0.65) {
      a = 0.15 + noise * 0.08;
    }
    // Inner rings
    else if (t > 0.2 && t < 0.45) {
      a = 0.06 + noise * 0.04;
    }
    // Outer rings
    else if (t > 0.75 && t < 0.9) {
      a = 0.04 + noise * 0.03;
    }

    const v = Math.floor(100 + noise * 30);
    for (let y = 0; y < 32; y++) {
      ctx.fillStyle = `rgba(${v},${v + 10},${v + 20},${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// PLUTO TEXTURE
// ============================================
export const createPlutoTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = (x / size) * Math.PI * 2;
      const lat = (y / size) * Math.PI - Math.PI / 2;
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);

      const terrain = fbm(nx * 3, ny * 3 + nz * 2, 5);
      const detail = fbm(nx * 8, ny * 8, 3) * 0.1;
      const elevation = terrain + detail;

      let r, g, b;
      // Tombaugh Regio (heart-shaped bright region)
      const heartX = nx * 0.8 + 0.3;
      const heartY = ny * 0.5;
      const heartDist = Math.sqrt(heartX * heartX + heartY * heartY);
      if (heartDist < 0.4 && elevation > 0.4) {
        // Bright nitrogen ice
        const bright = 1 - heartDist / 0.4;
        r = Math.floor(210 + bright * 30 + Math.random() * 8);
        g = Math.floor(200 + bright * 25 + Math.random() * 6);
        b = Math.floor(185 + bright * 20 + Math.random() * 5);
      } else if (elevation > 0.5) {
        // Lighter terrain
        r = Math.floor(180 + elevation * 30 + Math.random() * 8);
        g = Math.floor(165 + elevation * 25 + Math.random() * 6);
        b = Math.floor(150 + elevation * 20 + Math.random() * 5);
      } else {
        // Darker reddish-brown terrain
        r = Math.floor(140 + elevation * 40 + Math.random() * 8);
        g = Math.floor(115 + elevation * 30 + Math.random() * 6);
        b = Math.floor(100 + elevation * 25 + Math.random() * 5);
      }

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// STARFIELD TEXTURE (for skybox)
// ============================================
export const createStarfieldTexture = (size = 2048) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Deep space black
  ctx.fillStyle = "#000005";
  ctx.fillRect(0, 0, size, size);

  // Dense star field
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random();
    const radius = brightness > 0.95 ? 1.5 : brightness > 0.8 ? 1 : 0.5;

    // Star color variation
    const colorRand = Math.random();
    let r, g, b;
    if (colorRand > 0.9) {
      // Blue-white hot stars
      r = 200; g = 210; b = 255;
    } else if (colorRand > 0.8) {
      // Yellow stars
      r = 255; g = 240; b = 200;
    } else if (colorRand > 0.75) {
      // Red giants
      r = 255; g = 180; b = 150;
    } else {
      // White
      r = 240; g = 240; b = 245;
    }

    const alpha = 0.3 + brightness * 0.7;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Glow for bright stars
    if (brightness > 0.9) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 3);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Milky Way band (subtle nebula glow)
  for (let x = 0; x < size; x++) {
    for (let y = Math.floor(size * 0.35); y < Math.floor(size * 0.65); y++) {
      const nx = x / size * 10;
      const ny = y / size * 5;
      const n = fbm(nx, ny, 4);
      const distFromCenter = Math.abs(y / size - 0.5) * 4;
      const falloff = Math.max(0, 1 - distFromCenter * distFromCenter);
      if (n > 0.45 && falloff > 0.1) {
        const alpha = (n - 0.45) * falloff * 0.08;
        ctx.fillStyle = `rgba(150,140,180,${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// ============================================
// TEXTURE CACHE — generate once, reuse
// ============================================
const textureCache = new Map();

export const getTexture = (name, generator, ...args) => {
  if (textureCache.has(name)) return textureCache.get(name);
  const tex = generator(...args);
  textureCache.set(name, tex);
  return tex;
};

export const disposeAllTextures = () => {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
};