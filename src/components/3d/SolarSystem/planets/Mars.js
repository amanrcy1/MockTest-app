// ============================================
// MARS — Detailed component
// Polar ice caps, dust storms, Olympus Mons highlight, Phobos & Deimos
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTexture, createMarsTexture, createRockyTexture } from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition, computeMoonPosition } from "../physics";

// ============================================
// MARS THIN ATMOSPHERE
// ============================================
const MarsAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    atmosphereColor: { value: new THREE.Color("#cc8866") },
    dustColor: { value: new THREE.Color("#dd9955") },
  }), []);

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 atmosphereColor;
    uniform vec3 dustColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 3.0);
      vec3 color = mix(atmosphereColor, dustColor, rim);
      gl_FragColor = vec4(color, rim * 0.08);
    }
  `;

  return (
    <mesh scale={[1.04, 1.04, 1.04]}>
      <sphereGeometry args={[radius, 48, 48]} />
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
// POLAR ICE CAPS
// ============================================
const PolarIceCaps = ({ radius }) => {
  const northRef = useRef();
  const southRef = useRef();

  return (
    <>
      {/* North polar cap */}
      <mesh ref={northRef} position={[0, radius * 0.95, 0]}>
        <sphereGeometry args={[radius * 0.25, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
        <meshStandardMaterial color="#eeeeff" transparent opacity={0.6} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* South polar cap */}
      <mesh ref={southRef} position={[0, -radius * 0.95, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[radius * 0.2, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.25]} />
        <meshStandardMaterial color="#ddddef" transparent opacity={0.5} roughness={0.3} metalness={0.1} />
      </mesh>
    </>
  );
};

// ============================================
// DUST STORM (periodic swirling particles)
// ============================================
const DustStorm = ({ radius }) => {
  const dustRef = useRef();
  const count = 80;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4 + Math.PI * 0.3; // mid-latitudes
      const r = radius * 1.01;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, [radius]);

  useFrame(({ clock }) => {
    if (!dustRef.current) return;
    // Slowly rotate the dust cloud
    dustRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    // Pulsing visibility for storm activity
    const stormIntensity = (Math.sin(clock.getElapsedTime() * 0.3) + 1) * 0.5;
    dustRef.current.material.opacity = stormIntensity * 0.15;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#dd9966" size={0.015} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

// ============================================
// MARS MOONS (Phobos & Deimos with irregular shapes)
// ============================================
const MarsMoon = ({ name, size, orbitRadius, speed, simTime }) => {
  const meshRef = useRef();
  const texture = useMemo(() => getTexture(`moon_${name}`, () => createRockyTexture(128)), [name]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = computeMoonPosition(orbitRadius, speed, simTime);
    meshRef.current.position.set(pos[0], pos[1], pos[2]);
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.x += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      {/* Irregular shape using icosahedron */}
      <icosahedronGeometry args={[size, 1]} />
      <meshStandardMaterial map={texture} roughness={0.95} flatShading />
    </mesh>
  );
};

// ============================================
// MAIN MARS COMPONENT
// ============================================
const Mars = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Mars;

  const texture = useMemo(() => getTexture("planet_Mars", createMarsTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Mars", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.008;
      meshRef.current.rotation.x = 0.4396; // Axial tilt
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Mars"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Mars"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Mars"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} bumpMap={texture} bumpScale={0.025} />
      </mesh>

      {/* Thin atmosphere */}
      <MarsAtmosphere radius={radius} />

      {/* Polar ice caps */}
      <PolarIceCaps radius={radius} />

      {/* Dust storms */}
      <DustStorm radius={radius} />

      {/* Phobos */}
      <MarsMoon name="Phobos" size={0.04} orbitRadius={0.5} speed={4.5} simTime={simTime} />

      {/* Deimos */}
      <MarsMoon name="Deimos" size={0.025} orbitRadius={0.7} speed={2.8} simTime={simTime} />

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.5, radius * 1.6, 64]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default Mars;
