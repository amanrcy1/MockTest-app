// ============================================
// URANUS — Detailed component
// Extreme axial tilt (98°), vertical ring system, methane atmosphere,
// seasonal color variation, icy moons
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getTexture, createUranusTexture, createUranusRingTexture,
  createIcyTexture, createRockyTexture,
} from "../textures";
import { PLANET_SIZES, RING_DATA } from "../constants";
import { computeOrbitalPosition, computeMoonPosition } from "../physics";

// ============================================
// URANUS METHANE ATMOSPHERE
// ============================================
const UranusAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color("#99ddee") },
    outerColor: { value: new THREE.Color("#66aabb") },
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
      rim = pow(rim, 2.0);
      vec3 color = mix(innerColor, outerColor, rim);
      gl_FragColor = vec4(color, rim * 0.12);
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
// VERTICAL RING SYSTEM (tilted with the planet)
// ============================================
const UranusRings = ({ planetSize }) => {
  const ringData = RING_DATA.Uranus;
  const ringTexture = useMemo(() => getTexture("uranusRing", createUranusRingTexture), []);

  const innerR = ringData.innerRadius * planetSize;
  const outerR = ringData.outerRadius * planetSize;

  const ringGeo = useMemo(() => {
    const geo = new THREE.RingGeometry(innerR, outerR, 64);
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo}>
      <meshStandardMaterial
        map={ringTexture}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// SEASONAL POLAR BRIGHTENING
// (one pole faces the Sun for decades)
// ============================================
const PolarBrightening = ({ radius }) => {
  const capRef = useRef();

  useFrame(({ clock }) => {
    if (!capRef.current) return;
    const pulse = 0.08 + Math.sin(clock.getElapsedTime() * 0.5) * 0.02;
    capRef.current.material.opacity = pulse;
  });

  return (
    <mesh ref={capRef} position={[0, radius * 0.9, 0]}>
      <sphereGeometry args={[radius * 0.35, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
      <meshBasicMaterial color="#aaeeff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
};

// ============================================
// ICY MOON
// ============================================
const IcyMoon = ({ name, size, orbitRadius, speed, simTime }) => {
  const meshRef = useRef();
  const texType = name === "Titania" ? "icy" : "rocky";
  const texture = useMemo(() => {
    const gen = texType === "icy" ? createIcyTexture : () => createRockyTexture(128);
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
      <sphereGeometry args={[size, 20, 20]} />
      <meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>
  );
};

// ============================================
// MAIN URANUS COMPONENT
// ============================================
const Uranus = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Uranus;

  const texture = useMemo(() => getTexture("planet_Uranus", createUranusTexture), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Uranus", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      // Retrograde rotation
      meshRef.current.rotation.y -= delta * 0.01;
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Extreme axial tilt — Uranus rolls on its side */}
      <group rotation={[0, 0, 1.7064]}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.("Uranus"); }}
          onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Uranus"); document.body.style.cursor = "pointer"; }}
          onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Uranus"); document.body.style.cursor = "default"; }}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial map={texture} roughness={0.7} metalness={0.05} />
        </mesh>

        {/* Polar brightening */}
        <PolarBrightening radius={radius} />

        {/* Atmosphere */}
        <UranusAtmosphere radius={radius} />

        {/* Vertical rings */}
        <UranusRings planetSize={radius} />
      </group>

      {/* Moons orbit in the tilted plane */}
      <group rotation={[0, 0, 1.7064]}>
        <IcyMoon name="Titania" size={0.06} orbitRadius={1.5} speed={2.0} simTime={simTime} />
        <IcyMoon name="Oberon" size={0.055} orbitRadius={1.9} speed={1.5} simTime={simTime} />
      </group>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 2.2, radius * 2.3, 64]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default Uranus;
