import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeakerId } from "../services/contracts";
import { isCourtroomEvent, type CourtroomState } from "./courtroomProtocol";
export default function Courtroom({ activeSpeaker = "president", speaking = false, objection = false, reduced = false, quality = "auto", cameraMode = "wide", gesture = "neutral", emotion = "neutral", onUnavailable = () => {} }: {
  activeSpeaker?: SpeakerId; speaking?: boolean; objection?: boolean; reduced?: boolean;
  quality?: "auto" | "low" | "high"; cameraMode?: "wide" | "speaker";
  gesture?: string; emotion?: string; onUnavailable?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const unavailable = useRef(onUnavailable);
  const [ready, setReady] = useState(false);
  const state = useMemo<CourtroomState>(() => ({ activeSpeaker, speaking, objection, reduced, quality, cameraMode, gesture, emotion }), [activeSpeaker, speaking, objection, reduced, quality, cameraMode, gesture, emotion]);
  useEffect(() => { unavailable.current = onUnavailable; }, [onUnavailable]);
  useEffect(() => {
    const timeout = window.setTimeout(() => unavailable.current(), 45000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || !isCourtroomEvent(event.data)) return;
      window.clearTimeout(timeout);
      if (event.data.type === "ready") setReady(true); else unavailable.current();
    };
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timeout); window.removeEventListener("message", receive); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage({ channel: "lexora-courtroom", version: 1, type: "state", state }, window.location.origin);
  }, [state, ready]);
  return <>
    <iframe ref={frame} className="courtroom-frame" title="Salle d’audience 3D Lexora" src={`${import.meta.env.BASE_URL}courtroom/index.html?embed=1`} onError={() => unavailable.current()} aria-label="Salle d’audience interactive : glisser pour tourner, molette pour zoomer" />
    {!ready && <div className="courtroom-loading" role="status">Chargement des neuf personnages… Le mode texte reste accessible.</div>}
  </>;
}
