import { test, expect } from "@playwright/test";
test("guide compact avec menus, sous-menus et ajout aux notes", async ({
  page,
}, testInfo) => {
  const posts: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app/cases/accident");
  const guide = page.getByRole("region", { name: "Votre guide IA" });
  await expect(guide).toBeVisible();
  expect((await guide.boundingBox())!.height).toBeLessThan(360);
  await expect(page.locator(".guide-menu.is-active")).toHaveCount(0);
  await page.locator("h1").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path:
      "test-results/preparation-guide-compact-" +
      testInfo.project.name +
      ".png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Mes notes" }).click();
  await page.getByLabel("Plan et arguments").fill("Mon raisonnement personnel");
  await page.getByRole("tab", { name: "Faits", exact: true }).click();
  await page
    .getByRole("button", { name: "Par où commencer ?", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Par où commencer ?", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  const conversation = page.getByRole("region", {
    name: "Échanges avec le guide",
  });
  await conversation
    .getByText("Comprendre le différend", { exact: true })
    .click();
  await expect(
    conversation.getByText(/circonstances de la collision/),
  ).toBeVisible();
  await conversation
    .getByText("Faire une grille faits / pièces / limites", { exact: true })
    .click();
  await expect(guide.locator(".guide-submenu[open]")).toHaveCount(1);
  await expect(
    conversation.getByText(/circonstances de la collision/),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Examiner les pièces", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Par où commencer ?", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    conversation.getByText("P01 · Constat descriptif", { exact: true }),
  ).toBeVisible();
  await expect(
    conversation.getByText("P04 · Évaluation des dommages", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Construire mon plan", exact: true })
    .click();
  await conversation
    .getByText("1. Annoncer votre position", { exact: true })
    .click();
  await expect(guide.locator(".guide-menu.is-active")).toHaveCount(1);
  expect((await guide.boundingBox())!.height).toBeLessThan(700);
  await page.locator("h1").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/preparation-guide-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ajouter ce plan à mes notes" })
    .click();
  await expect(page.getByRole("tab", { name: "Mes notes" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Plan et arguments")).toHaveValue(
    /Mon raisonnement personnel[\s\S]*Annoncer votre position/,
  );
  await expect(
    page.getByRole("button", { name: "Ajouté à mes notes" }),
  ).toBeDisabled();
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("question conservée au changement de rubrique et guide isolé par dossier", async ({
  page,
}) => {
  await page.goto("/app/cases/accident");
  await page
    .getByRole("button", { name: "Poser une question", exact: true })
    .click();
  await page
    .getByLabel("Votre question de préparation")
    .fill("Quelle méthode suivre pour préparer ce dossier ?");
  await page
    .getByRole("button", { name: "Par où commencer ?", exact: true })
    .click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Poser une question", exact: true })
    .click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "Quelle méthode suivre pour préparer ce dossier ?",
  );
  await page.getByRole("tab", { name: "Pièces (4)" }).click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "Quelle méthode suivre pour préparer ce dossier ?",
  );
  await page.getByRole("button", { name: "Demander au guide" }).click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "",
  );
  await page
    .getByRole("region", { name: "Échanges avec le guide" })
    .getByText("Faire une grille faits / pièces / limites", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voir P01, P02", exact: true })
    .click();
  await expect(page.getByRole("tab", { name: "Pièces (4)" })).toBeFocused();
  await expect(page.locator("#exhibit-P01")).toHaveAttribute("open", "");
  await page.goto("/app/cases/limete");
  await expect(page.locator(".guide-menu.is-active")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Examiner les pièces", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Échanges avec le guide" })
      .getByText("P01 · Acte de cession", { exact: true }),
  ).toBeVisible();
});
test("le guide ne dépasse pas la capacité des notes locales", async ({
  page,
}) => {
  await page.goto("/app/cases/accident");
  await page.getByRole("tab", { name: "Mes notes" }).click();
  await page.getByLabel("Plan et arguments").fill("A".repeat(10000));
  await page
    .getByRole("button", { name: "Construire mon plan", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ajouter ce plan à mes notes" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Le plan dépasse l’espace restant/),
  ).toBeVisible();
  await expect(page.getByLabel("Plan et arguments")).toHaveValue(
    "A".repeat(10000),
  );
});
