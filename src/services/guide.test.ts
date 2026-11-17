import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getDemoCase } from "./demo";
import {
  demoGuide,
  guideNotes,
  validateGuideResponse,
  askGuide,
} from "./guide";
import { guideRequestSchema, type GuideRequest } from "./contracts";
import { request } from "./api";
const dossier = getDemoCase("accident");
const input: GuideRequest = {
  clientMessageId: "request-1",
  roleId: "defense",
  intent: "method",
  message: "Quelle méthode suivre ?",
  history: [],
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Guide de préparation", () => {
  it("contextualise la méthode sans inventer de source", () => {
    const response = demoGuide(dossier, input);
    expect(response.caseId).toBe("accident");
    expect(response.introduction).toContain(dossier.title);
    expect(response.steps[0].detail).toContain("collision");
    expect(response.citations).toEqual([]);
    expect(response.introduction).toContain("ne prédisent pas le jugement");
  });
  it("référence seulement les pièces du dossier", () => {
    const response = demoGuide(dossier, { ...input, intent: "evidence" });
    expect(response.steps).toHaveLength(4);
    expect(response.steps[0].title).toContain("Constat descriptif");
    expect(response.steps.flatMap((s) => s.exhibitIds)).toEqual([
      "P01",
      "P02",
      "P03",
      "P04",
    ]);
    expect(response.steps.map((s) => s.title).join(" ")).not.toContain(
      "Acte de cession",
    );
  });
  it("produit un plan exportable sans modifier les notes", () => {
    const response = demoGuide(dossier, { ...input, intent: "outline" });
    const plan = guideNotes(response);
    expect(response.steps).toHaveLength(5);
    expect(plan).toContain("Annoncer votre position");
    expect(plan).toContain("Pièces à examiner : P01, P02");
  });
  it("signale les références absentes au lieu de créer des articles", () => {
    const response = demoGuide(dossier, {
      ...input,
      intent: "question",
      message: "Quel article de loi utiliser ?",
    });
    expect(response.introduction).toContain(
      "Aucune référence juridique validée",
    );
    expect(response.citations).toEqual([]);
  });
  it("reste utilisable en l’absence de pièces", () => {
    const response = demoGuide(
      { ...dossier, exhibits: [] },
      { ...input, intent: "evidence" },
    );
    expect(response.steps).toHaveLength(1);
    expect(response.steps[0].exhibitIds).toEqual([]);
    expect(response.steps[0].detail).toContain("n’inventez pas de preuve");
  });
  it("rejette une réponse d’un autre dossier ou d’une autre demande", () => {
    const response = demoGuide(dossier, input);
    expect(() =>
      validateGuideResponse(
        { ...response, caseId: "limete" },
        dossier,
        input.clientMessageId,
      ),
    ).toThrow("correspond pas");
    expect(() =>
      validateGuideResponse(response, dossier, "another-request"),
    ).toThrow("correspond pas");
  });
  it("rejette une pièce inconnue citée par le guide", () => {
    const response = demoGuide(dossier, input);
    response.steps[0].exhibitIds = ["P99"];
    expect(() =>
      validateGuideResponse(response, dossier, input.clientMessageId),
    ).toThrow("absente");
  });
  it("limite la question et la taille du contexte", () => {
    expect(
      guideRequestSchema.safeParse({ ...input, message: "x".repeat(1501) })
        .success,
    ).toBe(false);
    expect(
      guideRequestSchema.safeParse({
        ...input,
        history: Array.from({ length: 13 }, () => ({
          role: "student",
          text: "question",
        })),
      }).success,
    ).toBe(false);
  });
  it("ne contacte aucun service dans le mode démo", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(askGuide(dossier, input)).resolves.toMatchObject({
      caseId: "accident",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("annule la demande avant tout envoi", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(askGuide(dossier, input, controller.signal)).rejects.toThrow(
      "annulée",
    );
  });
});
describe("Annulation et délai REST avec signal externe", () => {
  it("propage l’annulation à fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    const controller = new AbortController();
    const pending = request("/guide-test", z.object({ ok: z.boolean() }), {
      signal: controller.signal,
    });
    const rejected = expect(pending).rejects.toThrow("Connexion");
    controller.abort();
    await rejected;
  });
  it("conserve le délai de 20 secondes même avec un signal externe", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    const controller = new AbortController();
    const pending = request("/guide-test", z.object({ ok: z.boolean() }), {
      signal: controller.signal,
    });
    const rejected = expect(pending).rejects.toThrow("Connexion");
    await vi.advanceTimersByTimeAsync(20000);
    await rejected;
  });
});
