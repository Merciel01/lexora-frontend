import {test,expect} from '@playwright/test';

test('micro dans la scène et caméra automatique respectant les vues manuelles',async({page})=>{
  test.setTimeout(120000);
  await page.goto('/app/trials/demo');
  await page.getByRole('button',{name:'Voir la salle 3D'}).click();
  const iframe=page.locator('iframe[title="Salle d’audience 3D Lexora"]');
  await expect(iframe).toBeVisible();
  await expect(page.locator('.courtroom-loading')).toBeHidden({timeout:60000});
  await expect(page.getByLabel('Point de vue')).toHaveValue('auto');
  const mic=page.getByRole('group',{name:'Microphone dans la scène',exact:true});
  await expect(mic).toBeVisible();
  const sceneBox=await page.locator('.court-scene').boundingBox(),box=await mic.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(sceneBox!.x);
  expect(box!.x+box!.width).toBeLessThanOrEqual(sceneBox!.x+sceneBox!.width);
  expect(box!.y+box!.height).toBeLessThanOrEqual(sceneBox!.y+sceneBox!.height);
  const frame=page.frames().find(f=>f.url().includes('/courtroom/index.html?embed=1'))!;
  const initial=await frame.evaluate('viewMode');
  await expect.poll(()=>frame.evaluate('viewMode'),{timeout:16000}).not.toBe(initial);
  await page.getByLabel('Point de vue').selectOption('wide');
  await expect.poll(()=>frame.evaluate('viewMode')).toBe('general');
  await page.waitForTimeout(13000);
  expect(await frame.evaluate('viewMode')).toBe('general');
  await page.getByLabel('Point de vue').selectOption('auto');
  // Reduced motion must prevent automatic shot changes.
  await page.evaluate(()=>document.querySelector<HTMLIFrameElement>('iframe')!.contentWindow!.postMessage({channel:'lexora-courtroom',version:1,type:'state',state:{activeSpeaker:'president',speaking:false,objection:false,reduced:true,quality:'low',cameraMode:'auto',gesture:'neutral',emotion:'neutral'}},location.origin));
  await expect.poll(()=>frame.evaluate('viewMode')).toBe('general');
  await page.waitForTimeout(13000);
  expect(await frame.evaluate('viewMode')).toBe('general');
  await page.locator('.court-scene').screenshot({path:'test-results/scene-camera-'+test.info().project.name+'.png'});
});
