// ============================================
// JUPITER — Detailed component
// Great Red Spot, cloud bands, Galilean moons, faint ring, radiation belts
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getTexture, createJupiterTexture,
  createIoTexture, createEuropaTexture, createRockyTexture,
} from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition, computeMoonPosition } from "../physics";

// ============================================
// JUPITER ATMOSPHERE (banded cloud layers)
// ============================================
const JupiterAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color("#ddbb88") },
    outerColor: { value: new THREE.Color("#aa8855") },
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
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 2.2);
      vec3 color = mix(innerColor, outerColor, rim);
      gl_FragColor = vec4(color, rim * 0.12);
    }
  `;

  return (
    <mesh scale={[1.06, 1.04, 1.06]}>
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
// GREAT RED SPOT (glowing storm marker)
// ============================================
const GreatRedSpot = ({ radius }) => {
  const spotRef = useRef();

  useFrame(({ clock }) => {
    if (!spotRef.current) return;
    // Pulsing intensity
    const pulse = 0.6 + Math.sin(clock.getElapsedTime() * 1.5) * 0.15;
    spotRef.current.material.opacity = pulse;
  });

  // Position at ~22° south latitude
  const lat = -22 * (Math.PI / 180);
  const lon = 0;
  const r = radius * 1.005;

  return (
    <mesh
      ref={spotRef}
      position={[
        r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon),
      ]}
      rotation={[0, 0, lat]}
    >
      <circleGeometry args={[radius * 0.15, 32]} />
      <meshBasicMaterial
        color="#cc4422"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ============================================
// FAINT RING SYSTEM
// ============================================
const JupiterRing = ({ radius }) => {
  const ringGeo = useMemo(() => {
    const inner = radius * 1.3;
    const outer = radius * 1.8;
    const geo = new THREE.RingGeometry(inner, outer, 64);
    return geo;
  }, [radius]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo}>
      <meshBasicMaterial color="#aa9977" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// ============================================
// RADIATION BELTS (glowing torus)
// ============================================
const RadiationBelts = ({ radius }) => {
  const beltRef = useRef();

  useFrame(({ clock }) => {
    if (!beltRef.current) return;
    beltRef.current.rotation.z = clock.getElapsedTime() * 0.1;
    const pulse = 0.03 + Math.sin(clock.getElapsedTime() * 2) * 0.01;
    beltRef.current.material.opacity = pulse;
  });

  return (
    <mesh ref={beltRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 2.0, radius * 0.3, 16, 64]} />
      <meshBasicMaterial color="#8866ff" transparent opacity={0.03} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
};

// ============================================
// GALILEAN MOON
// ============================================
const GalileanMoon = ({ name, size, orbitRadius, speed, texType, simTime }) => {
  const meshRef = useRef();
  const texture = useMemo(() => {
    const generators = { io: createIoTexture, europa: createEuropaTexture, rocky: () => createRockyTexture(128) };
    const gen = generators[texType] || generators.rocky;
    return getTexture(`moon_${name}`, gen);
  }, [name, texType]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = computeMoonPosition(orbitRadius, speed, simTime);
    meshRef.current.position.set(pos[0], pos[1], pos[2]);
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size, 24, 24]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
};

// ============================================
// MAIN JUPITER COMPONENT
// ============================================
const Jupiter = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Jupiter;

  const texture = useMemo(() => getTexture("planet_Jupiter", createJupiterTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Jupiter", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      // Fastest rotating planet (~10 hour day)
      meshRef.current.rotation.y += delta * 0.02;
      meshRef.current.rotation.x = 0.0546; // Slight axial tilt
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Oblate spheroid (Jupiter is wider at equator) */}
      <group scale={[1, 0.935, 1]}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.("Jupiter"); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Jupiter"); document.body.style.cursor = "pointer"; }}
          onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Jupiter"); document.body.style.cursor = "default"; }}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial map={texture} roughness={0.75} metalness={0.02} />
        </mesh>

        {/* Great Red Spot */}
        <GreatRedSpot radius={radius} />
      </group>

      {/* Atmosphere */}
      <JupiterAtmosphere radius={radius} />

      {/* Faint ring */}
      <JupiterRing radius={radius} />

      {/* Radiation belts */}
      <RadiationBelts radius={radius} />

      {/* Galilean moons */}
      <GalileanMoon name="Io" size={0.08} orbitRadius={1.8} speed={3.0} texType="io" simTime={simTime} />
      <GalileanMoon name="Europa" size={0.07} orbitRadius={2.2} speed={2.2} texType="europa" simTime={simTime} />
      <GalileanMoon name="Ganymede" size={0.1} orbitRadius={2.7} speed={1.5} texType="rocky" simTime={simTime} />
      <GalileanMoon name="Callisto" size={0.09} orbitRadius={3.2} speed={1.0} texType="rocky" simTime={simTime} />

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

export default Jupiter;
