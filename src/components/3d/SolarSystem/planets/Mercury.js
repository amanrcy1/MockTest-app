// ============================================
// MERCURY — Detailed component
// Heavily cratered surface, sodium tail, extreme temperature zones
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTexture, createMercuryTexture } from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition } from "../physics";

// ============================================
// SODIUM TAIL (Mercury has a comet-like tail)
// ============================================
const SodiumTail = ({ simTime }) => {
  const pointsRef = useRef();
  const count = 200;

  const { positions, opacities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const op = new Float32Array(count);
    return { positions: pos, opacities: op };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const sunDir = computeOrbitalPosition("Mercury", simTime);
    const dirX = sunDir[0];
    const dirZ = sunDir[2];
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const spread = t * 0.8;
      positions[i * 3] = (dirX / len) * t * 1.5 + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.3;
      positions[i * 3 + 2] = (dirZ / len) * t * 1.5 + (Math.random() - 0.5) * spread;
      opacities[i] = (1 - t) * 0.3;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffaa44" size={0.02} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

// ============================================
// TERMINATOR GLOW (day/night boundary heat shimmer)
// ============================================
const TerminatorGlow = ({ radius }) => {
  const uniforms = useMemo(() => ({
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
  }), []);

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      float sunAngle = dot(normalize(vWorldPosition), normalize(sunDirection));
      // Glow at the terminator line
      float terminator = 1.0 - abs(sunAngle);
      terminator = pow(terminator, 8.0);
      vec3 color = mix(vec3(0.8, 0.3, 0.1), vec3(1.0, 0.6, 0.2), terminator);
      gl_FragColor = vec4(color, terminator * 0.15);
    }
  `;

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.005, 48, 48]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// MAIN MERCURY COMPONENT
// ============================================
const Mercury = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Mercury;

  const texture = useMemo(() => getTexture("planet_Mercury", createMercuryTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Mercury", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      // Mercury's very slow rotation (58.65 Earth days)
      meshRef.current.rotation.y += delta * 0.002;
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Mercury"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Mercury"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Mercury"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.95}
          metalness={0.1}
          bumpMap={texture}
          bumpScale={0.03}
        />
      </mesh>

      {/* Terminator heat glow */}
      <TerminatorGlow radius={radius} />

      {/* Sodium tail */}
      <SodiumTail simTime={simTime} />

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

export default Mercury;
