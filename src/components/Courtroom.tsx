import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeakerId } from "../services/contracts";
import { isCourtroomEvent, type CourtroomState } from "./courtroomProtocol";

export default function Courtroom({
  activeSpeaker = "president",
  speaking = false,
  objection = false,
  reduced = false,
  quality = "auto",
  cameraMode = "wide",
  gesture = "neutral",
  emotion = "neutral",
  onUnavailable,
  onUseText,
}: {
  activeSpeaker?: SpeakerId;
  speaking?: boolean;
  objection?: boolean;
  reduced?: boolean;
  quality?: CourtroomState["quality"];
  cameraMode?: CourtroomState["cameraMode"];
  gesture?: string;
  emotion?: string;
  onUnavailable: (reason?: string) => void;
  onUseText: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const unavailable = useRef(onUnavailable);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [slow, setSlow] = useState(false);
  const state = useMemo<CourtroomState>(
    () => ({
      activeSpeaker,
      speaking,
      objection,
      reduced,
      quality,
      cameraMode,
      gesture,
      emotion,
    }),
    [
      activeSpeaker,
      speaking,
      objection,
      reduced,
      quality,
      cameraMode,
      gesture,
      emotion,
    ],
  );
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);
  useEffect(() => {
    // Allow slow first downloads; reset the inactivity timer only on real progress.
    let timeout = window.setTimeout(() => unavailable.current("Le chargement de la salle n’a pas progressé depuis deux minutes."), 120000);
    let progress = 0;
    const hint = window.setTimeout(() => setSlow(true), 15000);
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        !isCourtroomEvent(event.data)
      )
        return;
      const data = event.data;
      if (data.type === "progress") {
        if (data.loaded > progress) {
          progress = data.loaded;
          setLoaded(progress);
          window.clearTimeout(timeout);
          timeout = window.setTimeout(() => unavailable.current(), 120000);
        }
        return;
      }
      window.clearTimeout(timeout);
      window.clearTimeout(hint);
      if (data.type === "ready") setReady(true);
      else unavailable.current(typeof data.reason === 'string' ? data.reason.slice(0, 300) : undefined);
    };
    window.addEventListener("message", receive);
    frame.current?.contentWindow?.postMessage({channel: "lexora-courtroom", version: 1, type: "init"}, window.location.origin);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(hint);
      window.removeEventListener("message", receive);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      { channel: "lexora-courtroom", version: 1, type: "state", state },
      window.location.origin,
    );
  }, [state, ready]);
  return (
    <>
      <iframe
        ref={frame}
        className="courtroom-frame"
        title="Salle d’audience 3D Lexora"
        src={`${import.meta.env.BASE_URL}courtroom/index.html?embed=1`}
        onLoad={() => frame.current?.contentWindow?.postMessage({channel: "lexora-courtroom", version: 1, type: "init"}, window.location.origin)}
        onError={() => unavailable.current()}
        aria-label="Salle d’audience interactive : glisser pour tourner, molette pour zoomer"
      />
      {!ready && (
        <div className="courtroom-loading">
          <div>
            <strong>Préparation de la salle</strong>
            <p role="status">Chargement de la salle : {loaded} / 10 éléments</p>
            <progress
              aria-label="Chargement de la salle"
              value={loaded}
              max={10}
            />
            <p>
              {slow
                ? "Le premier chargement peut prendre du temps sur une connexion lente."
                : "Les personnages et le décor se chargent sur votre appareil."}
            </p>
            <button className="button secondary" onClick={onUseText}>
              Continuer en mode texte
            </button>
          </div>
        </div>
      )}
    </>
  );
}
