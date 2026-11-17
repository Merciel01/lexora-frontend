import {test,expect} from '@playwright/test';

test('la scène libère du CPU pendant le traitement puis reprend son rendu',async({page})=>{
  test.setTimeout(60000);
  await page.goto('/courtroom/index.html?embed=1');
  await expect.poll(()=>page.evaluate('window.lexoraBootReady'),{timeout:45000}).toBe(true);
  const send=(processing:boolean)=>page.evaluate(processing=>window.postMessage({channel:'lexora-courtroom',version:1,type:'state',state:{activeSpeaker:'president',speaking:false,processing,objection:false,reduced:false,quality:'low',cameraMode:'wide',gesture:'neutral',emotion:'neutral'}},location.origin),processing);
  await send(true);
  await expect.poll(()=>page.evaluate('window.lexoraProcessing')).toBe(true);
  const start=await page.evaluate('renderer.info.render.frame');
  await page.waitForTimeout(1100);
  const limited=await page.evaluate('renderer.info.render.frame')-start;
  expect(limited).toBeGreaterThan(0);
  expect(limited).toBeLessThanOrEqual(15);
  await send(false);
  await expect.poll(()=>page.evaluate('window.lexoraProcessing')).toBe(false);
  const resumed=await page.evaluate('renderer.info.render.frame');
  await page.waitForTimeout(1100);
  expect(await page.evaluate('renderer.info.render.frame')-resumed).toBeGreaterThan(limited);
});
