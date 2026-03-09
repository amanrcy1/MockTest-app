// ============================================
// VENUS — Detailed component
// Thick sulfuric acid clouds, greenhouse glow, lightning, retrograde rotation
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTexture, createVenusTexture } from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition } from "../physics";

// ============================================
// VENUS THICK ATMOSPHERE (dense sulfuric acid haze)
// ============================================
const VenusAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color("#ffcc88") },
    outerColor: { value: new THREE.Color("#cc8844") },
    glowColor: { value: new THREE.Color("#ff9944") },
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
    uniform vec3 innerColor;
    uniform vec3 outerColor;
    uniform vec3 glowColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 1.8);
      vec3 color = mix(innerColor, outerColor, rim);
      // Greenhouse glow on the dark side
      color += glowColor * pow(rim, 4.0) * 0.3;
      gl_FragColor = vec4(color, rim * 0.35);
    }
  `;

  return (
    <mesh scale={[1.1, 1.1, 1.1]}>
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
// CLOUD DECK (swirling sulfuric acid clouds)
// ============================================
const VenusClouds = ({ radius }) => {
  const cloudRef = useRef();
  const cloudTex = useMemo(() => {
    // Reuse Venus texture with different settings for cloud layer
    return getTexture("planet_Venus", createVenusTexture);
  }, []);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      // Super-rotation: clouds move much faster than surface
      cloudRef.current.rotation.y -= delta * 0.04;
    }
  });

  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[radius * 1.02, 64, 64]} />
      <meshStandardMaterial
        map={cloudTex}
        transparent
        opacity={0.3}
        depthWrite={false}
        roughness={1}
        color="#ffddaa"
      />
    </mesh>
  );
};

// ============================================
// LIGHTNING FLASHES (atmospheric electrical storms)
// ============================================
const LightningFlashes = ({ radius }) => {
  const flashRef = useRef();
  const timeRef = useRef(0);
  const flashPosRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!flashRef.current) return;
    timeRef.current += delta;

    // Random flash every ~2-4 seconds
    const _flashInterval = 2 + Math.sin(timeRef.current * 0.7) * 2;
    const flash = Math.sin(timeRef.current * 30) > 0.98;

    if (flash) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      flashPosRef.current.set(
        radius * 1.03 * Math.sin(phi) * Math.cos(theta),
        radius * 1.03 * Math.cos(phi),
        radius * 1.03 * Math.sin(phi) * Math.sin(theta)
      );
      flashRef.current.position.copy(flashPosRef.current);
      flashRef.current.visible = true;
      flashRef.current.material.opacity = 0.8;
    } else {
      if (flashRef.current.material.opacity > 0) {
        flashRef.current.material.opacity -= delta * 4;
      }
      if (flashRef.current.material.opacity <= 0) {
        flashRef.current.visible = false;
      }
    }
  });

  return (
    <mesh ref={flashRef} visible={false}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#ffffcc" transparent opacity={0} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

// ============================================
// MAIN VENUS COMPONENT
// ============================================
const Venus = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Venus;

  const texture = useMemo(() => getTexture("planet_Venus", createVenusTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Venus", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      // Retrograde rotation (spins backwards, very slowly)
      meshRef.current.rotation.y -= delta * 0.001;
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Venus"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Venus"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Venus"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.02} />
      </mesh>

      {/* Dense atmosphere */}
      <VenusAtmosphere radius={radius} />

      {/* Cloud super-rotation layer */}
      <VenusClouds radius={radius} />

      {/* Lightning */}
      <LightningFlashes radius={radius} />

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

export default Venus;
