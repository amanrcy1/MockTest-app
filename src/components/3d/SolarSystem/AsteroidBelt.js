// ============================================
// ASTEROID BELT (between Mars and Jupiter)
// Instanced mesh for performance
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCALE } from "./constants";

const AsteroidBelt = ({ innerRadius = 10.2, outerRadius = 11.5, count = null }) => {
  const meshRef = useRef();
  const asteroidCount = count || SCALE.ASTEROID_COUNT;

  const { matrices, speeds, offsets } = useMemo(() => {
    const m = [];
    const s = [];
    const o = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const heightOffset = (Math.random() - 0.5) * 0.6;
      const scale = 0.01 + Math.random() * 0.04;

      dummy.position.set(
        Math.cos(angle) * radius,
        heightOffset,
        Math.sin(angle) * radius
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      m.push(dummy.matrix.clone());
      s.push(0.02 + Math.random() * 0.05); // orbital speed
      o.push(angle); // starting angle offset
    }

    return { matrices: m, speeds: s, offsets: o };
  }, [asteroidCount, innerRadius, outerRadius]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.1;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < asteroidCount; i++) {
      const angle = offsets[i] + t * speeds[i];
      const origMatrix = matrices[i];
      const origPos = new THREE.Vector3();
      const origQuat = new THREE.Quaternion();
      const origScale = new THREE.Vector3();
      origMatrix.decompose(origPos, origQuat, origScale);

      const radius = Math.sqrt(origPos.x * origPos.x + origPos.z * origPos.z);
      dummy.position.set(
        Math.cos(angle) * radius,
        origPos.y + Math.sin(t * speeds[i] * 3) * 0.02,
        Math.sin(angle) * radius
      );
      dummy.quaternion.copy(origQuat);
      dummy.rotation.y += t * speeds[i] * 2;
      dummy.scale.copy(origScale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, asteroidCount]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#8a8070"
        roughness={0.95}
        metalness={0.1}
        flatShading
      />
    </instancedMesh>
  );
};

export default AsteroidBelt;
