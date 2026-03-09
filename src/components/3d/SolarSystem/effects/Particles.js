// ============================================
// SOLAR WIND PARTICLES
// Particles emanating from the Sun
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SolarWindParticles = ({ count = 200 }) => {
  const pointsRef = useRef();

  const { positions, velocities, lifetimes, maxLifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = [];
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at sun surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Velocity outward from sun
      const speed = 0.02 + Math.random() * 0.04;
      vel.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      });

      life[i] = Math.random() * 5;
      maxLife[i] = 3 + Math.random() * 4;
    }

    return { positions: pos, velocities: vel, lifetimes: life, maxLifetimes: maxLife };
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < count; i++) {
      lifetimes[i] += delta;

      if (lifetimes[i] > maxLifetimes[i]) {
        // Reset particle
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.8;
        pos.array[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos.array[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos.array[i * 3 + 2] = r * Math.cos(phi);

        const speed = 0.02 + Math.random() * 0.04;
        velocities[i] = {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed,
          z: Math.cos(phi) * speed,
        };
        lifetimes[i] = 0;
      } else {
        pos.array[i * 3] += velocities[i].x;
        pos.array[i * 3 + 1] += velocities[i].y;
        pos.array[i * 3 + 2] += velocities[i].z;
      }
    }

    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffcc44"
        size={0.03}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// ============================================
// DUST PARTICLES (ambient space dust)
// ============================================
export const SpaceDust = ({ count = 500 }) => {
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.002;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#888899"
        size={0.02}
        transparent
        opacity={0.2}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

export default SolarWindParticles;
