import { test, expect } from "@playwright/test";

test("la salle v27 suit Lexora sans scénario concurrent", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  const element = page.locator('iframe[title="Salle d’audience 3D Lexora"]');
  await expect(element).toBeVisible();
  await expect(page.getByText("Chargement des neuf personnages… Le mode texte reste accessible.")).toBeHidden({ timeout: 45000 });
  const scene = await element.contentFrame();
  await expect(scene.locator("canvas")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorer la salle 3D" })).toHaveAttribute("target", "_blank");
  const frame = page.frames().find(f => f.url().includes("/courtroom/index.html?embed=1"));
  expect(frame).toBeTruthy();
  expect(await frame!.evaluate("({loaded:results.loaded.length,scheduled:schedule,decor:results.room.version})")).toEqual({ loaded: 9, scheduled: null, decor: 27 });
  await page.screenshot({ path: `test-results/lexora-courtroom-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Caméra : vue générale" }).click();
  await expect.poll(() => frame!.evaluate("viewMode")).toBe("president");
  // Exercise the same validated visual messages sent by Courtroom.tsx for every existing contract role.
  for (const [speaker, actor] of Object.entries({ president: "president", "assessor-1": "assesseur_01", "assessor-2": "assesseur_02", prosecutor: "ministere_public", opposition: "avocat_adverse", clerk: "greffier", student: "etudiant_avocat" })) {
    await page.evaluate(activeSpeaker => {
      const target = document.querySelector<HTMLIFrameElement>('iframe[title="Salle d’audience 3D Lexora"]')!;
      target.contentWindow!.postMessage({ channel: "lexora-courtroom", version: 1, type: "state", state: { activeSpeaker, speaking: true, objection: false, reduced: true, quality: "low", cameraMode: "speaker", gesture: "neutral", emotion: "neutral" } }, location.origin);
    }, speaker);
    await expect.poll(() => frame!.evaluate("speakerId")).toBe(actor);
    expect(await frame!.evaluate("schedule")).toBeNull();
  }
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Passer en mode texte" }).click();
  await expect(element).toHaveCount(0);
});

test("un GLB absent conserve le parcours texte", async ({ page }) => {
  await page.route("**/courtroom/assets/*.glb", route => route.abort());
  await page.goto("/app/trials/demo");
  await page.getByRole("button", { name: "Voir la salle 3D" }).click();
  await expect(page.getByText("La scène 3D n’est pas disponible.")).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Poursuivre en mode texte" }).click();
  await expect(page.getByRole("heading", { name: "Le débat, en toute clarté." })).toBeVisible();
});

test("l’explorateur conserve les deux cycles complets à la barre", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/courtroom/index.html");
  await expect(page.locator("#status")).toContainText("9 personnages", { timeout: 45000 });
  // The live renderer is verified above. Avoid software-GPU work while fast-stepping simulation/IK in CI.
  await page.evaluate("renderer.render=()=>{};manualCourtTest=true;paused=false;document.getElementById('reduceMotion').checked=true;startBarDemo();");
  let done = false;
  for (let batch = 0; batch < 180; batch++) {
    done = await page.evaluate("(()=>{for(let i=0;i<12;i++)simulationTick(1/24);return courtVisit===null&&courtQueue.length===0;})()");
    if (done) break;
  }
  expect(done).toBe(true);
  const result = await page.evaluate("({seated:results.court.events.filter(e=>e.type==='seated').map(e=>e.id),error:results.court.max_foot_ik_error_m,errors:results.errors})");
  expect(result.seated).toEqual(["client_prevenu", "temoin_01"]);
  expect(result.error).toBeLessThan(0.005);
  expect(result.errors).toEqual([]);
});
