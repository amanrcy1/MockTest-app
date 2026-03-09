// ============================================
// ORBIT LINES
// Visual orbit paths for all planets
// ============================================
import { useMemo } from "react";
import * as THREE from "three";
import { ORBITAL_DATA, PLANET_COLORS } from "./constants";
import { generateOrbitPath } from "./physics";

const OrbitLine = ({ planetName, visible = true }) => {
  const color = PLANET_COLORS[planetName] || "#ffffff";

  const geometry = useMemo(() => {
    const points = generateOrbitPath(planetName, 256);
    if (points.length === 0) return null;
    const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.BufferGeometry().setFromPoints(vectors);
  }, [planetName]);

  if (!geometry || !visible) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </line>
  );
};

const OrbitLines = ({ visible = true }) => {
  const planets = Object.keys(ORBITAL_DATA);

  return (
    <group>
      {planets.map((name) => (
        <OrbitLine key={name} planetName={name} visible={visible} />
      ))}
    </group>
  );
};

export default OrbitLines;
