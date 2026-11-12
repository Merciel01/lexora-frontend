import { afterEach, expect, it, vi } from "vitest";
import { serverApi } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("refreshes Django's rotated CSRF token before the first authenticated mutation", async () => {
  let authenticated = false;
  const mutations: string[] = [];
  const profile = { id: "1", name: "Étudiant LEXORA", level: 1, xp: 0, nextLevelXp: 1000, badges: [], completedCount: 0, averageScore: 0 };
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith("/auth/csrf")) return Response.json({ csrfToken: authenticated ? "rotated" : "anonymous" });
    if (url.endsWith("/auth/login")) {
      expect((options.headers as Record<string, string>)["X-CSRFToken"]).toBe("anonymous");
      authenticated = true;
      return Response.json({ detail: "Connexion établie." });
    }
    if (options.method === "PATCH") mutations.push((options.headers as Record<string, string>)["X-CSRFToken"]);
    return Response.json(profile);
  }));
  await serverApi.login("student@lexora.test", "example");
  await serverApi.saveProfile("Étudiant LEXORA");
  expect(mutations).toEqual(["rotated"]);
});
