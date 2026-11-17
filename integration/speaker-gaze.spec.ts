import {test,expect} from '@playwright/test';

test('les orateurs regardent devant ou leurs notes, sans suivre le précédent intervenant',async({page})=>{
 test.setTimeout(150000);
 await page.goto('/courtroom/index.html?embed=1');
 await expect.poll(()=>page.evaluate('window.lexoraBootReady===true'),{timeout:90000}).toBe(true);
 for(const id of ['president','assesseur_01','assesseur_02','greffier']){
  await page.evaluate(`previousSpeakerId='ministere_public';clock=0;change(actors[${JSON.stringify(id)}],'speaking');`);
  await page.waitForTimeout(2200);
  const state=await page.evaluate(`(()=>{const a=actors[${JSON.stringify(id)}],head=bone(a,'head'),front=a.headAxis.clone().applyQuaternion(head.getWorldQuaternion(new Q())),target=attentionTarget(a);return {mode:target.mode,targetId:target.id,alignment:front.dot(new V(0,0,1).applyQuaternion(a.root.getWorldQuaternion(new Q())))}})()`);
  expect(state.mode).toBe('forward');expect(state.targetId).toBeNull();expect(state.alignment).toBeGreaterThan(.65);
 }
 await page.evaluate("chooseView('assesseur_02');change(actors.assesseur_02,'speaking');clock=0;");
 await page.waitForTimeout(1800);
 await page.screenshot({path:'test-results/speaker-forward.png'});
 await page.evaluate("change(actors.assesseur_02,'reading');");
 await page.waitForTimeout(1800);
 expect(await page.evaluate("attentionTarget(actors.assesseur_02).mode")).toBe('notes');
 await page.screenshot({path:'test-results/speaker-document.png'});
});
