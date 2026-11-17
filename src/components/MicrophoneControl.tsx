import { Mic } from "lucide-react";

export function MicrophoneControl({ recording, allowed, mode, start, stop }: {
  recording: boolean; allowed: boolean; mode: "hold" | "toggle";
  start: () => Promise<void>; stop: (discard?: boolean) => void;
}) {
  return <button className={"button " + (recording ? "recording" : "secondary")}
    disabled={!allowed && !recording} aria-pressed={recording}
    onPointerDown={e => { if (mode === "hold") { e.currentTarget.setPointerCapture(e.pointerId); void start(); } }}
    onPointerUp={() => { if (mode === "hold") stop(); }}
    onPointerCancel={() => stop(true)}
    onLostPointerCapture={() => { if (recording && mode === "hold") stop(); }}
    onKeyDown={e => { if (mode === "hold" && e.code === "Space" && !e.repeat) { e.preventDefault(); void start(); } }}
    onKeyUp={e => { if (mode === "hold" && e.code === "Space") { e.preventDefault(); stop(); } }}
    onClick={() => { if (mode === "toggle") { if (recording) stop(); else void start(); } }}>
    <Mic size={17} />{mode === "hold" ? "Maintenir pour parler" : recording ? "Arrêter la capture" : "Démarrer la capture"}
  </button>;
}
