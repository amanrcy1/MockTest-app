// ============================================
// SUN COMPONENT
// Animated corona, flares, volumetric glow
// ============================================
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCALE } from "./constants";
import { getTexture, createSunTexture } from "./textures";

// ============================================
// CORONA SHADER
// ============================================
const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragmentShader = `
  uniform float time;
  uniform vec3 coronaColor;
  uniform vec3 coronaEdge;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simple noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float rim = 1.0 - max(0.0, dot(vNormal, normalize(-vPosition)));
    rim = pow(rim, 1.8);

    // Animated noise for corona flicker
    vec2 noiseCoord = vUv * 4.0 + vec2(time * 0.05, time * 0.03);
    float n = fbm(noiseCoord);
    float flicker = 0.7 + n * 0.6;

    // Prominence-like extensions
    float prominence = fbm(vUv * 8.0 + vec2(time * 0.02, 0.0));
    prominence = smoothstep(0.5, 0.8, prominence) * 0.3;

    vec3 color = mix(coronaColor, coronaEdge, rim);
    float alpha = rim * flicker * 0.6 + prominence * rim;
    alpha = clamp(alpha, 0.0, 0.8);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ============================================
// SOLAR FLARE
// ============================================
const SolarFlare = ({ angle, size, speed }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    const scale = 0.5 + Math.sin(t) * 0.5;
    ref.current.scale.set(scale * size, scale * size * 2, 1);
    ref.current.material.opacity = scale * 0.4;
  });

  return (
    <mesh ref={ref} rotation={[0, 0, angle]} position={[0, 0, 0]}>
      <planeGeometry args={[0.3, 1]} />
      <meshBasicMaterial
        color="#ffaa00"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ============================================
// MAIN SUN COMPONENT
// ============================================
const Sun = ({ onClick, isHovered: _isHovered, onPointerOver, onPointerOut }) => {
  const sunRef = useRef();
  const coronaRef = useRef();
  const glowRef = useRef();
  const radius = SCALE.SUN_RADIUS;

  const sunTexture = useMemo(() => getTexture("sun", createSunTexture, 512), []);

  const coronaUniforms = useMemo(() => ({
    time: { value: 0 },
    coronaColor: { value: new THREE.Color("#ffcc44") },
    coronaEdge: { value: new THREE.Color("#ff6600") },
  }), []);

  // Flare positions
  const flares = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2 + Math.random() * 0.5,
      size: 0.8 + Math.random() * 0.6,
      speed: 0.3 + Math.random() * 0.4,
    })), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Rotate sun surface
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.001;
    }

    // Animate corona
    if (coronaRef.current) {
      coronaRef.current.material.uniforms.time.value = t;
    }

    // Pulsing glow
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 0.5) * 0.05;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Sun body */}
      <mesh
        ref={sunRef}
        onClick={(e) => { e.stopPropagation(); onClick?.("Sun"); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.("Sun"); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.("Sun"); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial map={sunTexture} />
      </mesh>

      {/* Corona (atmosphere) */}
      <mesh ref={coronaRef} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          uniforms={coronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 1.5, 32, 32]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light from sun */}
      <pointLight
        color="#fff5e0"
        intensity={3}
        distance={60}
        decay={1.5}
      />

      {/* Secondary warm light */}
      <pointLight
        color="#ffaa44"
        intensity={1}
        distance={30}
        decay={2}
      />

      {/* Solar flares */}
      {flares.map((f, i) => (
        <SolarFlare key={i} {...f} />
      ))}
    </group>
  );
};

export default Sun;
