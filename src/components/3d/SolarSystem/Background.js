// ============================================
// SPACE BACKGROUND
// Starfield, Milky Way band, nebulae, constellations
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCALE, CONSTELLATIONS } from "./constants";

// ============================================
// STARFIELD (instanced points)
// ============================================
export const Starfield = ({ count = null }) => {
  const starCount = count || SCALE.STAR_COUNT;

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const sz = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribute on a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Star color variation
      const colorType = Math.random();
      if (colorType > 0.92) {
        // Blue-white (O/B type)
        col[i * 3] = 0.7; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 1.0;
      } else if (colorType > 0.82) {
        // Yellow (G type, like Sun)
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 0.8;
      } else if (colorType > 0.77) {
        // Orange (K type)
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 0.6;
      } else if (colorType > 0.74) {
        // Red (M type)
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.6; col[i * 3 + 2] = 0.5;
      } else {
        // White (A/F type)
        col[i * 3] = 0.95; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 1.0;
      }

      // Size variation (most small, few bright)
      const brightness = Math.random();
      sz[i] = brightness > 0.98 ? 0.4 : brightness > 0.9 ? 0.25 : brightness > 0.7 ? 0.15 : 0.08;
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [starCount]);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={starCount} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={starCount} itemSize={3} />
        <bufferAttribute attach="attributes-size" array={sizes} count={starCount} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
};

// ============================================
// NEBULA CLOUDS (volumetric-looking)
// ============================================
export const NebulaClouds = ({ count = null }) => {
  const nebulaCount = count || SCALE.NEBULA_COUNT;

  const nebulae = useMemo(() =>
    Array.from({ length: nebulaCount }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 30;
      const colors = [
        [0.4, 0.2, 0.8], // Purple
        [0.2, 0.4, 0.9], // Blue
        [0.8, 0.2, 0.4], // Pink
        [0.2, 0.7, 0.5], // Teal
        [0.9, 0.5, 0.2], // Orange
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return {
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ],
        scale: 3 + Math.random() * 8,
        color: new THREE.Color(color[0], color[1], color[2]),
        opacity: 0.03 + Math.random() * 0.04,
        rotation: Math.random() * Math.PI * 2,
      };
    }), [nebulaCount]);

  return (
    <group>
      {nebulae.map((n, i) => (
        <mesh key={i} position={n.position} rotation={[0, n.rotation, 0]}>
          <sphereGeometry args={[n.scale, 16, 16]} />
          <meshBasicMaterial
            color={n.color}
            transparent
            opacity={n.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================
// CONSTELLATION LINES
// ============================================
export const ConstellationLines = ({ visible = true }) => {
  if (!visible) return null;

  return (
    <group>
      {CONSTELLATIONS.map((constellation, ci) => (
        <group key={ci}>
          {/* Stars */}
          {constellation.stars.map((star, si) => (
            <mesh key={si} position={star}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}

          {/* Lines between stars */}
          {constellation.lines.map(([from, to], li) => {
            const start = constellation.stars[from];
            const end = constellation.stars[to];
            if (!start || !end) return null;

            const points = [
              new THREE.Vector3(...start),
              new THREE.Vector3(...end),
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            return (
              <line key={li} geometry={geometry}>
                <lineBasicMaterial
                  color="#4466aa"
                  transparent
                  opacity={0.2}
                  depthWrite={false}
                />
              </line>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// ============================================
// SHOOTING STARS
// ============================================
export const ShootingStars = ({ count = 5 }) => {
  const starsRef = useRef([]);

  const stars = useMemo(() =>
    Array.from({ length: count }, () => ({
      startPos: [
        (Math.random() - 0.5) * 60,
        20 + Math.random() * 30,
        (Math.random() - 0.5) * 60,
      ],
      velocity: [
        (Math.random() - 0.5) * 2,
        -(1 + Math.random() * 2),
        (Math.random() - 0.5) * 2,
      ],
      speed: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 20,
      duration: 1 + Math.random() * 2,
      length: 0.5 + Math.random() * 1.5,
    })), [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    starsRef.current.forEach((ref, i) => {
      if (!ref) return;
      const star = stars[i];
      const cycleTime = star.delay + star.duration + 5;
      const localT = ((t - star.delay) % cycleTime);

      if (localT > 0 && localT < star.duration) {
        const progress = localT / star.duration;
        ref.visible = true;
        ref.position.set(
          star.startPos[0] + star.velocity[0] * progress * star.speed * 20,
          star.startPos[1] + star.velocity[1] * progress * star.speed * 20,
          star.startPos[2] + star.velocity[2] * progress * star.speed * 20
        );
        ref.material.opacity = Math.sin(progress * Math.PI) * 0.8;
        ref.scale.set(star.length * (1 - progress * 0.5), 0.02, 0.02);
      } else {
        ref.visible = false;
      }
    });
  });

  return (
    <group>
      {stars.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { starsRef.current[i] = el; }}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================
// COMBINED BACKGROUND
// ============================================
const Background = ({ showConstellations = false }) => (
  <group>
    <Starfield />
    <NebulaClouds />
    <ShootingStars count={6} />
    <ConstellationLines visible={showConstellations} />
  </group>
);

export default Background;
