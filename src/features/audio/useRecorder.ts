import { useEffect, useRef, useState } from "react";
export function chooseMime(
  supported: (mime: string) => boolean,
  accepted = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"],
) {
  return accepted.find(supported);
}
export function useRecorder(
  onAudio: (blob: Blob) => void,
  accepted?: string[],
) {
  const [status, setStatus] = useState("Microphone arrêté");
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [localBlob, setLocalBlob] = useState<Blob>();
  const media = useRef<MediaStream | undefined>(undefined);
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const context = useRef<AudioContext | undefined>(undefined);
  const raf = useRef(0);
  const generation = useRef(0);
  const wanted = useRef(false);
  const alive = useRef(true);
  const callback = useRef(onAudio);
  callback.current = onAudio;
  function release() {
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = undefined;
    cancelAnimationFrame(raf.current);
    if (context.current && context.current.state !== "closed")
      void context.current.close();
    context.current = undefined;
  }
  function stop(discard = false) {
    wanted.current = false;
    generation.current++;
    const r = recorder.current;
    if (r && r.state !== "inactive") {
      if (discard) r.onstop = null;
      r.stop();
    }
    recorder.current = undefined;
    release();
    if (alive.current) {
      setRecording(false);
      setLevel(0);
      setStatus(
        discard ? "Capture annulée. Aucun envoi." : "Microphone arrêté",
      );
    }
  }
  async function start() {
    if (wanted.current) return;
    wanted.current = true;
    const request = ++generation.current;
    setLocalBlob(undefined);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Ce navigateur ne permet pas la capture. Poursuivez par écrit.",
        );
      const mime = chooseMime(
        (m) => MediaRecorder.isTypeSupported(m),
        accepted,
      );
      if (!mime)
        throw new Error("Aucun codec audio compatible. Poursuivez par écrit.");
      setStatus("Autorisation du microphone…");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
      });
      if (!wanted.current || request !== generation.current || !alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      media.current = stream;
      const r = new MediaRecorder(stream, { mimeType: mime });
      recorder.current = r;
      const chunks: Blob[] = [];
      let bytes = 0;
      r.ondataavailable = (e) => {
        bytes += e.data.size;
        if (bytes > 8 * 1024 * 1024) {
          stop(true);
          setStatus(
            "Capture trop longue. Recommencez avec une intervention plus courte.",
          );
          return;
        }
        if (e.data.size) chunks.push(e.data);
      };
      r.onerror = () => {
        stop(true);
        setStatus("La capture a échoué. Poursuivez par écrit.");
      };
      r.onstop = () => {
        if (!alive.current) return;
        const blob = new Blob(chunks, { type: r.mimeType });
        if (blob.size) {
          setLocalBlob(blob);
          callback.current(blob);
        }
        release();
      };
      const ac = new AudioContext();
      context.current = ac;
      const analyser = ac.createAnalyser();
      ac.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        setLevel(
          Math.min(
            100,
            Math.sqrt(
              data.reduce((s, v) => s + (v - 128) ** 2, 0) / data.length,
            ) * 5,
          ),
        );
        raf.current = requestAnimationFrame(tick);
      };
      r.start(250);
      tick();
      setRecording(true);
      setStatus("Enregistrement local en cours");
    } catch (error) {
      wanted.current = false;
      release();
      if (!alive.current) return;
      setRecording(false);
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Autorisation refusée. Poursuivez par écrit."
          : error instanceof DOMException && error.name === "NotFoundError"
            ? "Aucun microphone détecté."
            : error instanceof DOMException && error.name === "NotReadableError"
              ? "Microphone occupé."
              : error instanceof Error
                ? error.message
                : "Microphone indisponible.",
      );
    }
  }
  useEffect(() => {
    alive.current = true;
    const blur = () => stop(true);
    window.addEventListener("blur", blur);
    const hidden = () => {
      if (document.hidden) stop(true);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      alive.current = false;
      stop(true);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const timeout = setTimeout(() => stop(), 60000);
    return () => clearTimeout(timeout);
  }, [recording]);
  return { status, recording, level, localBlob, start, stop };
}
