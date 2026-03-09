// ============================================
// CAMERA SYSTEM
// Fly-to, orbit mode, scroll zoom, keyboard controls
// ============================================
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_PRESETS, PLANET_SIZES } from "./constants";
import { lerpPosition } from "./physics";

const CameraSystem = ({
  target = null,           // Planet name to focus on, or null for free camera
  targetPosition = null,   // [x,y,z] of the target planet
  mode = "orbit",          // "orbit" | "flyTo" | "free"
  onArrived,               // Callback when fly-to completes
  speed = 1,
}) => {
  const { camera, gl } = useThree();
  const orbitAngle = useRef(0);
  const orbitElevation = useRef(0.3);
  const orbitDistance = useRef(30);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const flyProgress = useRef(0);
  const flyFrom = useRef(null);
  const flyTo = useRef(null);
  const flyLookAt = useRef(null);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Start fly-to animation
  useEffect(() => {
    if (target && targetPosition && mode === "flyTo") {
      const planetSize = PLANET_SIZES[target] || 0.5;
      const viewDist = planetSize * 4 + 1;

      flyFrom.current = [camera.position.x, camera.position.y, camera.position.z];
      flyTo.current = [
        targetPosition[0] + viewDist * 0.7,
        targetPosition[1] + viewDist * 0.4,
        targetPosition[2] + viewDist * 0.7,
      ];
      flyLookAt.current = targetPosition;
      flyProgress.current = 0;
    }
  }, [target, targetPosition, mode, camera]);

  // Mouse/touch controls for orbit mode
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      orbitAngle.current -= dx * 0.005;
      orbitElevation.current = Math.max(-1.2, Math.min(1.2, orbitElevation.current + dy * 0.005));
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e) => {
      orbitDistance.current = Math.max(3, Math.min(60, orbitDistance.current + e.deltaY * 0.02));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      const step = 0.05;
      switch (e.key) {
        case "ArrowLeft": orbitAngle.current -= step; break;
        case "ArrowRight": orbitAngle.current += step; break;
        case "ArrowUp": orbitElevation.current = Math.min(1.2, orbitElevation.current + step); break;
        case "ArrowDown": orbitElevation.current = Math.max(-1.2, orbitElevation.current - step); break;
        case "+": case "=": orbitDistance.current = Math.max(3, orbitDistance.current - 1); break;
        case "-": orbitDistance.current = Math.min(60, orbitDistance.current + 1); break;
        default: break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useFrame((_, delta) => {
    if (mode === "flyTo" && flyFrom.current && flyTo.current) {
      // Animate fly-to
      flyProgress.current = Math.min(1, flyProgress.current + delta * 0.8);
      const pos = lerpPosition(flyFrom.current, flyTo.current, flyProgress.current);
      camera.position.set(pos[0], pos[1], pos[2]);

      if (flyLookAt.current) {
        const lookTarget = lerpPosition(
          [currentLookAt.current.x, currentLookAt.current.y, currentLookAt.current.z],
          flyLookAt.current,
          flyProgress.current
        );
        currentLookAt.current.set(lookTarget[0], lookTarget[1], lookTarget[2]);
        camera.lookAt(currentLookAt.current);
      }

      if (flyProgress.current >= 1) {
        onArrived?.();
      }
    } else if (mode === "orbit") {
      // Orbit camera
      const center = targetPosition || [0, 0, 0];
      const dist = orbitDistance.current;
      const elev = orbitElevation.current;
      const angle = orbitAngle.current;

      // Auto-rotate slowly when not dragging
      if (!isDragging.current) {
        orbitAngle.current += delta * 0.03 * speed;
      }

      const x = center[0] + dist * Math.cos(elev) * Math.sin(angle);
      const y = center[1] + dist * Math.sin(elev);
      const z = center[2] + dist * Math.cos(elev) * Math.cos(angle);

      // Smooth camera movement
      camera.position.lerp(new THREE.Vector3(x, y, z), 0.05);

      currentLookAt.current.lerp(new THREE.Vector3(center[0], center[1], center[2]), 0.05);
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
};

export default CameraSystem;

// ============================================
// PRESET CAMERA POSITIONS
// ============================================
export const useCameraPreset = (presetName) => {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return null;
  return {
    position: preset.position,
    lookAt: preset.lookAt,
    fov: preset.fov,
  };
};
