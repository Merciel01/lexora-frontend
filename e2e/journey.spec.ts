import { test, expect } from "@playwright/test";
test("parcours pédagogique complet en mode texte", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill("demo@example.com");
  await page.getByLabel("Mot de passe", { exact: true }).fill("demonstration");
  await page
    .getByRole("button", { name: "Entrer dans la démonstration" })
    .click();
  await page.getByRole("link", { name: "Commencer une simulation" }).click();
  await expect(
    page.getByRole("button", { name: /Ministère public/ }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Choisir un dossier" }).click();
  await page
    .getByRole("link", { name: "Consulter le dossier" })
    .first()
    .click();
  await page.getByRole("link", { name: "Vérifier mon équipement" }).click();
  await page.getByRole("button", { name: "Entrer dans la salle" }).click();
  await page.getByRole("button", { name: "Écouter la cour" }).click();
  await page
    .getByLabel("Votre argumentation")
    .fill("Je conteste les prétentions et demande un examen des documents.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await page
    .getByRole("button", { name: "Présenter une pièce", exact: true })
    .click();
  await page.getByRole("button", { name: "Présenter P01" }).click();
  await expect(
    page.getByText("L’avocat adverse", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendre la décision" }).click();
  await page
    .getByLabel("Votre argumentation")
    .fill("La pièce doit être discutée contradictoirement.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await page.getByRole("button", { name: "Consulter le jugement" }).click();
  await page.getByRole("link", { name: "Consulter mon évaluation" }).click();
  await expect(
    page.getByRole("heading", { name: "Jugement motivé" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voir mon débriefing" }).click();
  await expect(
    page.getByRole("heading", { name: "Vos points forts" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voir mes audiences" }).click();
  await expect(
    page.getByRole("heading", { name: "Vos audiences, votre parcours." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("mises en page et routes sans débordement", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 390, 768, 1024, 1440]) {
    const viewportPage = await context.newPage();
    viewportPage.on("pageerror", (e) => errors.push(e.message));
    await viewportPage.setViewportSize({ width, height: 960 });
    for (const route of [
      "/app",
      "/app/simulation/role",
      "/app/simulation/cases",
      "/app/cases/limete",
      "/app/session/setup",
      "/app/history",
      "/app/progress",
      "/app/settings",
      "/login",
      "/register",
      "/forgot-password",
    ]) {
      await viewportPage.goto(route);
      await expect(
        viewportPage.locator("h1,h2").first(),
        route + " à " + width + " erreurs: " + errors.join(";"),
      ).toBeVisible();
      expect(
        await viewportPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + " à " + width,
      ).toBe(true);
    }
    await viewportPage.close();
  }
  await page.setViewportSize({
    width: testInfo.project.name === "mobile" ? 390 : 1440,
    height: 960,
  });
  await page.goto("/app");
  await page.screenshot({
    path: "test-results/home-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("micro refusé et recherche vide restent utilisables", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException("refused", "NotAllowedError")),
      },
      configurable: true,
    });
  });
  await page.goto("/app/session/setup");
  await page.getByRole("button", { name: "Tester le microphone" }).click();
  await expect(page.getByRole("status")).toContainText("Autorisation refusée");
  await expect(
    page.getByRole("button", { name: "Entrer dans la salle" }),
  ).toBeEnabled();
  await page.goto("/app/simulation/cases");
  await page.getByLabel("Rechercher un dossier").fill("zzzz-introuvable");
  await expect(
    page.getByRole("heading", { name: "Aucun dossier trouvé" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(
    page.getByRole("heading", { name: "La parcelle de Limete" }),
  ).toBeVisible();
});
test("coupure locale conserve le brouillon", async ({ page }) => {
  await page.goto("/app/session/setup");
  await page.getByRole("button", { name: "Entrer dans la salle" }).click();
  await page.getByRole("button", { name: "Écouter la cour" }).click();
  await page.getByLabel("Votre argumentation").fill("Brouillon à conserver");
  await page.getByText("Scénarios de développement", { exact: true }).click();
  await page
    .getByRole("button", { name: "Simuler une coupure réseau" })
    .click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  await page.getByRole("button", { name: "Reconnecter" }).click();
  await expect(page.getByLabel("Votre argumentation")).toHaveValue(
    "Brouillon à conserver",
  );
});
test("scène 3D ou alternative texte accessible", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  await expect(page.getByText("Scène 3D · démonstration")).toBeVisible();
  await expect(page.frameLocator('iframe[title="Salle d’audience 3D Lexora"]').locator("canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/court-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Passer en mode texte" }).click();
  await expect(
    page.getByRole("heading", { name: "Le débat, en toute clarté." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("notes locales et suppression confirmée au clavier", async ({ page }) => {
  await page.goto("/app/cases/limete");
  await page.getByRole("tab", { name: "Faits", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Mes notes" })).toBeFocused();
  await page.getByLabel("Plan et arguments").fill("Plan local de défense");
  await page.reload();
  await page.getByRole("tab", { name: "Mes notes" }).click();
  await expect(page.getByLabel("Plan et arguments")).toHaveValue(
    "Plan local de défense",
  );
  await page.getByRole("button", { name: "Effacer mes notes" }).click();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByLabel("Plan et arguments")).toHaveValue(
    "Plan local de défense",
  );
  await page.getByRole("button", { name: "Effacer mes notes" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByLabel("Plan et arguments")).toHaveValue("");
});
test("préférences persistantes et confirmation de mot de passe", async ({
  page,
}) => {
  await page.goto("/app/settings");
  await page.getByLabel("Réduire les animations").check();
  await page.getByLabel("Qualité 3D").selectOption("low");
  await page
    .getByRole("button", { name: "Enregistrer mes préférences" })
    .click();
  await expect(page.getByRole("status")).toContainText("enregistrées");
  await page.reload();
  await expect(page.getByLabel("Réduire les animations")).toBeChecked();
  await expect(page.getByLabel("Qualité 3D")).toHaveValue("low");
  await page.goto("/register");
  await page.getByLabel("Nom complet").fill("Étudiant démo");
  await page.getByLabel("Adresse e-mail").fill("demo@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("password-one");
  await page.getByLabel("Confirmer le mot de passe").fill("password-two");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("alert")).toContainText("ne correspondent pas");
});
test("capture locale maintenue puis relâchée sans téléversement", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (req) => {
    if (["POST", "PUT"].includes(req.method())) uploads.push(req.url());
  });
  await page.goto("/app/session/setup");
  await page.getByRole("button", { name: "Entrer dans la salle" }).click();
  await page.getByRole("button", { name: "Écouter la cour" }).click();
  const capture = page.getByRole("button", { name: "Maintenir pour parler" });
  await capture.hover();
  await page.mouse.down();
  await expect(
    page.getByText("Enregistrement local en cours", { exact: false }),
  ).toBeVisible();
  await page.waitForTimeout(450);
  await page.mouse.up();
  await expect(page.locator("audio")).toBeVisible();
  expect(uploads).toEqual([]);
  await page.getByRole("button", { name: "Effacer la capture locale" }).click();
  await expect(page.locator("audio")).toHaveCount(0);
});
test("erreur 3D conserve une audience texte utilisable", async ({ page }) => {
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  await page.getByText("Scénarios de développement", { exact: true }).click();
  await page.getByRole("button", { name: "Simuler une erreur 3D" }).click();
  await page.getByRole("button", { name: "Poursuivre en mode texte" }).click();
  await expect(
    page.getByRole("heading", { name: "Le débat, en toute clarté." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Écouter la cour" }).click();
  await expect(page.getByLabel("Votre argumentation")).toBeEnabled();
});
