// ============================================
// UNIVERSAL PLANET COMPONENT
// Renders any planet with textures, atmosphere, moons, rings
// ============================================
import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLANET_SIZES, ATMOSPHERE_COLORS, RING_DATA, MOON_DATA } from "../constants";
import { computeOrbitalPosition, computeMoonPosition } from "../physics";
import {
  getTexture,
  createMercuryTexture, createVenusTexture, createEarthTexture,
  createEarthNightTexture, createCloudTexture, createEarthBumpMap,
  createMarsTexture, createJupiterTexture, createSaturnTexture,
  createUranusTexture, createNeptuneTexture, createMoonTexture,
  createIoTexture, createEuropaTexture, createTitanTexture,
  createRockyTexture, createIcyTexture, createSaturnRingTexture,
  createUranusRingTexture,
} from "../textures";

// Map planet names to texture generators
const TEXTURE_MAP = {
  Mercury: createMercuryTexture,
  Venus: createVenusTexture,
  Earth: createEarthTexture,
  Mars: createMarsTexture,
  Jupiter: createJupiterTexture,
  Saturn: createSaturnTexture,
  Uranus: createUranusTexture,
  Neptune: createNeptuneTexture,
};

const MOON_TEXTURE_MAP = {
  moon: createMoonTexture,
  io: createIoTexture,
  europa: createEuropaTexture,
  titan: createTitanTexture,
  rocky: () => createRockyTexture(128),
  icy: createIcyTexture,
};

// ============================================
// ATMOSPHERE SHELL
// ============================================
const Atmosphere = ({ radius, color, intensity }) => {
  const shaderRef = useRef();

  const uniforms = useMemo(() => ({
    innerColor: { value: new THREE.Color(color.inner) },
    outerColor: { value: new THREE.Color(color.outer) },
    intensity: { value: intensity },
  }), [color, intensity]);

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
    uniform float intensity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
      rim = pow(rim, 2.5);
      vec3 color = mix(innerColor, outerColor, rim);
      gl_FragColor = vec4(color, rim * intensity);
    }
  `;

  return (
    <mesh scale={[1.08, 1.08, 1.08]}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        ref={shaderRef}
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
// RING SYSTEM
// ============================================
const RingSystem = ({ planetName, planetSize }) => {
  const ringData = RING_DATA[planetName];

  const ringTexture = useMemo(() => {
    if (planetName === "Saturn") return getTexture("saturnRing", createSaturnRingTexture);
    if (planetName === "Uranus") return getTexture("uranusRing", createUranusRingTexture);
    return null;
  }, [planetName]);

  const innerR = ringData ? ringData.innerRadius * planetSize : 0;
  const outerR = ringData ? ringData.outerRadius * planetSize : 0;

  const ringGeo = useMemo(() => {
    if (!ringData) return null;
    const geo = new THREE.RingGeometry(innerR, outerR, 128);
    // Fix UV mapping for ring texture
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
  }, [ringData, innerR, outerR]);

  if (!ringData) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo}>
      <meshStandardMaterial
        map={ringTexture}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// MOON COMPONENT
// ============================================
const MoonBody = ({ data, simTime }) => {
  const meshRef = useRef();
  const texture = useMemo(() => {
    const gen = MOON_TEXTURE_MAP[data.texType] || MOON_TEXTURE_MAP.rocky;
    return getTexture(`moon_${data.name}`, gen);
  }, [data]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = computeMoonPosition(data.orbit, data.speed, simTime);
    meshRef.current.position.set(pos[0], pos[1], pos[2]);
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[data.size, 24, 24]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
};

// ============================================
// CLOUD LAYER (Earth only)
// ============================================
const CloudLayer = ({ radius }) => {
  const cloudRef = useRef();
  const cloudTex = useMemo(() => getTexture("earthClouds", createCloudTexture), []);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[radius * 1.01, 48, 48]} />
      <meshStandardMaterial
        map={cloudTex}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// NIGHT SIDE GLOW (Earth only)
// ============================================
const NightSide = ({ radius }) => {
  const nightTex = useMemo(() => getTexture("earthNight", createEarthNightTexture), []);

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.002, 48, 48]} />
      <meshBasicMaterial
        map={nightTex}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// MAIN PLANET COMPONENT
// ============================================
const Planet = ({
  name,
  simTime = 0,
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false,
  isSelected = false,
  showOrbit: _showOrbit = true,
  showLabel: _showLabel = true,
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const _labelRef = useRef();
  const [hoverScale, setHoverScale] = useState(1);

  const planetSize = PLANET_SIZES[name] || 0.3;
  const atmosphere = ATMOSPHERE_COLORS[name];
  const moons = MOON_DATA[name] || [];
  const hasRings = !!RING_DATA[name];

  // Generate planet texture
  const texture = useMemo(() => {
    const gen = TEXTURE_MAP[name];
    if (!gen) return null;
    return getTexture(`planet_${name}`, gen);
  }, [name]);

  // Earth bump map
  const bumpMap = useMemo(() => {
    if (name !== "Earth") return null;
    return getTexture("earthBump", createEarthBumpMap);
  }, [name]);

  // Hover animation
  useEffect(() => {
    setHoverScale(isHovered ? 1.3 : 1);
  }, [isHovered]);

  // Update position and rotation each frame
  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    // Orbital position
    const pos = computeOrbitalPosition(name, simTime);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    // Self rotation
    const rotSpeed = name === "Venus" || name === "Uranus" ? -0.003 : 0.008;
    meshRef.current.rotation.y += delta * rotSpeed;

    // Smooth hover scale
    const currentScale = meshRef.current.scale.x;
    const targetScale = hoverScale;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    meshRef.current.scale.setScalar(newScale);
  });

  return (
    <group ref={groupRef}>
      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(name); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(name); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.(name); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[planetSize, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={bumpMap}
          bumpScale={0.02}
          roughness={name === "Venus" ? 0.6 : 0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Earth-specific layers */}
      {name === "Earth" && <CloudLayer radius={planetSize} />}
      {name === "Earth" && <NightSide radius={planetSize} />}

      {/* Atmosphere */}
      {atmosphere && (
        <Atmosphere
          radius={planetSize}
          color={atmosphere}
          intensity={atmosphere.intensity}
        />
      )}

      {/* Ring system */}
      {hasRings && <RingSystem planetName={name} planetSize={planetSize} />}

      {/* Moons */}
      {moons.map((moon) => (
        <MoonBody key={moon.name} data={moon} simTime={simTime} />
      ))}

      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planetSize * 1.5, planetSize * 1.6, 64]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default Planet;
