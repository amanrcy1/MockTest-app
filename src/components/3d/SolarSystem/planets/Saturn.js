// ============================================
// SATURN — Detailed component
// Spectacular ring system with divisions, hexagonal north pole storm,
// Titan with haze, Enceladus with geysers
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getTexture, createSaturnTexture, createSaturnRingTexture,
  createTitanTexture, createIcyTexture, createRockyTexture,
} from "../textures";
import { PLANET_SIZES, RING_DATA } from "../constants";
import { computeOrbitalPosition, computeMoonPosition } from "../physics";

// ============================================
// SATURN ATMOSPHERE
// ============================================
const SaturnAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color("#ddcc99") },
    outerColor: { value: new THREE.Color("#bbaa77") },
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
      rim = pow(rim, 2.5);
      vec3 color = mix(innerColor, outerColor, rim);
      gl_FragColor = vec4(color, rim * 0.1);
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
// DETAILED RING SYSTEM with Cassini Division
// ============================================
const SaturnRings = ({ planetSize }) => {
  const ringData = RING_DATA.Saturn;
  const ringTexture = useMemo(() => getTexture("saturnRing", createSaturnRingTexture), []);

  const innerR = ringData.innerRadius * planetSize;
  const outerR = ringData.outerRadius * planetSize;

  const ringGeo = useMemo(() => {
    const geo = new THREE.RingGeometry(innerR, outerR, 128);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const u = (dist - innerR) / (outerR - innerR);
      const angle = Math.atan2(y, x);
      uv.setXY(i, u, angle / (Math.PI * 2) + 0.5);
    }
    return geo;
  }, [innerR, outerR]);

  return (
    <group rotation={[-ringData.tilt, 0, 0]}>
      {/* Main ring */}
      <mesh geometry={ringGeo}>
        <meshStandardMaterial
          map={ringTexture}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.8}
        />
      </mesh>
      {/* Ring shadow on planet (subtle darkening) */}
      <mesh geometry={ringGeo} position={[0, -0.01, 0]}>
        <meshBasicMaterial color="#000000" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ============================================
// HEXAGONAL NORTH POLE STORM
// ============================================
const HexagonalStorm = ({ radius }) => {
  const hexRef = useRef();

  const hexShape = useMemo(() => {
    const shape = new THREE.Shape();
    const size = radius * 0.15;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, [radius]);

  useFrame(({ clock }) => {
    if (!hexRef.current) return;
    hexRef.current.rotation.z = clock.getElapsedTime() * 0.3;
    const pulse = 0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    hexRef.current.material.opacity = pulse;
  });

  return (
    <mesh ref={hexRef} position={[0, radius * 0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[hexShape]} />
      <meshBasicMaterial color="#ddaa55" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ============================================
// TITAN (with orange haze)
// ============================================
const Titan = ({ simTime }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const titanTex = useMemo(() => getTexture("moon_Titan", createTitanTexture), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const pos = computeMoonPosition(3.0, 1.2, simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);
    if (meshRef.current) meshRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial map={titanTex} roughness={0.8} />
      </mesh>
      {/* Orange atmospheric haze */}
      <mesh scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshBasicMaterial color="#dd8833" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ============================================
// ENCELADUS (with ice geysers)
// ============================================
const Enceladus = ({ simTime }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const geyserRef = useRef();
  const icyTex = useMemo(() => getTexture("moon_Enceladus", createIcyTexture), []);
  const count = 40;

  const geyserPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pos = computeMoonPosition(2.0, 2.5, simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);
    if (meshRef.current) meshRef.current.rotation.y += 0.005;

    // Animate geyser particles
    if (geyserRef.current) {
      const t = clock.getElapsedTime();
      for (let i = 0; i < count; i++) {
        const life = ((t * 2 + i * 0.3) % 2) / 2;
        geyserPositions[i * 3] = (Math.random() - 0.5) * 0.02;
        geyserPositions[i * 3 + 1] = -0.04 - life * 0.15;
        geyserPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      }
      geyserRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.04, 24, 24]} />
        <meshStandardMaterial map={icyTex} roughness={0.3} metalness={0.1} color="#eeeeff" />
      </mesh>
      {/* Ice geysers from south pole */}
      <points ref={geyserRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={geyserPositions} count={count} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#ccddff" size={0.008} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
};

// ============================================
// SMALL MOON (Mimas, etc.)
// ============================================
const SmallMoon = ({ name, size, orbitRadius, speed, simTime }) => {
  const meshRef = useRef();
  const texture = useMemo(() => getTexture(`moon_${name}`, () => createRockyTexture(128)), [name]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = computeMoonPosition(orbitRadius, speed, simTime);
    meshRef.current.position.set(pos[0], pos[1], pos[2]);
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
};

// ============================================
// MAIN SATURN COMPONENT
// ============================================
const Saturn = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Saturn;

  const texture = useMemo(() => getTexture("planet_Saturn", createSaturnTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Saturn", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.018;
      meshRef.current.rotation.x = 0.4665; // Axial tilt
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Oblate spheroid */}
      <group scale={[1, 0.91, 1]}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.("Saturn"); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Saturn"); document.body.style.cursor = "pointer"; }}
          onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Saturn"); document.body.style.cursor = "default"; }}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial map={texture} roughness={0.75} metalness={0.02} />
        </mesh>

        {/* Hexagonal storm */}
        <HexagonalStorm radius={radius} />
      </group>

      {/* Atmosphere */}
      <SaturnAtmosphere radius={radius} />

      {/* Ring system */}
      <SaturnRings planetSize={radius} />

      {/* Titan with haze */}
      <Titan simTime={simTime} />

      {/* Enceladus with geysers */}
      <Enceladus simTime={simTime} />

      {/* Mimas */}
      <SmallMoon name="Mimas" size={0.03} orbitRadius={1.6} speed={3.5} simTime={simTime} />

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 2.8, radius * 2.9, 64]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default Saturn;
