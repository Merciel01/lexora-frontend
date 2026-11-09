import type { Snapshot } from "../../services/contracts";
import type { ConnectionState } from "../../services/realtime";
export type RuntimeStage =
  | "initializing"
  | "connecting"
  | "ready"
  | "agent-speaking"
  | "student-turn"
  | "recording"
  | "sending"
  | "waiting"
  | "objection"
  | "deliberating"
  | "finished"
  | "reconnecting"
  | "terminal";
export function stage(
  snapshot: Snapshot | undefined,
  connection: ConnectionState,
  recording = false,
  sending = false,
  speaking = false,
): RuntimeStage {
  if (connection === "terminal") return "terminal";
  if (connection === "reconnecting" || connection === "resyncing")
    return "reconnecting";
  if (!snapshot)
    return connection === "connecting" ? "connecting" : "initializing";
  if (snapshot.finished) return "finished";
  if (recording) return "recording";
  if (sending) return "sending";
  if (snapshot.objection) return "objection";
  if (snapshot.step === 5) return "deliberating";
  if (speaking) return "agent-speaking";
  if (snapshot.allowedActions.includes("user_text")) return "student-turn";
  return snapshot.allowedActions.length ? "ready" : "waiting";
}
export const stageLabels: Record<RuntimeStage, string> = {
  initializing: "Initialisation",
  connecting: "Connexion",
  ready: "Prêt",
  "agent-speaking": "La cour prend la parole",
  "student-turn": "À vous de parler",
  recording: "Capture du microphone",
  sending: "Envoi — attente d’acceptation",
  waiting: "Attente de la cour",
  objection: "Objection — décision attendue",
  deliberating: "La cour délibère",
  finished: "Audience terminée",
  reconnecting: "Resynchronisation",
  terminal: "Audience indisponible",
};
export function displayedTime(
  startedAt: string,
  endAt: string | undefined,
  now: number,
) {
  const target = Date.parse(endAt || startedAt);
  const ms = Number.isFinite(target)
    ? Math.max(0, endAt ? target - now : now - target)
    : 0;
  return {
    label: endAt ? "Temps restant" : "Temps écoulé",
    value:
      Math.floor(ms / 60000)
        .toString()
        .padStart(2, "0") +
      ":" +
      Math.floor((ms / 1000) % 60)
        .toString()
        .padStart(2, "0"),
  };
}
