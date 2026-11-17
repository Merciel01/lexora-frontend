import { test, expect } from "@playwright/test";

test("la salle v27 suit Lexora sans scénario concurrent", async ({
  page,
}, info) => {
  // Includes asset loading, three camera views, quality controls and all seven roles.
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  const element = page.locator('iframe[title="Salle d’audience 3D Lexora"]');
  await expect(element).toBeVisible();
  await expect(page.locator(".courtroom-loading")).toBeHidden({
    timeout: 45000,
  });
  const scene = await element.contentFrame();
  await expect(scene.locator("canvas")).toBeVisible();
  await page.getByText("Options de la salle", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Explorer la salle 3D/ }),
  ).toHaveAttribute("target", "_blank");
  await page.getByText("Options de la salle", { exact: true }).click();
  const frame = page
    .frames()
    .find((f) => f.url().includes("/courtroom/index.html?embed=1"));
  expect(frame).toBeTruthy();
  expect(
    await frame!.evaluate(
      "({loaded:results.loaded.length,scheduled:schedule,decor:results.room.version})",
    ),
  ).toEqual({ loaded: 9, scheduled: null, decor: 27 });
  await page.screenshot({
    path: `test-results/lexora-courtroom-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Point de vue").selectOption("student");
  await expect.poll(() => frame!.evaluate("viewMode")).toBe("student");
  await page.getByLabel("Point de vue").selectOption("speaker");
  await expect.poll(() => frame!.evaluate("viewMode")).toBe("president");
  const sceneBox = await page.locator(".court-scene").boundingBox();
  const captionBox = await page
    .getByLabel("Sous-titres de l’audience")
    .boundingBox();
  expect(captionBox!.y).toBeGreaterThanOrEqual(sceneBox!.y + sceneBox!.height);
  await page.getByText("Options de la salle", { exact: true }).click();
  await page.getByLabel("Qualité de la salle").selectOption("low");
  await expect.poll(() => frame!.evaluate("qualityMode")).toBe("low");
  await page.getByText("Options de la salle", { exact: true }).click();
  // Exercise the same validated visual messages sent by Courtroom.tsx for every existing contract role.
  for (const [speaker, actor] of Object.entries({
    president: "president",
    "assessor-1": "assesseur_01",
    "assessor-2": "assesseur_02",
    prosecutor: "ministere_public",
    opposition: "avocat_adverse",
    clerk: "greffier",
    student: "etudiant_avocat",
  })) {
    await page.evaluate((activeSpeaker) => {
      const target = document.querySelector<HTMLIFrameElement>(
        'iframe[title="Salle d’audience 3D Lexora"]',
      )!;
      target.contentWindow!.postMessage(
        {
          channel: "lexora-courtroom",
          version: 1,
          type: "state",
          state: {
            activeSpeaker,
            speaking: true,
            objection: false,
            reduced: true,
            quality: "low",
            cameraMode: "speaker",
            gesture: "neutral",
            emotion: "neutral",
          },
        },
        location.origin,
      );
    }, speaker);
    await expect.poll(() => frame!.evaluate("speakerId")).toBe(actor);
    expect(await frame!.evaluate("schedule")).toBeNull();
  }
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Passer en mode texte" }).click();
  await expect(element).toHaveCount(0);
});

test("un GLB absent conserve le parcours texte", async ({ page }) => {
  await page.route("**/courtroom/assets/*.glb", (route) => route.abort());
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  await expect(page.getByText("La scène 3D n’est pas disponible.")).toBeVisible(
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: "Poursuivre en mode texte" }).click();
  await expect(
    page.getByRole("heading", { name: "Le débat, en toute clarté." }),
  ).toBeVisible();
});

test("l’explorateur conserve les deux cycles complets à la barre", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/courtroom/index.html");
  await expect(page.locator("#status")).toContainText("9 personnages", {
    timeout: 45000,
  });
  await page.evaluate(
    "manualCourtTest=true;paused=false;document.getElementById('reduceMotion').checked=true;startBarDemo();",
  );
  let done = false;
  for (let batch = 0; batch < 180; batch++) {
    done = await page.evaluate(
      "(()=>{for(let i=0;i<12;i++)simulationTick(1/24);return courtVisit===null&&courtQueue.length===0;})()",
    );
    if (done) break;
  }
  expect(done).toBe(true);
  const result = await page.evaluate(
    "({seated:results.court.events.filter(e=>e.type==='seated').map(e=>e.id),error:results.court.max_foot_ik_error_m,errors:results.errors})",
  );
  expect(result.seated).toEqual(["client_prevenu", "temoin_01"]);
  expect(result.error).toBeLessThan(0.005);
  expect(result.errors).toEqual([]);
});

test("le chargement de la salle peut être quitté sans perdre son argument", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/courtroom/assets/*.glb", async (route) => {
    await gate;
    await route.abort();
  });
  try {
    await page.goto("/app/trials/demo");
    await page.getByRole("button", { name: "Écouter la cour" }).click();
    await page
      .getByLabel("Votre argumentation")
      .fill("Ma position reste conservée pendant le chargement.");
    await page.getByRole("button", { name: "Voir la salle 3D" }).click();
    await expect(
      page.getByRole("progressbar", { name: "Chargement de la salle" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continuer en mode texte", exact: true })
      .click();
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByLabel("Votre argumentation")).toHaveValue(
      "Ma position reste conservée pendant le chargement.",
    );
  } finally {
    release();
  }
});
