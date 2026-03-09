// ============================================
// LENS FLARE EFFECT
// Screen-space lens flare from the Sun
// ============================================
import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const LensFlare = ({ sunPosition = [0, 0, 0], intensity = 1 }) => {
  const groupRef = useRef();
  const { camera } = useThree();

  const flareElements = useMemo(() => [
    { offset: 0.2, size: 0.8, color: "#ffaa44", opacity: 0.15 },
    { offset: 0.35, size: 0.4, color: "#ff8844", opacity: 0.1 },
    { offset: 0.5, size: 0.6, color: "#ffcc66", opacity: 0.08 },
    { offset: 0.65, size: 0.3, color: "#88aaff", opacity: 0.06 },
    { offset: 0.8, size: 0.5, color: "#ff6644", opacity: 0.05 },
    { offset: 1.0, size: 1.0, color: "#ffdd88", opacity: 0.04 },
    { offset: 1.3, size: 0.7, color: "#aaccff", opacity: 0.03 },
  ], []);

  useFrame(() => {
    if (!groupRef.current) return;

    const sunVec = new THREE.Vector3(...sunPosition);
    const screenPos = sunVec.clone().project(camera);

    // Check if sun is in front of camera
    const isBehind = screenPos.z > 1;
    groupRef.current.visible = !isBehind;

    if (isBehind) return;

    // Flare line from sun through screen center
    const centerX = 0;
    const centerY = 0;
    const dirX = centerX - screenPos.x;
    const dirY = centerY - screenPos.y;

    // Distance from center affects intensity
    const distFromCenter = Math.sqrt(dirX * dirX + dirY * dirY);
    const fadeIntensity = Math.max(0, 1 - distFromCenter * 0.5) * intensity;

    groupRef.current.children.forEach((child, i) => {
      const element = flareElements[i];
      if (!element) return;

      const fx = screenPos.x + dirX * element.offset;
      const fy = screenPos.y + dirY * element.offset;

      child.position.set(fx * 10, fy * 10, -5);
      child.material.opacity = element.opacity * fadeIntensity;
      child.scale.setScalar(element.size * (1 + distFromCenter * 0.3));
    });
  });

  return (
    <group ref={groupRef}>
      {flareElements.map((el, i) => (
        <mesh key={i}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={el.color}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export default LensFlare;
