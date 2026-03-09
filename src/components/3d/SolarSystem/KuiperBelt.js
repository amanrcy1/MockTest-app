// ============================================
// KUIPER BELT + PLUTO
// Outer solar system objects beyond Neptune
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCALE } from "./constants";
import { getTexture, createPlutoTexture } from "./textures";

// ============================================
// PLUTO (dwarf planet)
// ============================================
export const Pluto = ({ simTime = 0, onClick, onPointerOver, onPointerOut }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const charonRef = useRef();

  const plutoTex = useMemo(() => getTexture("pluto", createPlutoTexture), []);

  useFrame(() => {
    if (!groupRef.current) return;
    // Pluto orbit (simplified — very slow, far out)
    const angle = simTime * 0.00001 + 2.5;
    const radius = 23;
    groupRef.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 0.3) * 0.8, // inclined orbit
      Math.sin(angle) * radius
    );

    if (meshRef.current) meshRef.current.rotation.y += 0.003;

    // Charon orbits Pluto
    if (charonRef.current) {
      const cAngle = simTime * 0.05;
      charonRef.current.position.set(
        Math.cos(cAngle) * 0.25,
        0,
        Math.sin(cAngle) * 0.25
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Pluto"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Pluto"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Pluto"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial map={plutoTex} roughness={0.9} />
      </mesh>

      {/* Charon */}
      <mesh ref={charonRef}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color="#aaa8a0" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ============================================
// KUIPER BELT OBJECTS
// ============================================
const KuiperBelt = ({ count = null }) => {
  const meshRef = useRef();
  const objCount = count || SCALE.KUIPER_COUNT;

  const { offsets, speeds, radii, heights } = useMemo(() => {
    const o = [], s = [], r = [], h = [];
    for (let i = 0; i < objCount; i++) {
      o.push(Math.random() * Math.PI * 2);
      s.push(0.005 + Math.random() * 0.015);
      r.push(22 + Math.random() * 6);
      h.push((Math.random() - 0.5) * 2);
    }
    return { offsets: o, speeds: s, radii: r, heights: h };
  }, [objCount]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.05;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < objCount; i++) {
      const angle = offsets[i] + t * speeds[i];
      const radius = radii[i];
      dummy.position.set(
        Math.cos(angle) * radius,
        heights[i] + Math.sin(t * speeds[i] * 2) * 0.1,
        Math.sin(angle) * radius
      );
      const scale = 0.01 + Math.random() * 0.02;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(t * 0.1, t * 0.15, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, objCount]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#9090a0"
        roughness={0.95}
        metalness={0.05}
        flatShading
      />
    </instancedMesh>
  );
};

export default KuiperBelt;
