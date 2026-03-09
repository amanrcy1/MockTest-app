// ============================================
// EARTH — Detailed component
// Clouds, night lights, atmosphere, ISS, Moon with phases
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getTexture, createEarthTexture, createEarthNightTexture,
  createCloudTexture, createEarthBumpMap, createMoonTexture,
} from "../textures";
import { PLANET_SIZES } from "../constants";
import { computeOrbitalPosition } from "../physics";

// ============================================
// EARTH ATMOSPHERE (Rayleigh scattering approximation)
// ============================================
const EarthAtmosphere = ({ radius }) => {
  const uniforms = useMemo(() => ({
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    atmosphereColor: { value: new THREE.Color("#6699ff") },
    sunsetColor: { value: new THREE.Color("#ff6633") },
  }), []);

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 sunDirection;
    uniform vec3 atmosphereColor;
    uniform vec3 sunsetColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 2.0);

      // Sun angle for sunset coloring
      float sunAngle = dot(normalize(vWorldPosition), normalize(sunDirection));
      float sunset = smoothstep(-0.2, 0.3, sunAngle) * smoothstep(0.8, 0.3, sunAngle);

      vec3 color = mix(atmosphereColor, sunsetColor, sunset * 0.4);
      float alpha = rim * 0.2;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  return (
    <mesh scale={[1.06, 1.06, 1.06]}>
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
// DETAILED CLOUD LAYER with shadow
// ============================================
const DetailedClouds = ({ radius }) => {
  const cloudRef = useRef();
  const shadowRef = useRef();
  const cloudTex = useMemo(() => getTexture("earthClouds", createCloudTexture), []);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.015;
    }
    if (shadowRef.current) {
      shadowRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <>
      {/* Cloud layer */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[radius * 1.008, 64, 64]} />
        <meshStandardMaterial
          map={cloudTex}
          transparent
          opacity={0.45}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
      {/* Cloud shadow on surface */}
      <mesh ref={shadowRef}>
        <sphereGeometry args={[radius * 1.001, 64, 64]} />
        <meshStandardMaterial
          map={cloudTex}
          transparent
          opacity={0.08}
          depthWrite={false}
          color="#000000"
        />
      </mesh>
    </>
  );
};

// ============================================
// CITY LIGHTS (night side)
// ============================================
const CityLights = ({ radius }) => {
  const nightTex = useMemo(() => getTexture("earthNight", createEarthNightTexture), []);

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.002, 64, 64]} />
      <meshBasicMaterial
        map={nightTex}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// MOON with libration and phase
// ============================================
const DetailedMoon = ({ simTime }) => {
  const moonRef = useRef();
  const moonGroupRef = useRef();
  const moonTex = useMemo(() => getTexture("moon_Moon", createMoonTexture), []);

  useFrame(() => {
    if (!moonGroupRef.current) return;
    // Lunar orbit (27.3 day period)
    const angle = simTime * 0.23;
    const orbitRadius = 0.85;
    const inclination = 5.145 * (Math.PI / 180);

    moonGroupRef.current.position.set(
      Math.cos(angle) * orbitRadius,
      Math.sin(angle) * Math.sin(inclination) * orbitRadius * 0.3,
      Math.sin(angle) * orbitRadius
    );

    // Tidally locked — same face always toward Earth
    if (moonRef.current) {
      moonRef.current.rotation.y = -angle + Math.PI;
      // Libration (slight wobble)
      moonRef.current.rotation.x = Math.sin(angle * 0.5) * 0.05;
    }
  });

  return (
    <group ref={moonGroupRef}>
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial
          map={moonTex}
          roughness={0.95}
          metalness={0}
          bumpMap={moonTex}
          bumpScale={0.005}
        />
      </mesh>
    </group>
  );
};

// ============================================
// ISS (tiny orbiting dot)
// ============================================
const ISS = ({ radius }) => {
  const issRef = useRef();

  useFrame(({ clock }) => {
    if (!issRef.current) return;
    const t = clock.getElapsedTime() * 2;
    const orbitR = radius * 1.05;
    const inclination = 51.6 * (Math.PI / 180);
    issRef.current.position.set(
      Math.cos(t) * orbitR,
      Math.sin(t) * Math.sin(inclination) * orbitR,
      Math.sin(t) * Math.cos(inclination) * orbitR
    );
  });

  return (
    <mesh ref={issRef}>
      <boxGeometry args={[0.008, 0.002, 0.015]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
};

// ============================================
// MAIN EARTH COMPONENT
// ============================================
const Earth = ({ simTime = 0, onClick, onPointerOver, onPointerOut, isHovered, isSelected }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const radius = PLANET_SIZES.Earth;

  const earthTex = useMemo(() => getTexture("planet_Earth", createEarthTexture), []);
  const bumpMap = useMemo(() => getTexture("earthBump", createEarthBumpMap), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = computeOrbitalPosition("Earth", simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    if (meshRef.current) {
      // Earth rotates once per day (fast in sim)
      meshRef.current.rotation.y += delta * 0.008;
      // Axial tilt
      meshRef.current.rotation.x = 0.4101;

      // Hover scale
      const target = isHovered ? 1.3 : 1;
      const current = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(current + (target - current) * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Earth surface */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Earth"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Earth"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Earth"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={earthTex}
          bumpMap={bumpMap}
          bumpScale={0.02}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Atmosphere */}
      <EarthAtmosphere radius={radius} />

      {/* Clouds */}
      <DetailedClouds radius={radius} />

      {/* City lights */}
      <CityLights radius={radius} />

      {/* Moon */}
      <DetailedMoon simTime={simTime} />

      {/* ISS */}
      <ISS radius={radius} />

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

export default Earth;
