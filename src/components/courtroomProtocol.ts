import type { SpeakerId } from "../services/contracts";
export interface CourtroomState {
  activeSpeaker: SpeakerId;
  speaking: boolean;
  objection: boolean;
  reduced: boolean;
  quality: "auto" | "low" | "high";
  cameraMode: "wide" | "speaker";
  gesture: string;
  emotion: string;
}
export type CourtroomEvent =
  | { channel: "lexora-courtroom"; version: 1; type: "ready"; characters: 9; sceneVersion: 27 }
  | { channel: "lexora-courtroom"; version: 1; type: "unavailable" };
export function isCourtroomEvent(value: unknown): value is CourtroomEvent {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.channel === "lexora-courtroom" && data.version === 1 &&
    (data.type === "unavailable" || (data.type === "ready" && data.characters === 9 && data.sceneVersion === 27));
}
