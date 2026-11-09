import { describe, expect, it } from "vitest";
import { initialTrial, transition, canSelectRole } from "./model";
describe("Scénario d’audience", () => {
  it("interdit une prise de parole pendant l’ouverture", () => {
    expect(
      transition(initialTrial, { type: "text", id: "1", text: "Bonjour" }),
    ).toBe(initialTrial);
  });
  it("déduplique les événements", () => {
    const a = { type: "continue" as const, id: "1" };
    const state = transition(initialTrial, a);
    expect(transition(state, a)).toBe(state);
  });
  it("ne termine pas le procès après une seule intervention", () => {
    const facts = transition(initialTrial, { type: "continue", id: "1" });
    const pleading = transition(facts, {
      type: "text",
      id: "2",
      text: "Je conteste la prétention.",
    });
    expect(pleading.step).toBe(2);
    expect(pleading.finished).toBe(false);
  });
  it("exige une pièce valide et conserve la transcription pendant l’objection", () => {
    let s = transition(initialTrial, { type: "continue", id: "1" });
    s = transition(s, { type: "text", id: "2", text: "Ma position" });
    expect(
      transition(s, { type: "exhibit", id: "3", exhibitId: "inconnu" }),
    ).toBe(s);
    const objection = transition(s, {
      type: "exhibit",
      id: "4",
      exhibitId: "P01",
    });
    expect(objection.objection).toBe(true);
    expect(objection.entries.length).toBeGreaterThan(s.entries.length);
    expect(objection.presented).toEqual(["P01"]);
  });
  it("parcourt ouverture, faits, pièce, objection, réplique, délibération et jugement", () => {
    let s = initialTrial;
    const actions = [
      { type: "continue", id: "1" },
      { type: "text", id: "2", text: "Ma position" },
      { type: "exhibit", id: "3", exhibitId: "P01" },
      { type: "continue", id: "4" },
      { type: "text", id: "5", text: "Ma réplique" },
      { type: "continue", id: "6" },
    ] as const;
    for (const a of actions) s = transition(s, a);
    expect(s.finished).toBe(true);
    expect(s.step).toBe(6);
    expect(transition(s, { type: "continue", id: "7" })).toBe(s);
  });
  it("ne débloque pas le ministère public", () => {
    expect(canSelectRole("prosecutor")).toBe(false);
    expect(canSelectRole("defense")).toBe(true);
    expect(canSelectRole("inconnu")).toBe(false);
  });
});
