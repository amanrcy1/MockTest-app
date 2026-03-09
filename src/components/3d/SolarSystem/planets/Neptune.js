// ============================================
// NEPTUNE — Detailed component
// Supersonic winds, Great Dark Spot, vivid blue methane atmosphere,
// Triton with retrograde orbit and nitrogen geysers
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTexture, createNeptuneTexture, createIcyTexture } from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition } from "../physics";

// ============================================
// NEPTUNE ATMOSPHERE (deep blue with wind streaks)
// ============================================
const NeptuneAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color("#5577ee") },
    outerColor: { value: new THREE.Color("#3344aa") },
    time: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    uniforms.time.value = clock.getElapsedTime();
  });

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 innerColor;
    uniform vec3 outerColor;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 2.0);
      // Wind streak effect
      float streak = sin(vUv.y * 40.0 + time * 0.5) * 0.5 + 0.5;
      streak = pow(streak, 8.0) * 0.15;
      vec3 color = mix(innerColor, outerColor, rim);
      color += vec3(0.2, 0.3, 0.8) * streak;
      gl_FragColor = vec4(color, rim * 0.15 + streak * 0.05);
    }
  `;

  return (
    <mesh scale={[1.07, 1.07, 1.07]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// GREAT DARK SPOT (transient storm)
// ============================================
const GreatDarkSpot = ({ radius }) => {
  const spotRef = useRef();

  useFrame(({ clock }) => {
    if (!spotRef.current) return;
    // Slowly drifts and fades (these storms are transient)
    const t = clock.getElapsedTime();
    const opacity = 0.2 + Math.sin(t * 0.3) * 0.1;
    spotRef.current.material.opacity = opacity;
    spotRef.current.rotation.y = t * 0.01;
  });

  const lat = -20 * (Math.PI / 180);
  const r = radius * 1.003;

  return (
    <mesh
      ref={spotRef}
      position={[
        r * Math.cos(lat),
        r * Math.sin(lat),
        0,
      ]}
      rotation={[0, 0, lat]}
    >
      <circleGeometry args={[radius * 0.12, 32]} />
      <meshBasicMaterial color="#223366" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// ============================================
// WIND BANDS (visible high-speed cloud streaks)
// ============================================
const WindBands = ({ radius }) => {
  const bandsRef = useRef();

  useFrame(({ clock }) => {
    if (!bandsRef.current) return;
    // Supersonic wind rotation (fastest in solar system)
    bandsRef.current.rotation.y = clock.getElapsedTime() * 0.05;
  });

  return (
    <mesh ref={bandsRef}>
      <sphereGeometry args={[radius * 1.005, 64, 64]} />
      <meshStandardMaterial
        color="#6688cc"
        transparent
        opacity={0.06}
        depthWrite={false}
        wireframe
      />
    </mesh>
  );
};

// ============================================
// TRITON (retrograde orbit, nitrogen geysers)
// ============================================
const Triton = ({ simTime }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const geyserRef = useRef();
  const tritonTex = useMemo(() => getTexture("moon_Triton", createIcyTexture), []);
  const geyserCount = 30;

  const geyserPositions = useMemo(() => new Float32Array(geyserCount * 3), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Retrograde orbit (negative speed)
    const angle = -simTime * 0.2;
    const orbitR = 1.5;
    const inclination = 157 * (Math.PI / 180); // Highly inclined retrograde

    groupRef.current.position.set(
      Math.cos(angle) * orbitR,
      Math.sin(angle) * Math.sin(inclination) * orbitR * 0.3,
      Math.sin(angle) * orbitR
    );

    if (meshRef.current) meshRef.current.rotation.y += 0.003;

    // Nitrogen geyser particles
    if (geyserRef.current) {
      const t = clock.getElapsedTime();
      for (let i = 0; i < geyserCount; i++) {
        const life = ((t * 1.5 + i * 0.4) % 2) / 2;
        geyserPositions[i * 3] = (Math.random() - 0.5) * 0.015;
        geyserPositions[i * 3 + 1] = 0.08 + life * 0.12;
        geyserPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
      }
      geyserRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial map={tritonTex} roughness={0.4} metalness={0.1} color="#aabbcc" />
      </mesh>
      {/* Thin nitrogen atmosphere */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#aaccee" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Nitrogen geysers */}
      <points ref={geyserRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={geyserPositions} count={geyserCount} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#bbddff" size={0.006} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
};

// ============================================
// MAIN NEPTUNE COMPONENT
// ============================================
const Neptune = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Neptune;

  const texture = useMemo(() => getTexture("planet_Neptune", createNeptuneTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Neptune", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.012;
      meshRef.current.rotation.x = 0.4943; // Axial tilt
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Neptune"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Neptune"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Neptune"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Deep blue atmosphere with wind streaks */}
      <NeptuneAtmosphere radius={radius} />

      {/* Great Dark Spot */}
      <GreatDarkSpot radius={radius} />

      {/* Wind bands */}
      <WindBands radius={radius} />

      {/* Triton with retrograde orbit */}
      <Triton simTime={simTime} />

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.8, radius * 1.9, 64]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default Neptune;
