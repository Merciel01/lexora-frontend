import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackQueue, type QueueItem } from "../features/audio/queue";
import { chooseMime } from "../features/audio/useRecorder";
import { safeUrl } from "./urls";
import { displayedTime, stage } from "../features/trial/state";
import {
  createDemoSession,
  getDemoCase,
  getDemoProfile,
  getSessions,
  saveSession,
  fromState,
  demoVerdict,
} from "./demo";
import { transition } from "./model";
import { snapshotSchema } from "./contracts";
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
  });
  vi.stubGlobal("window", new EventTarget());
});
describe("Isolation des dossiers et audiences", () => {
  it("associe chaque pièce à son dossier", () => {
    const first = getDemoCase("limete"),
      second = getDemoCase("telephone");
    expect(first.exhibits).toHaveLength(4);
    expect(second.exhibits[0].caseId).toBe("telephone");
    expect(first.exhibits[0].title).not.toBe(second.exhibits[0].title);
  });
  it("refuse rôle verrouillé et dossier incompatible", () => {
    expect(() => createDemoSession("prosecutor", "limete")).toThrow(
      "verrouillé",
    );
    expect(() => createDemoSession("civil", "limete")).toThrow("compatible");
  });
  it("conserve deux audiences distinctes du même dossier", () => {
    const a = createDemoSession("defense", "limete"),
      b = createDemoSession("defense", "limete");
    expect(a.id).not.toBe(b.id);
    expect(getSessions()).toHaveLength(2);
  });
  it("n’attribue pas les XP au rechargement du résultat", () => {
    const s = createDemoSession("defense", "limete");
    const finished = { ...s, finished: true, step: 6 };
    saveSession(finished);
    const xp = getDemoProfile().xp;
    demoVerdict(finished);
    saveSession(finished);
    expect(getDemoProfile().xp).toBe(xp);
    expect(getDemoProfile().completedCount).toBe(13);
  });
  it("normalise la phase et le locuteur sans modifier les échanges", () => {
    const s = createDemoSession("defense", "limete");
    const state = transition(s, { type: "continue", id: "a" });
    const next = fromState(s, state);
    expect(next.activeSpeaker).toBe("assessor-1");
    expect(next.allowedActions).toContain("user_text");
    expect(snapshotSchema.safeParse(next).success).toBe(true);
  });
});
describe("Audio, temps et liens", () => {
  it("n’accepte aucun protocole exécutable", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,x")).toBeUndefined();
    expect(safeUrl("https://example.org/source")).toBe(
      "https://example.org/source",
    );
  });
  it("choisit seulement un codec accepté et disponible", () => {
    expect(chooseMime((m) => m === "audio/mp4")).toBe("audio/mp4");
    expect(chooseMime(() => true, ["audio/pcm"])).toBe("audio/pcm");
    expect(chooseMime(() => false)).toBeUndefined();
  });
  it("calcule temps serveur ou temps écoulé sans durée inventée", () => {
    expect(
      displayedTime(
        "2026-01-01T00:00:00Z",
        undefined,
        Date.parse("2026-01-01T00:01:02Z"),
      ),
    ).toEqual({ label: "Temps écoulé", value: "01:02" });
    expect(
      displayedTime(
        "invalid",
        "2026-01-01T00:01:00Z",
        Date.parse("2026-01-01T00:00:00Z"),
      ).value,
    ).toBe("01:00");
  });
  it("différencie capture, envoi, reconnexion et tour étudiant", () => {
    const s = {
      ...createDemoSession("defense", "limete"),
      allowedActions: ["user_text" as const],
    };
    expect(stage(s, "ready")).toBe("student-turn");
    expect(stage(s, "ready", true)).toBe("recording");
    expect(stage(s, "ready", false, true)).toBe("sending");
    expect(stage(s, "reconnecting")).toBe("reconnecting");
  });
  it("lit dans l’ordre sans doublon ni chevauchement", async () => {
    const played: string[] = [];
    let release = () => {};
    const queue = new PlaybackQueue();
    const item = (id: string, index: number): QueueItem => ({
      id,
      turnId: "turn",
      sentenceIndex: index,
      play: async () => {
        played.push(id);
        if (index === 0)
          await new Promise<void>((r) => {
            release = r;
          });
      },
      stop: () => release(),
    });
    queue.enqueue(item("second", 1));
    expect(played).toEqual([]);
    queue.enqueue(item("first", 0));
    queue.enqueue(item("first", 0));
    expect(played).toEqual(["first"]);
    release();
    await vi.waitFor(() => expect(played).toEqual(["first", "second"]));
    expect(queue.size).toBe(0);
  });
  it("permet de réessayer une lecture bloquée", async () => {
    const play = vi
      .fn()
      .mockRejectedValueOnce(new Error("autoplay"))
      .mockResolvedValue(undefined);
    const error = vi.fn();
    const queue = new PlaybackQueue(error);
    queue.enqueue({
      id: "1",
      turnId: "t",
      sentenceIndex: 0,
      play,
      stop: () => {},
    });
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(queue.size).toBe(1);
    queue.retry();
    await vi.waitFor(() => expect(queue.size).toBe(0));
    expect(play).toHaveBeenCalledTimes(2);
  });
  it("annule une file sans relancer un ancien tour", async () => {
    let stop = () => {};
    const queue = new PlaybackQueue();
    queue.enqueue({
      id: "a",
      turnId: "t",
      sentenceIndex: 0,
      play: () =>
        new Promise<void>((resolve) => {
          stop = resolve;
        }),
      stop: () => stop(),
    });
    queue.clear();
    await Promise.resolve();
    expect(queue.size).toBe(0);
  });
});
