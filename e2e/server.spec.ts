import { test, expect, type Page, type WebSocketRoute } from "@playwright/test";
const profile = {
  id: "test-student",
  name: "Étudiant contrat",
  level: 3,
  xp: 900,
  nextLevelXp: 1200,
  badges: ["Analyse"],
  completedCount: 4,
  averageScore: 72,
};
const dossier = {
  id: "limete",
  title: "Dossier fourni par Django",
  domain: "Civil",
  difficulty: "Débutant",
  minutes: 25,
  description: "Dossier de test contractuel",
  facts: "Les faits viennent de la réponse REST.",
  roleIds: ["defense"],
  exhibits: [
    {
      id: "P01",
      caseId: "limete",
      title: "Pièce du serveur",
      mediaType: "text",
      content: "Texte fourni par le serveur de test.",
      downloadAllowed: false,
    },
  ],
};
const snapshot = {
  id: "trial-1",
  caseId: "limete",
  roleId: "defense",
  step: 1,
  entries: [
    {
      id: "open",
      speaker: "Le président",
      text: "Présentez votre argumentation.",
    },
  ],
  seen: [],
  presented: [],
  objection: false,
  finished: false,
  canResume: true,
  allowedActions: ["user_text", "present_exhibit"],
  activeSpeaker: "president",
  startedAt: "2026-11-09T10:00:00Z",
  seq: 0,
  audioCodecs: [],
  websocketUrl: "/ws/trial-1",
};
async function mock(page: Page) {
  let signedIn = true;
  let notes = "";
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown;
    if (path === "/api/auth/csrf") body = { csrfToken: "test-csrf" };
    else if (path === "/api/auth/login") {
      expect(request.headers()["x-csrftoken"]).toBe("test-csrf");
      signedIn = true;
      body = { detail: "ok" };
    } else if (path === "/api/auth/logout") {
      signedIn = false;
      body = { detail: "ok" };
    } else if (path === "/api/me") {
      if (!signedIn) {
        await route.fulfill({ status: 401, json: { detail: "expired" } });
        return;
      }
      body = profile;
    } else if (path === "/api/cases/limete/notes") {
      if (request.method() === "PUT") notes = request.postDataJSON().text;
      body = { text: notes };
    } else if (path === "/api/preferences") {
      body = { reduced: false, sound: false, subtitles: true, quality: "auto", localVoice: false, voiceUri: "", captureMode: "hold" };
    } else if (path === "/api/roles")
      body = [
        {
          id: "defense",
          label: "Avocat de la défense",
          description: "Rôle serveur",
          unlocked: true,
        },
        {
          id: "prosecutor",
          label: "Ministère public",
          unlocked: false,
          condition: "Niveau requis",
        },
      ];
    else if (path === "/api/cases")
      body = { results: [dossier], count: 1, page: 1, pageSize: 4 };
    else if (path === "/api/cases/limete") body = dossier;
    else if (path === "/api/trials" && request.method() === "POST") {
      expect(request.headers()["x-csrftoken"]).toBe("test-csrf");
      body = snapshot;
    } else if (path === "/api/trials")
      body = { results: [], count: 0, page: 1, pageSize: 20 };
    else if (path === "/api/trials/trial-1") body = snapshot;
    else {
      await route.fulfill({ status: 404, json: { detail: "not implemented" } });
      return;
    }
    await route.fulfill({ json: body });
  });
  return {
    expire: () => {
      signedIn = false;
    },
  };
}
test("REST Django : profil, rôle, dossier et création sans fixtures", async ({
  page,
}) => {
  await mock(page);
  await page.routeWebSocket("**/ws/trial-1", () => {});
  await page.goto("/app");
  await expect(page.getByText("900 / 1200 XP")).toBeVisible();
  await page.getByRole("link", { name: "Commencer une simulation" }).click();
  await page.getByRole("link", { name: "Choisir un dossier" }).click();
  await page.getByRole("link", { name: "Consulter le dossier" }).click();
  await expect(
    page.getByText("Les faits viennent de la réponse REST."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vérifier mon équipement" }).click();
  await page.getByRole("button", { name: "Entrer dans la salle" }).click();
  await expect(page.getByText("CONNECTÉ À DJANGO")).toBeVisible();
  await expect(page.getByLabel("Votre argumentation")).toBeEnabled();
});
test("WebSocket : refus, réessai idempotent et événement dédupliqué", async ({
  page,
}) => {
  await mock(page);
  const ids: string[] = [];
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket("**/ws/trial-1", (ws) => {
    socket = ws;
    ws.onMessage((raw) => {
      const command = JSON.parse(String(raw));
      ids.push(command.clientMessageId);
      ws.send(
        JSON.stringify({
          type: "ack",
          clientMessageId: command.clientMessageId,
          accepted: ids.length > 1,
          reason: "Refus temporaire du test",
        }),
      );
      if (ids.length > 1) {
        const event = JSON.stringify({
          type: "turn",
          eventId: "turn-1",
          seq: 1,
          turnId: "t1",
          speaker: "president",
          text: "Argument reçu une seule fois.",
        });
        ws.send(event);
        ws.send(event);
      }
    });
  });
  await page.goto("/app/trials/trial-1");
  await expect(page.getByLabel("Votre argumentation")).toBeEnabled();
  await page.getByLabel("Votre argumentation").fill("Mon argument conservé");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Refus temporaire du test")).toBeVisible();
  await expect(page.getByLabel("Votre argumentation")).toHaveValue(
    "Mon argument conservé",
  );
  await page
    .getByLabel("Votre argumentation")
    .fill("Un autre brouillon à conserver");
  await page.getByRole("button", { name: "Réessayer l’envoi" }).click();
  await expect(page.getByLabel("Votre argumentation")).toHaveValue(
    "Un autre brouillon à conserver",
  );
  await expect(
    page.getByText("Argument reçu une seule fois.", { exact: true }),
  ).toHaveCount(1);
  expect(ids[0]).toBe(ids[1]);
  await socket!.close({ code: 4401, reason: "expired" });
  await expect(
    page.getByText("Session expirée ou accès refusé. Reconnectez-vous."),
  ).toBeVisible();
});
test("session expirée redirige vers la connexion", async ({ page }) => {
  const backend = await mock(page);
  backend.expire();
  await page.goto("/app");
  await expect(
    page.getByRole("button", { name: "Se connecter" }),
  ).toBeVisible();
  await page.getByLabel("Adresse e-mail").fill("demo@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Votre prochaine plaidoirie commence ici.",
    }),
  ).toBeVisible();
});
test("panne REST ne montre jamais de faux dossiers", async ({ page }) => {
  await mock(page);
  await page.route("**/api/cases?**", (route) =>
    route.fulfill({ status: 503, json: { detail: "offline" } }),
  );
  await page.goto("/app/simulation/cases");
  await expect(page.getByRole("alert")).toContainText("indisponible");
  await expect(
    page.getByRole("heading", { name: "La parcelle de Limete" }),
  ).toHaveCount(0);
});
test("guide Django : notes privées exclues et réessai idempotent", async ({
  page,
}) => {
  await mock(page);
  const ids: string[] = [];
  await page.route("**/api/cases/limete/guide", async (route) => {
    const payload = route.request().postDataJSON();
    expect(route.request().headers()["x-csrftoken"]).toBe("test-csrf");
    expect(JSON.stringify(payload)).not.toContain(
      "Note personnelle confidentielle",
    );
    expect(payload.notes).toBeUndefined();
    expect(payload.roleId).toBe("defense");
    ids.push(payload.clientMessageId);
    if (ids.length === 1) {
      await route.fulfill({ status: 503, json: { detail: "offline" } });
      return;
    }
    await route.fulfill({
      json: {
        id: "guide-1",
        caseId: "limete",
        clientMessageId: payload.clientMessageId,
        introduction: "Conseils reçus du serveur de test.",
        steps: [
          {
            title: "Examiner le dossier reçu",
            detail:
              "Reliez chaque affirmation à une pièce et indiquez ses limites.",
            exhibitIds: ["P01"],
          },
        ],
        questions: ["Que souhaitez-vous établir ?"],
        citations: [],
      },
    });
  });
  await page.goto("/app/cases/limete");
  await page.getByRole("tab", { name: "Mes notes" }).click();
  await page
    .getByLabel("Plan et arguments")
    .fill("Note personnelle confidentielle");
  await page
    .getByRole("button", { name: "Poser une question", exact: true })
    .click();
  await page
    .getByLabel("Votre question de préparation")
    .fill("Comment classer les faits ?");
  await page.getByRole("button", { name: "Demander au guide" }).click();
  await expect(page.getByRole("alert")).toContainText("indisponible");
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "Comment classer les faits ?",
  );
  await page
    .getByLabel("Votre question de préparation")
    .fill("Une autre question à conserver");
  await page.getByRole("button", { name: "Réessayer la question" }).click();
  await page
    .getByRole("region", { name: "Échanges avec le guide" })
    .getByText("Vue d’ensemble", { exact: true })
    .click();
  await expect(
    page.getByText("Conseils reçus du serveur de test.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "Une autre question à conserver",
  );
  expect(ids[0]).toBe(ids[1]);
  await expect(page.getByText("Démo — conseils simulés")).toHaveCount(0);
});
test("guide refuse une réponse portant sur une pièce inconnue", async ({
  page,
}) => {
  await mock(page);
  await page.route("**/api/cases/limete/guide", async (route) => {
    const input = route.request().postDataJSON();
    await route.fulfill({
      json: {
        id: "guide-bad",
        caseId: "limete",
        clientMessageId: input.clientMessageId,
        introduction: "Cette réponse ne doit pas être affichée.",
        steps: [
          {
            title: "Pièce absente",
            detail: "Contenu refusé.",
            exhibitIds: ["P99"],
          },
        ],
        questions: [],
        citations: [],
      },
    });
  });
  await page.goto("/app/cases/limete");
  await page
    .getByRole("button", { name: "Poser une question", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Examiner les pièces", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("pièce absente");
  await expect(
    page.getByText("Cette réponse ne doit pas être affichée."),
  ).toHaveCount(0);
});
test("menus du guide : requête conservée et réponse réutilisée à la réouverture", async ({
  page,
}) => {
  await mock(page);
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/cases/limete/guide", async (route) => {
    requests++;
    const input = route.request().postDataJSON();
    await ready;
    await route.fulfill({
      json: {
        id: "cached-guide",
        caseId: "limete",
        clientMessageId: input.clientMessageId,
        introduction: "Réponse conservée.",
        steps: [
          {
            title: "Étape conservée",
            detail: "Un conseil disponible sans nouvelle requête.",
            exhibitIds: [],
          },
        ],
        questions: [],
        citations: [],
      },
    });
  });
  await page.goto("/app/cases/limete");
  const menu = page.getByRole("button", {
    name: "Par où commencer ?",
    exact: true,
  });
  await menu.click();
  await expect(
    page.getByText(/^Le guide prépare ses conseils…/),
  ).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeEnabled();
  await menu.click();
  await expect(
    page.getByText(/^Le guide prépare ses conseils…/),
  ).toBeVisible();
  release();
  await expect(
    page.getByText("Étape conservée", { exact: true }),
  ).toBeVisible();
  await menu.click();
  await menu.click();
  await expect(
    page.getByText("Étape conservée", { exact: true }),
  ).toBeVisible();
  expect(requests).toBe(1);
});
