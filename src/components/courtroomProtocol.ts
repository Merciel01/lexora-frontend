import type { SpeakerId } from "../services/contracts";
export interface CourtroomState {
  activeSpeaker: SpeakerId;
  speaking: boolean;
  mouthLevel?: number;
  objection: boolean;
  reduced: boolean;
  quality: "auto" | "low" | "high";
  cameraMode: "auto" | "wide" | "speaker" | "student";
  gesture: string;
  emotion: string;
}
export type CourtroomEvent =
  | {
      channel: "lexora-courtroom";
      version: 1;
      type: "ready";
      characters: 9;
      sceneVersion: 27;
    }
  | { channel: "lexora-courtroom"; version: 1; type: "unavailable"; reason?: string }
  | {
      channel: "lexora-courtroom";
      version: 1;
      type: "progress";
      loaded: number;
      total: 10;
    };
export function isCourtroomEvent(value: unknown): value is CourtroomEvent {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    data.channel === "lexora-courtroom" &&
    data.version === 1 &&
    (data.type === "unavailable" ||
      (data.type === "progress" &&
        data.total === 10 &&
        Number.isInteger(data.loaded) &&
        typeof data.loaded === "number" &&
        data.loaded >= 0 &&
        data.loaded <= 10) ||
      (data.type === "ready" &&
        data.characters === 9 &&
        data.sceneVersion === 27))
  );
}
