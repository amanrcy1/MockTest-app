// ============================================
// COMET with ion tail + dust tail
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const Comet = ({ orbitRadius = 16, speed = 0.15, eccentricity = 0.7, inclination = 25, startAngle = 0 }) => {
  const groupRef = useRef();
  const ionTailRef = useRef();
  const dustTailRef = useRef();
  const nucleusRef = useRef();

  const incRad = (inclination * Math.PI) / 180;

  // Ion tail particles (straight, blue)
  const ionPositions = useMemo(() => {
    const arr = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      arr[i * 3] = 0;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, []);

  // Dust tail particles (curved, yellow)
  const dustPositions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      arr[i * 3] = 0;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, []);

  const ionColors = useMemo(() => {
    const arr = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const t = i / 150;
      arr[i * 3] = 0.3 + t * 0.2;
      arr[i * 3 + 1] = 0.5 + t * 0.3;
      arr[i * 3 + 2] = 1.0;
    }
    return arr;
  }, []);

  const dustColors = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      const t = i / 120;
      arr[i * 3] = 1.0;
      arr[i * 3 + 1] = 0.8 - t * 0.3;
      arr[i * 3 + 2] = 0.3 - t * 0.2;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + startAngle;

    // Elliptical orbit
    const r = (orbitRadius * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(t));
    const x = r * Math.cos(t);
    const yOrbit = r * Math.sin(t);
    const y = yOrbit * Math.cos(incRad);
    const z = yOrbit * Math.sin(incRad);

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
    }

    // Nucleus rotation
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += 0.02;
    }

    // Direction away from sun (for tail)
    const dist = Math.sqrt(x * x + y * y + z * z);
    const dirX = x / dist;
    const dirY = y / dist;
    const dirZ = z / dist;

    // Tail length varies with distance to sun (closer = longer)
    const tailLength = Math.max(0.5, 3 / (dist * 0.3));

    // Update ion tail (straight away from sun)
    if (ionTailRef.current) {
      const pos = ionTailRef.current.geometry.attributes.position;
      for (let i = 0; i < 150; i++) {
        const frac = i / 150;
        const spread = frac * 0.1;
        pos.array[i * 3] = dirX * frac * tailLength + (Math.random() - 0.5) * spread;
        pos.array[i * 3 + 1] = dirY * frac * tailLength + (Math.random() - 0.5) * spread;
        pos.array[i * 3 + 2] = dirZ * frac * tailLength + (Math.random() - 0.5) * spread;
      }
      pos.needsUpdate = true;
    }

    // Update dust tail (curved, wider)
    if (dustTailRef.current) {
      const pos = dustTailRef.current.geometry.attributes.position;
      // Orbital velocity direction (perpendicular to radial)
      const velX = -Math.sin(t);
      const velZ = Math.cos(t);
      for (let i = 0; i < 120; i++) {
        const frac = i / 120;
        const curve = frac * frac * 0.5;
        const spread = frac * 0.2;
        pos.array[i * 3] = dirX * frac * tailLength * 0.8 - velX * curve + (Math.random() - 0.5) * spread;
        pos.array[i * 3 + 1] = dirY * frac * tailLength * 0.8 + (Math.random() - 0.5) * spread;
        pos.array[i * 3 + 2] = dirZ * frac * tailLength * 0.8 - velZ * curve + (Math.random() - 0.5) * spread;
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Nucleus */}
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#aaa8a0" roughness={0.9} />
      </mesh>

      {/* Coma (gas cloud around nucleus) */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial
          color="#aaddff"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ion tail (blue, straight) */}
      <points ref={ionTailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={ionPositions} count={150} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={ionColors} count={150} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Dust tail (yellow, curved) */}
      <points ref={dustTailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={dustPositions} count={120} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={dustColors} count={120} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          vertexColors
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

export default Comet;
