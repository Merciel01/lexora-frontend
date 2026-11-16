import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { serverMode, serverApi } from "../../services/api";
import {
  createDemoSession,
  getSession,
  saveSession,
  fromState,
} from "../../services/demo";
import { read } from "../../services/storage";
import { demoTransport } from "../../services/transport";
import {
  speakerLabels,
  type Snapshot,
  type TrialEvent,
} from "../../services/contracts";
import {
  ServerTrialTransport,
  type ConnectionState,
  type ProcessingUpdate,
  type Command,
} from "../../services/realtime";
export function useTrial(onEvent?: (event: TrialEvent) => void) {
  const { trialId = "demo" } = useParams();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [error, setError] = useState("");
  const [progress,setProgress]=useState<ProcessingUpdate>();
  const [firstTextMs,setFirstTextMs]=useState<number>();
  const [transcriptionMs,setTranscriptionMs]=useState<number>();
  const [responseMs,setResponseMs]=useState<number>();
  const requestStarted=useRef(0);
  const activeRequest=useRef<string|undefined>(undefined);
  const [cancelling,setCancelling]=useState(false);
  const firstReceived=useRef(false);
  const [busy, setBusy] = useState(false);
  const [processingSince, setProcessingSince] = useState<number>();
  const inFlight = useRef(false);
  const [audioFailed, setAudioFailed] = useState<{ blob: Blob; id: string }>();
  const [failed, setFailed] = useState<{ command: Command; id: string }>();
  const transport = useRef<ServerTrialTransport | undefined>(undefined);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const current = useRef(snapshot);
  current.current = snapshot;
  const alive = useRef(true);
  const localConnected = useRef(true);
  useEffect(() => {
    alive.current = true;
    setError("");
    if (!serverMode) {
      try {
        let s = getSession(trialId);
        if (!s && trialId === "demo")
          s = createDemoSession(
            read("role", "defense"),
            read("case", "limete"),
          );
        if (!s) throw new Error("Audience locale introuvable.");
        setSnapshot(s);
        setConnection("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Audience indisponible.");
        setConnection("terminal");
      }
      return () => {
        alive.current = false;
      };
    }
    const realtime = new ServerTrialTransport(
      trialId,
      () => serverApi.getTrial(trialId),
      {
        onProgress: update=>{
          if(!alive.current)return;
          setProgress(update);
          if(update.stage==='transcription_done')setTranscriptionMs(update.elapsedMs);
          if(update.text && !firstReceived.current){firstReceived.current=true;setFirstTextMs(Date.now()-requestStarted.current);}
          if(update.stage==='complete')setResponseMs(Date.now()-requestStarted.current);
        },
        onState: (s) => {
          if (alive.current) setConnection(s);
        },
        onSnapshot: (s) => {
          if (alive.current) setSnapshot(s);
        },
        onError: (s) => {
          if (alive.current) setError(s);
        },
        onEvent: (event) => {
          if (!alive.current) return;
          callback.current?.(event);
          setSnapshot((previous) => {
            if (!previous) return previous;
            if (event.type === "snapshot") return event.snapshot;
            if (event.type === "turn")
              return {
                ...previous,
                seq: event.seq,
                activeSpeaker: event.speaker,
                objection: event.objection,
                entries: [
                  ...previous.entries,
                  {
                    id: event.eventId,
                    speaker: speakerLabels[event.speaker],
                    text: event.text,
                    citations: event.citations,
                  },
                ].slice(-2000),
              };
            if (event.type === "phase_change")
              return {
                ...previous,
                seq: event.seq,
                step: event.step,
                allowedActions: event.allowedActions,
                endAt: event.endAt,
                objection: false,
              };
            if (event.type === "verdict")
              return {
                ...previous,
                seq: event.seq,
                step: 6,
                finished: true,
                allowedActions: [],
              };
            return previous;
          });
        },
      },
    );
    transport.current = realtime;
    void realtime.connect();
    return () => {
      alive.current = false;
      if(activeRequest.current)void serverApi.cancelGeneration(trialId,activeRequest.current).catch(()=>{});
      realtime.close();
      transport.current = undefined;
    };
  }, [trialId]);
  async function send(
    command: Command,
    id: string = crypto.randomUUID(),
  ): Promise<boolean> {
    if (inFlight.current || connection !== "ready" || !current.current)
      return false;
    inFlight.current = true;
    activeRequest.current=id;setCancelling(false);
    requestStarted.current=Date.now();firstReceived.current=false;setFirstTextMs(undefined);setResponseMs(undefined);setTranscriptionMs(undefined);setProgress(undefined);
    setBusy(true);
    setProcessingSince(Date.now());
    setError("");
    try {
      if (serverMode) await transport.current!.send(command, id);
      else {
        await new Promise((resolve) => setTimeout(resolve, 180));
        if (!localConnected.current || !alive.current)
          throw new Error(
            "Connexion démo interrompue. Votre message est conservé.",
          );
        const s = current.current!;
        const action =
          command.type === "user_text"
            ? { type: "text" as const, id, text: command.text }
            : command.type === "present_exhibit"
              ? { type: "exhibit" as const, id, exhibitId: command.exhibitId }
              : { type: "continue" as const, id };
        if (
          command.type === "present_exhibit" &&
          !s.allowedActions.includes("present_exhibit")
        )
          throw new Error("La cour n’autorise pas cette pièce maintenant.");
        const next = fromState(s, demoTransport.dispatch(s, action));
        saveSession(next);
        setSnapshot(next);
      }
      if (alive.current) setFailed(undefined);
      return true;
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : "Envoi impossible.");
        setFailed({ command, id });
      }
      return false;
    } finally {
      activeRequest.current=undefined;setCancelling(false);
      inFlight.current = false;
      if (alive.current) {setBusy(false);setProgress(undefined);}
    }
  }
  async function sendAudio(blob: Blob, id: string = crypto.randomUUID()) {
    if (!serverMode || inFlight.current || connection !== "ready") return;
    inFlight.current = true;
    activeRequest.current=id;setCancelling(false);
    requestStarted.current=Date.now();firstReceived.current=false;setFirstTextMs(undefined);setResponseMs(undefined);setTranscriptionMs(undefined);setProgress(undefined);
    setError("");
    try {
      setBusy(true);
      setProcessingSince(Date.now());
      await transport.current?.sendAudio(
        blob,
        id,
        current.current?.audioCodecs || [],
      );
      if (alive.current) setAudioFailed(undefined);
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : "Capture non envoyée.");
        setAudioFailed({ blob, id });
      }
    } finally {
      activeRequest.current=undefined;setCancelling(false);
      inFlight.current = false;
      if (alive.current) {setBusy(false);setProgress(undefined);}
    }
  }
  async function cancelGeneration(){
    if(!serverMode || !activeRequest.current)return;
    setCancelling(true);
    try{const result=await serverApi.cancelGeneration(trialId,activeRequest.current);if(!result.cancelled)setCancelling(false);}
    catch{if(alive.current){setError("Annulation non confirmée. Réessayez.");setCancelling(false);}}
  }
  function disconnect() {
    setError("Connexion démo interrompue. Votre brouillon est conservé.");
    localConnected.current = false;
    setConnection("reconnecting");
  }
  function reconnect() {
    setError("");
    if (serverMode) transport.current?.reconnect();
    else {
      localConnected.current = true;
      setConnection("ready");
    }
  }
  return {
    snapshot,
    cancelGeneration,cancelling,
    connection,
    error,
    busy,
    processingSince,
    progress,firstTextMs,responseMs,transcriptionMs,
    failed,
    send,
    sendAudio,
    audioFailed,
    retryAudio: () =>
      audioFailed
        ? sendAudio(audioFailed.blob, audioFailed.id)
        : Promise.resolve(),
    reconnect,
    disconnect,
    retry: () =>
      failed ? send(failed.command, failed.id) : Promise.resolve(false),
  };
}
