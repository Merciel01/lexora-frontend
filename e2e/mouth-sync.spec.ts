import {test,expect} from '@playwright/test';

test('bouche pilotée par amplitude, silence, expiration et mouvements réduits',async({page})=>{
  test.setTimeout(60000);
  await page.goto('/courtroom/index.html?embed=1');
  await expect.poll(()=>page.evaluate('window.lexoraBootReady'),{timeout:45000}).toBe(true);
  const state={activeSpeaker:'president',speaking:true,objection:false,reduced:false,quality:'low',cameraMode:'speaker',gesture:'neutral',emotion:'neutral',mouthLevel:.8};
  const send=async(patch={})=>page.evaluate(s=>window.postMessage({channel:'lexora-courtroom',version:1,type:'state',state:s},location.origin),{...state,...patch});
  await send();
  await expect.poll(()=>page.evaluate('actors.president.voiceMouth||0')).toBeGreaterThan(.1);
  expect(await page.evaluate('Object.values(actors).filter(a=>a.id!==speakerId).every(a=>(a.voiceMouth||0)<.01)')).toBe(true);
  await page.locator('canvas').screenshot({path:'test-results/mouth-speaking-'+test.info().project.name+'.png'});
  await send({mouthLevel:0});
  await expect.poll(()=>page.evaluate('actors.president.voiceMouth||0')).toBeLessThan(.01);
  await send({mouthShape:'F'});
  await expect.poll(()=>page.evaluate('actors.president.voiceWeights?.[3]||0')).toBeGreaterThan(.2);
  await send({mouthShape:'A'});
  await expect.poll(()=>page.evaluate('actors.president.voiceWeights?.[4]||0')).toBeGreaterThan(.2);
  await expect.poll(()=>page.evaluate('actors.president.voiceWeights?.[0]||0')).toBeLessThan(.01);
  await send({mouthShape:'X'});
  await expect.poll(()=>page.evaluate('actors.president.voiceWeights?.every(v=>v<.01)')).toBe(true);
  await send({gesture:'reading'});
  await expect.poll(()=>page.evaluate('actors.president.voiceMouth||0')).toBeGreaterThan(.1);
  await send();
  await expect.poll(()=>page.evaluate('actors.president.voiceMouth||0')).toBeGreaterThan(.1);
  // A lost/stalled parent must not leave the mouth open indefinitely.
  await expect.poll(()=>page.evaluate('actors.president.voiceMouth||0')).toBeLessThan(.01);
  await send({reduced:true});
  await page.waitForTimeout(150);
  expect(await page.evaluate('actors.president.voiceMouth||0')).toBeLessThan(.01);
  await send({mouthLevel:2});
  expect(await page.evaluate('window.lexoraMouth.level')).toBe(.8);
});
