import { describe, it, expect } from "vitest";
import { isCourtroomEvent } from "./courtroomProtocol";
describe("courtroom visual bridge", () => {
  it("accepts the complete scene handshake and explicit failure", () => {
    expect(isCourtroomEvent({ channel: "lexora-courtroom", version: 1, type: "ready", characters: 9, sceneVersion: 27 })).toBe(true);
    expect(isCourtroomEvent({ channel: "lexora-courtroom", version: 1, type: "unavailable" })).toBe(true);
  });
  it.each([null, "ready", {}, { channel: "other", version: 1, type: "unavailable" }, { channel: "lexora-courtroom", version: 2, type: "unavailable" }, { channel: "lexora-courtroom", version: 1, type: "ready", characters: 7, sceneVersion: 27 }])("rejects incomplete or incompatible messages: %j", value => {
    expect(isCourtroomEvent(value)).toBe(false);
  });
});
