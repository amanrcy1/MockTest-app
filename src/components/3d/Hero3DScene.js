import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// ============================================
// PROCEDURAL TEXTURE GENERATOR
// ============================================
const createPlanetTexture = (baseColor, type, size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(baseColor);

  if (type === "earth") {
    // Blue oceans + green/brown land masses
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / size * 6 - 3;
        const ny = y / size * 3 - 1.5;
        const noise = Math.sin(nx * 2.1 + ny * 1.3) * Math.cos(ny * 3.2 + nx * 0.7) +
          Math.sin(nx * 5.3 - ny * 2.1) * 0.3 + Math.sin(nx * 0.5 + ny * 4.7) * 0.2;
        if (noise > 0.15) {
          // Land
          const g = 80 + Math.random() * 40 + noise * 60;
          const r = 60 + noise * 80;
          const b = 30 + Math.random() * 20;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else if (noise > 0.05) {
          // Shallow water
          ctx.fillStyle = `rgb(40,${100 + Math.random() * 30},${180 + Math.random() * 40})`;
        } else {
          // Deep ocean
          ctx.fillStyle = `rgb(15,${50 + Math.random() * 20},${140 + Math.random() * 30})`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Ice caps
    for (let x = 0; x < size; x++) {
      const topH = 8 + Math.sin(x * 0.15) * 5;
      const botH = 8 + Math.cos(x * 0.12) * 5;
      ctx.fillStyle = "rgba(240,245,255,0.9)";
      ctx.fillRect(x, 0, 1, topH);
      ctx.fillRect(x, size - botH, 1, botH);
    }
  } else if (type === "mars") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise = Math.sin(x * 0.08 + y * 0.05) * Math.cos(y * 0.12 - x * 0.03) +
          Math.sin(x * 0.2 + y * 0.15) * 0.3;
        const r = 180 + noise * 40 + Math.random() * 15;
        const g = 80 + noise * 30 + Math.random() * 10;
        const b = 40 + noise * 15 + Math.random() * 8;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Polar cap
    for (let x = 0; x < size; x++) {
      const h = 5 + Math.sin(x * 0.1) * 3;
      ctx.fillStyle = "rgba(230,220,210,0.7)";
      ctx.fillRect(x, 0, 1, h);
    }
  } else if (type === "jupiter") {
    for (let y = 0; y < size; y++) {
      const bandNoise = Math.sin(y * 0.25) * 0.5 + Math.sin(y * 0.6) * 0.3 + Math.sin(y * 1.2) * 0.15;
      for (let x = 0; x < size; x++) {
        const swirl = Math.sin(x * 0.04 + bandNoise * 3 + y * 0.02) * 20;
        const r = 200 + bandNoise * 30 + swirl + Math.random() * 8;
        const g = 160 + bandNoise * 40 + swirl * 0.7 + Math.random() * 8;
        const b = 100 + bandNoise * 20 + Math.random() * 8;
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Great Red Spot
    ctx.beginPath();
    ctx.ellipse(size * 0.6, size * 0.55, 18, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,100,60,0.6)";
    ctx.fill();
  } else if (type === "saturn") {
    for (let y = 0; y < size; y++) {
      const band = Math.sin(y * 0.3) * 0.4 + Math.sin(y * 0.8) * 0.2;
      for (let x = 0; x < size; x++) {
        const r = 220 + band * 20 + Math.random() * 10;
        const g = 195 + band * 25 + Math.random() * 10;
        const b = 140 + band * 15 + Math.random() * 8;
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === "venus") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const swirl = Math.sin(x * 0.06 + y * 0.04) * Math.cos(y * 0.08 - x * 0.02);
        const r = 230 + swirl * 15 + Math.random() * 8;
        const g = 190 + swirl * 20 + Math.random() * 8;
        const b = 130 + swirl * 10 + Math.random() * 5;
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === "neptune" || type === "uranus") {
    const isNeptune = type === "neptune";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const band = Math.sin(y * 0.15) * 0.3;
        const r = isNeptune ? 50 + band * 10 + Math.random() * 8 : 120 + band * 15 + Math.random() * 10;
        const g = isNeptune ? 80 + band * 15 + Math.random() * 10 : 190 + band * 20 + Math.random() * 10;
        const b = isNeptune ? 200 + band * 30 + Math.random() * 15 : 210 + band * 20 + Math.random() * 10;
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === "mercury") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const crater = Math.sin(x * 0.3 + y * 0.2) * Math.cos(x * 0.5 - y * 0.4);
        const v = 140 + crater * 30 + Math.random() * 20;
        ctx.fillStyle = `rgb(${v},${v - 5},${v - 10})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Craters
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const cr = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,95,90,${0.3 + Math.random() * 0.3})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1, cr * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,155,150,${0.2 + Math.random() * 0.2})`;
      ctx.fill();
    }
  } else {
    // Generic rocky
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = Math.random() * 0.3;
        ctx.fillStyle = `rgb(${Math.floor(base.r * 255 * (0.7 + n))},${Math.floor(base.g * 255 * (0.7 + n))},${Math.floor(base.b * 255 * (0.7 + n))})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

// Create ring texture
const createRingTexture = (innerColor, outerColor, size = 512) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const inner = new THREE.Color(innerColor);
  const outer = new THREE.Color(outerColor);

  for (let x = 0; x < size; x++) {
    const t = x / size;
    const gap1 = Math.abs(t - 0.35) < 0.008 ? 0 : 1;
    const gap2 = Math.abs(t - 0.62) < 0.005 ? 0 : 1;
    const density = (Math.sin(t * 40) * 0.15 + 0.85) * gap1 * gap2;
    const r = Math.floor((inner.r + (outer.r - inner.r) * t) * 255);
    const g = Math.floor((inner.g + (outer.g - inner.g) * t) * 255);
    const b = Math.floor((inner.b + (outer.b - inner.b) * t) * 255);
    const a = density * (t < 0.1 ? t * 10 : t > 0.9 ? (1 - t) * 10 : 1) * 0.7;
    for (let y = 0; y < 64; y++) {
      ctx.fillStyle = `rgba(${r},${g},${b},${a * (0.8 + Math.random() * 0.2)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
};

// ============================================
// PLANET DATA
// ============================================
const PLANETS = [
  { name: "Mercury", texType: "mercury", size: 0.25, orbit: 4, speed: 4.15, tilt: 0.03, desc: "Smallest planet, closest to the Sun. Surface covered in craters.", moons: 0 },
  { name: "Venus", texType: "venus", size: 0.4, orbit: 5.5, speed: 1.62, tilt: 2.64, desc: "Hottest planet with thick toxic atmosphere. Rotates backwards.", moons: 0 },
  { name: "Earth", texType: "earth", size: 0.42, orbit: 7.2, speed: 1.0, tilt: 0.41, desc: "Our home. The only known planet with life.", moons: 1, hasClouds: true, hasAtmosphere: true },
  { name: "Mars", texType: "mars", size: 0.3, orbit: 9, speed: 0.53, tilt: 0.44, desc: "The Red Planet. Home to the tallest volcano — Olympus Mons.", moons: 2 },
  { name: "Jupiter", texType: "jupiter", size: 1.1, orbit: 12, speed: 0.084, tilt: 0.05, desc: "Largest planet. The Great Red Spot is a storm bigger than Earth.", moons: 95 },
  { name: "Saturn", texType: "saturn", size: 0.95, orbit: 15.5, speed: 0.034, tilt: 0.47, hasRings: true, desc: "Famous for its stunning ring system made of ice and rock.", moons: 146 },
  { name: "Uranus", texType: "uranus", size: 0.6, orbit: 18.5, speed: 0.012, tilt: 1.71, hasRings: true, desc: "Ice giant that rotates on its side. Has faint rings.", moons: 28 },
  { name: "Neptune", texType: "neptune", size: 0.58, orbit: 21, speed: 0.006, tilt: 0.49, desc: "Farthest planet. Has the strongest winds in the solar system.", moons: 16 },
];

// Planet color for UI
const PLANET_COLORS = {
  Mercury: "#a0a0a0", Venus: "#e8cda0", Earth: "#4488ff", Mars: "#cc5533",
  Jupiter: "#d4a574", Saturn: "#e8d5a0", Uranus: "#88ccdd", Neptune: "#4466ee",
};

// ============================================
// SUN
// ============================================
const Sun = ({ onClick }) => {
  const meshRef = useRef();
  const coronaRef = useRef();
  const corona2Ref = useRef();
  const glowRef = useRef();

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const noise = Math.sin(x * 0.1 + y * 0.08) * Math.cos(y * 0.12 - x * 0.06);
        const r = Math.min(255, 255);
        const g = Math.min(255, 200 + noise * 30 + Math.random() * 20);
        const b = Math.min(255, 50 + noise * 40 + Math.random() * 30);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) meshRef.current.rotation.y = t * 0.03;
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
      coronaRef.current.rotation.z = t * 0.02;
    }
    if (corona2Ref.current) corona2Ref.current.scale.setScalar(1 + Math.sin(t * 1.3 + 1) * 0.05);
    if (glowRef.current) glowRef.current.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.04;
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick?.({ name: "Sun", desc: "The star at the center — 4.6 billion years old, 109× Earth's diameter", color: "#ffaa00", size: 2 }); }}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial map={texture} emissive="#ff8800" emissiveIntensity={3} roughness={1} />
      </mesh>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      <mesh ref={corona2Ref}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <pointLight color="#ffddaa" intensity={4} distance={80} decay={2} />
      <pointLight color="#ff8844" intensity={2} distance={40} decay={2} />
    </group>
  );
};

// ============================================
// ORBIT RING
// ============================================
const OrbitRing = ({ radius }) => {
  const geometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.05} />
    </line>
  );
};

// ============================================
// MOON
// ============================================
const Moon = ({ size = 0.08, orbitRadius = 0.7, speed = 3, color = "#cccccc" }) => {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    ref.current.position.x = Math.cos(t) * orbitRadius;
    ref.current.position.z = Math.sin(t) * orbitRadius;
    ref.current.position.y = Math.sin(t * 0.5) * 0.05;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
};

// ============================================
// PLANET
// ============================================
const Planet = ({ data, onClick, isHovered, onHover }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const cloudRef = useRef();
  const initialAngle = useMemo(() => Math.random() * Math.PI * 2, []);

  const texture = useMemo(() => createPlanetTexture(PLANET_COLORS[data.name] || "#888", data.texType), [data.name, data.texType]);
  const ringTexture = useMemo(() => data.hasRings ? createRingTexture(
    data.name === "Uranus" ? "#88bbcc" : "#c4a060",
    data.name === "Uranus" ? "#aaddee" : "#8a7040"
  ) : null, [data.hasRings, data.name]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const angle = initialAngle + t * data.speed * 0.3;
    groupRef.current.position.x = Math.cos(angle) * data.orbit;
    groupRef.current.position.z = Math.sin(angle) * data.orbit;
    groupRef.current.position.y = Math.sin(angle * 0.5) * 0.15;
    if (meshRef.current) meshRef.current.rotation.y += 0.005;
    if (cloudRef.current) cloudRef.current.rotation.y += 0.007;
  });

  const hoverScale = isHovered ? 1.3 : 1;

  return (
    <group ref={groupRef}>
      <group scale={[hoverScale, hoverScale, hoverScale]}>
        {/* Planet body */}
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.({ ...data, position: groupRef.current.position.clone(), color: PLANET_COLORS[data.name] }); }}
          onPointerEnter={(e) => { e.stopPropagation(); onHover?.(data.name); document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { onHover?.(null); document.body.style.cursor = "default"; }}
          rotation={[data.tilt, 0, 0]}
        >
          <sphereGeometry args={[data.size, 48, 48]} />
          <meshPhysicalMaterial map={texture} roughness={0.7} metalness={0.05} clearcoat={0.2} />
        </mesh>

        {/* Atmosphere */}
        {data.hasAtmosphere && (
          <mesh>
            <sphereGeometry args={[data.size * 1.08, 32, 32]} />
            <meshBasicMaterial color="#6699ff" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
          </mesh>
        )}

        {/* Clouds */}
        {data.hasClouds && (
          <mesh ref={cloudRef} rotation={[data.tilt, 0, 0]}>
            <sphereGeometry args={[data.size * 1.02, 32, 32]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.2} roughness={1} depthWrite={false} />
          </mesh>
        )}

        {/* Rings */}
        {data.hasRings && ringTexture && (
          <mesh rotation={[data.name === "Uranus" ? Math.PI / 2 : Math.PI / 2.5, 0, 0]}>
            <ringGeometry args={[data.size * 1.4, data.size * 2.4, 64]} />
            <meshStandardMaterial map={ringTexture} transparent side={THREE.DoubleSide} roughness={0.7} depthWrite={false} />
          </mesh>
        )}

        {/* Earth's Moon */}
        {data.name === "Earth" && <Moon size={0.1} orbitRadius={0.8} speed={2.5} color="#ddddcc" />}
        {data.name === "Mars" && (
          <>
            <Moon size={0.04} orbitRadius={0.55} speed={4} color="#bbaa99" />
            <Moon size={0.03} orbitRadius={0.7} speed={2.5} color="#aa9988" />
          </>
        )}

        {/* Hover glow ring */}
        {isHovered && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.5, data.size * 1.6, 32]} />
            <meshBasicMaterial color={PLANET_COLORS[data.name] || "#fff"} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>

      {/* Name label on hover */}
      {isHovered && (
        <group position={[0, data.size * hoverScale + 0.5, 0]}>
          <mesh>
            <planeGeometry args={[data.name.length * 0.22 + 0.4, 0.35]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ============================================
// ASTEROID BELT
// ============================================
const AsteroidBelt = () => {
  const ref = useRef();
  const count = 250;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 1.5;
      arr.push({
        x: Math.cos(angle) * radius,
        y: (Math.random() - 0.5) * 0.5,
        z: Math.sin(angle) * radius,
        scale: 0.02 + Math.random() * 0.05,
        rotSpeed: (Math.random() - 0.5) * 2,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.008;
    data.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.setScalar(d.scale);
      dummy.rotation.set(state.clock.elapsedTime * d.rotSpeed, 0, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#888877" roughness={0.9} />
    </instancedMesh>
  );
};

// ============================================
// NEBULA CLOUDS
// ============================================
const NebulaClouds = () => {
  const clouds = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      position: [(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 40, -30 - Math.random() * 40],
      scale: 8 + Math.random() * 15,
      color: ["#3333aa", "#aa33aa", "#33aaaa", "#5533cc", "#cc3355", "#3388cc", "#553388", "#338855"][i],
      opacity: 0.03 + Math.random() * 0.02,
    })), []);

  return (
    <>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.position}>
          <sphereGeometry args={[c.scale, 16, 16]} />
          <meshBasicMaterial color={c.color} transparent opacity={c.opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
};

// ============================================
// SHOOTING STARS
// ============================================
const ShootingStars = () => {
  const count = 6;
  const refs = useRef([]);
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      delay: Math.random() * 25,
      speed: 0.6 + Math.random() * 1,
      startX: (Math.random() - 0.5) * 60,
      startY: 10 + Math.random() * 20,
      startZ: -20 - Math.random() * 30,
      angle: -0.3 - Math.random() * 0.4,
    })), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = data[i];
      const cycle = ((t + d.delay) * d.speed) % 15;
      if (cycle < 1.2) {
        mesh.visible = true;
        const p = cycle / 1.2;
        mesh.position.set(d.startX + p * 25, d.startY + p * d.angle * 25, d.startZ);
        mesh.material.opacity = p < 0.1 ? p * 10 : p > 0.7 ? (1 - p) / 0.3 : 0.8;
        mesh.scale.x = 0.5 + p * 2;
      } else {
        mesh.visible = false;
      }
    });
  });

  return (
    <>
      {data.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false} rotation={[0, 0, -0.5]}>
          <planeGeometry args={[1.5, 0.015]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
};

// ============================================
// CAMERA CONTROLLER — hover zoom + click zoom
// ============================================
const CameraController = ({ target, hoveredPlanet: _hoveredPlanet }) => {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, 12, 28));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0, 12, 28));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const mouse = useRef({ x: 0, y: 0 });
  const defaultPos = useMemo(() => new THREE.Vector3(0, 12, 28), []);
  const defaultLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    if (target) {
      const pos = target.position;
      const dist = target.size * 4 + 2;
      const offset = new THREE.Vector3(pos.x > 0 ? -dist : dist, target.size * 2 + 1, pos.z > 0 ? -dist : dist);
      targetPos.current.copy(pos).add(offset);
      targetLookAt.current.copy(pos);
    } else {
      targetPos.current.copy(defaultPos);
      targetLookAt.current.copy(defaultLookAt);
    }
  }, [target, defaultPos, defaultLookAt]);

  useFrame(() => {
    const speed = target ? 0.04 : 0.025;
    const mouseX = target ? 0 : mouse.current.x * 2;
    const mouseY = target ? 0 : -mouse.current.y * 1;
    const finalTarget = targetPos.current.clone();
    finalTarget.x += mouseX;
    finalTarget.y += mouseY;
    currentPos.current.lerp(finalTarget, speed);
    currentLookAt.current.lerp(targetLookAt.current, speed);
    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};

// ============================================
// PLANET INFO PANEL
// ============================================
const PlanetInfoPanel = ({ planet, onClose }) => {
  if (!planet) return null;
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto" role="dialog" aria-label={`${planet.name} details`}>
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full shadow-lg" style={{ backgroundColor: planet.color || "#fff", boxShadow: `0 0 12px ${planet.color || "#fff"}` }} />
            <h3 className="text-lg font-bold">{planet.name}</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-white/70 text-sm mb-2">{planet.desc}</p>
        {planet.moons !== undefined && (
          <div className="flex gap-4 text-xs text-white/50">
            <span>Moons: {planet.moons}</span>
            {planet.hasRings && <span>Has rings</span>}
          </div>
        )}
        <button onClick={onClose} className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
          Back to Solar System
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================
const SolarSystemScene = ({ selectedPlanet, onSelectPlanet, hoveredPlanet, onHover }) => {
  return (
    <>
      <CameraController target={selectedPlanet} hoveredPlanet={hoveredPlanet} />
      <ambientLight intensity={0.08} />
      <Stars radius={100} depth={80} count={8000} factor={4} saturation={0.3} fade speed={0.2} />
      <NebulaClouds />
      <Sun onClick={onSelectPlanet} />
      {PLANETS.map((p) => <OrbitRing key={`o-${p.name}`} radius={p.orbit} />)}
      {PLANETS.map((p) => (
        <Planet key={p.name} data={p} onClick={onSelectPlanet} isHovered={hoveredPlanet === p.name} onHover={onHover} />
      ))}
      <AsteroidBelt />
      <ShootingStars />
    </>
  );
};

// ============================================
// EXPORTED COMPONENT
// ============================================
const Hero3DScene = () => {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = useCallback((planet) => setSelectedPlanet(planet), []);
  const handleClose = useCallback(() => setSelectedPlanet(null), []);
  const handleHover = useCallback((name) => setHoveredPlanet(name), []);

  useEffect(() => {
    if (!selectedPlanet) return;
    const handleKey = (e) => { if (e.key === "Escape") setSelectedPlanet(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedPlanet]);

  if (reducedMotion || !visible) return null;

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <div className={`absolute inset-0 transition-opacity duration-500 ${selectedPlanet ? "pointer-events-auto" : "pointer-events-none"}`} style={{ opacity: selectedPlanet ? 1 : 0.85 }}>
        <Canvas
          camera={{ position: [0, 12, 28], fov: 50 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          style={{ background: "transparent" }}
          onPointerMissed={() => { if (selectedPlanet) setSelectedPlanet(null); }}
        >
          <SolarSystemScene selectedPlanet={selectedPlanet} onSelectPlanet={handleSelect} hoveredPlanet={hoveredPlanet} onHover={handleHover} />
        </Canvas>
      </div>
      <PlanetInfoPanel planet={selectedPlanet} onClose={handleClose} />
      {!selectedPlanet && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <p className="text-white/25 text-xs font-medium tracking-wider animate-pulse">
            Hover over planets · Click to explore
          </p>
        </div>
      )}
    </div>
  );
};

export default Hero3DScene;
