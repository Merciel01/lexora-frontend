import { useEffect, useRef, useState } from "react";
export function useMicrophone() {
  const [status, setStatus] = useState("Microphone désactivé");
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const pending = useRef(false);
  const mounted = useRef(true);
  function release() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cancelAnimationFrame(frame.current);
    const audio = context.current;
    context.current = null;
    if (audio && audio.state !== "closed") void audio.close();
  }
  function stop() {
    generation.current++;
    pending.current = false;
    release();
    setActive(false);
    setLevel(0);
    setStatus("Microphone désactivé");
  }
  async function start() {
    if (stream.current || pending.current) return;
    const request = ++generation.current;
    pending.current = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      setStatus("Autorisation demandée…");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || generation.current !== request) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const audio = new AudioContext();
      context.current = audio;
      const analyser = audio.createAnalyser();
      audio.createMediaStreamSource(media).connect(analyser);
      setActive(true);
      setStatus(media.getAudioTracks()[0]?.label || "Microphone actif");
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        setLevel(
          Math.min(
            100,
            Math.sqrt(
              data.reduce((sum, v) => sum + (v - 128) ** 2, 0) / data.length,
            ) * 5,
          ),
        );
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      if (generation.current !== request || !mounted.current) return;
      release();
      setActive(false);
      setLevel(0);
      const name = error instanceof Error ? error.name : "";
      setStatus(
        name === "NotAllowedError"
          ? "Autorisation refusée. Vous pouvez poursuivre par écrit."
          : name === "NotFoundError"
            ? "Aucun microphone détecté."
            : name === "NotReadableError"
              ? "Microphone occupé par une autre application."
              : "Microphone indisponible. Le mode texte reste accessible.",
      );
    } finally {
      if (generation.current === request) pending.current = false;
    }
  }
  useEffect(() => {
    mounted.current = true;
    const blur = () => stop();
    window.addEventListener("blur", blur);
    return () => {
      mounted.current = false;
      generation.current++;
      pending.current = false;
      window.removeEventListener("blur", blur);
      release();
    };
  }, []);
  return { status, active, level, start, stop };
}
