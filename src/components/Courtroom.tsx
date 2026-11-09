import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, type Group, type Mesh } from "three";
import type { SpeakerId } from "../services/contracts";
const positions: Record<SpeakerId, [number, number, number]> = {
  president: [0, 0.6, -1.9],
  "assessor-1": [-2, 0.6, -1.9],
  "assessor-2": [2, 0.6, -1.9],
  prosecutor: [-3, 0, 1],
  opposition: [3, 0, 1],
  clerk: [4.2, 0, -0.2],
  student: [0, 0, 3.4],
};
function Person({
  id,
  activeSpeaker,
  speaking,
  reduced,
  objection,
  gesture,
  emotion,
}: {
  id: SpeakerId;
  activeSpeaker: SpeakerId;
  speaking: boolean;
  reduced: boolean;
  objection: boolean;
  gesture: string;
  emotion: string;
}) {
  const group = useRef<Group>(null);
  const head = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const mouth = useRef<Mesh>(null);
  const active = id === activeSpeaker;
  const point = ["point", "explain", "raise"].includes(gesture);
  const severe = ["severe", "firm"].includes(emotion);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (group.current)
      group.current.position.y =
        positions[id][1] +
        (reduced ? 0 : Math.sin(t * 1.2 + positions[id][0]) * 0.012);
    if (head.current) {
      const target = positions[activeSpeaker],
        own = positions[id];
      const rotation = !active
        ? Math.atan2(target[0] - own[0], target[2] - own[2])
        : 0;
      head.current.rotation.y +=
        (Math.max(-0.6, Math.min(0.6, rotation)) - head.current.rotation.y) *
        Math.min(1, dt * 3);
    }
    if (arm.current) {
      const raised = active && objection;
      const angle = raised
        ? -2.5
        : active && speaking && point
          ? -0.85
          : active && speaking && !reduced
            ? Math.sin(t * 3) * 0.18
            : 0;
      arm.current.rotation.z +=
        (angle - arm.current.rotation.z) * Math.min(1, dt * 6);
    }
    if (mouth.current)
      mouth.current.scale.y =
        active && speaking && !reduced
          ? 0.4 + Math.abs(Math.sin(t * 9)) * 0.9
          : 0.3;
  });
  return (
    <group
      ref={group}
      position={positions[id]}
      rotation={[0, id === "student" ? Math.PI : 0, 0]}
      name={id}
    >
      <group ref={head} position={[0, 1.25, 0]}>
        <mesh>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshStandardMaterial
            color={severe && active ? "#bd995d" : "#c8a66a"}
          />
        </mesh>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} position={[x, 0.035, 0.195]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color="#192b3c" />
          </mesh>
        ))}
        <mesh ref={mouth} position={[0, -0.085, 0.205]}>
          <boxGeometry args={[0.07, 0.05, 0.015]} />
          <meshStandardMaterial color="#795844" />
        </mesh>
      </group>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.8, 12]} />
        <meshStandardMaterial color={active ? "#203b4c" : "#101f30"} />
      </mesh>
      <mesh position={[0, 0.9, 0.29]}>
        <boxGeometry args={[0.12, 0.38, 0.025]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <group ref={arm} position={[0.28, 1.02, 0]}>
        <mesh position={[0.06, -0.3, 0]}>
          <capsuleGeometry args={[0.075, 0.4, 3, 8]} />
          <meshStandardMaterial color="#192b3c" />
        </mesh>
      </group>
      <mesh position={[-0.32, 0.7, 0]}>
        <capsuleGeometry args={[0.075, 0.4, 3, 8]} />
        <meshStandardMaterial color="#192b3c" />
      </mesh>
    </group>
  );
}
function Box({
  position,
  size,
  color = "#795844",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Camera({
  speaker,
  mode,
  reduced,
  onUnavailable,
}: {
  speaker: SpeakerId;
  mode: "wide" | "speaker";
  reduced: boolean;
  onUnavailable: () => void;
}) {
  const { camera, size, gl } = useThree();
  const destination = useRef(new Vector3());
  const target = useRef(new Vector3());
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useFrame(({ clock }, dt) => {
    const small = size.width / size.height < 1.4;
    const p = positions[speaker];
    if (mode === "speaker") {
      destination.current.set(p[0] * 0.65, 3.7, p[2] + (small ? 7.5 : 5.5));
      target.current.set(p[0], p[1] + 0.9, p[2]);
    } else {
      destination.current.set(
        reduced ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.08,
        small ? 5.5 : 4.4,
        small ? 12.8 : 8.8,
      );
      target.current.set(0, 1, 0);
    }
    camera.position.lerp(
      destination.current,
      reduced ? 1 : Math.min(1, dt * 2),
    );
    camera.lookAt(target.current);
  });
  return null;
}
export default function Courtroom({
  activeSpeaker = "president",
  speaking = false,
  objection = false,
  reduced = false,
  quality = "auto",
  cameraMode = "wide",
  gesture = "neutral",
  emotion = "neutral",
  onUnavailable = () => {},
}: {
  activeSpeaker?: SpeakerId;
  speaking?: boolean;
  objection?: boolean;
  reduced?: boolean;
  quality?: "auto" | "low" | "high";
  cameraMode?: "wide" | "speaker";
  gesture?: string;
  emotion?: string;
  onUnavailable?: () => void;
}) {
  const dpr =
    quality === "low"
      ? 1
      : quality === "high"
        ? 1.5
        : Math.min(1.25, window.devicePixelRatio || 1);
  return (
    <Canvas
      camera={{ position: [0, 4.4, 8.8], fov: 44 }}
      dpr={dpr}
      gl={{ antialias: quality !== "low", powerPreference: "low-power" }}
      fallback={
        <p className="scene-fallback">
          WebGL est indisponible. Utilisez le mode texte.
        </p>
      }
      onCreated={({ camera, size }) => {
        if (size.width / size.height < 1.4) camera.position.set(0, 5.5, 12.8);
        camera.lookAt(0, 1, 0);
      }}
    >
      <color attach="background" args={["#101f30"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 7, 5]} intensity={2} />
      <Camera
        speaker={activeSpeaker}
        mode={cameraMode}
        reduced={reduced}
        onUnavailable={onUnavailable}
      />
      <Box position={[0, -0.1, 0]} size={[12, 0.2, 12]} color="#263849" />
      <Box position={[0, 1.7, -3]} size={[10, 4, 0.3]} color="#192b3c" />
      {[-4, -2, 0, 2, 4].map((x) => (
        <Box key={x} position={[x, 1.7, -2.8]} size={[0.18, 3.6, 0.15]} />
      ))}
      <Box position={[0, 0.3, -1.8]} size={[7, 0.6, 2]} />
      <Box position={[0, 1, -1]} size={[7, 0.8, 0.45]} />
      {(Object.keys(positions) as SpeakerId[]).map((id) => (
        <Person
          key={id}
          id={id}
          activeSpeaker={activeSpeaker}
          speaking={speaking}
          objection={objection}
          reduced={reduced}
          gesture={gesture}
          emotion={emotion}
        />
      ))}
      <Box position={[-3, 0.65, 1.4]} size={[1.8, 0.2, 0.8]} />
      <Box position={[3, 0.65, 1.4]} size={[1.8, 0.2, 0.8]} />
      <Box position={[4.2, 0.6, 0.1]} size={[1, 0.2, 0.7]} />
    </Canvas>
  );
}
