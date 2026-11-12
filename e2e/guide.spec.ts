import { test, expect } from "@playwright/test";
test("guide de préparation contextualisé et ajout explicite aux notes", async ({
  page,
}, testInfo) => {
  const posts: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app/cases/accident");
  await page.getByRole("tab", { name: "Mes notes" }).click();
  await page.getByLabel("Plan et arguments").fill("Mon raisonnement personnel");
  await page.getByRole("tab", { name: "Faits", exact: true }).click();
  await page.getByRole("button", { name: "Préparer avec le guide" }).click();
  await expect(
    page.getByText("Démo — conseils simulés", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Par où commencer ?" }).click();
  const conversation = page.getByRole("region", {
    name: "Échanges avec le guide",
  });
  await expect(
    conversation.getByText("Comprendre le différend", { exact: true }),
  ).toBeVisible();
  await expect(
    conversation.getByText(/circonstances de la collision/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Examiner les pièces", exact: true })
    .click();
  await expect(
    conversation.getByText("P01 · Constat descriptif", { exact: true }),
  ).toBeVisible();
  await expect(
    conversation.getByText("P04 · Évaluation des dommages", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Construire mon plan", exact: true })
    .click();
  const unread = page.getByRole("button", { name: "Nouvelle réponse ↓" });
  if (await unread.isVisible()) await unread.click();
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
test("guide isolé par dossier et question conservée au changement d’onglet", async ({
  page,
}) => {
  await page.goto("/app/cases/accident");
  await page.getByRole("button", { name: "Préparer avec le guide" }).click();
  await page
    .getByLabel("Votre question de préparation")
    .fill("Comment préparer ma réponse ?");
  await page.getByRole("tab", { name: "Pièces (4)" }).click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "Comment préparer ma réponse ?",
  );
  await page.getByRole("button", { name: "Demander au guide" }).click();
  await expect(page.getByLabel("Votre question de préparation")).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Voir P01, P02", exact: true })
    .click();
  await expect(page.getByRole("tab", { name: "Pièces (4)" })).toBeFocused();
  await expect(page.locator("#exhibit-P01")).toHaveAttribute("open", "");
  await page.goto("/app/cases/limete");
  await page.getByRole("button", { name: "Préparer avec le guide" }).click();
  await expect(
    page.getByRole("region", { name: "Échanges avec le guide" }),
  ).toHaveCount(0);
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
  await page.getByRole("button", { name: "Préparer avec le guide" }).click();
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
