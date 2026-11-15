import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('réponse locale réelle dans une audience sans fournisseur externe',async({page})=>{
  test.skip(process.env.LEXORA_TEST_LOCAL_LLM!=='1','Recette CPU explicite uniquement');
  test.setTimeout(240000);
  const post=async(url:string,data:unknown)=>{
    const csrf=(await (await page.request.get('/api/auth/csrf')).json()).csrfToken;
    const response=await page.request.post(url,{data,headers:{'X-CSRFToken':csrf}});
    expect(response.ok(),await response.text()).toBe(true);
    return response.json();
  };
  const email=`court-${Date.now()}@lexora.test`,password='LocalCourtRecipe!928461';
  await post('/api/auth/register',{name:'Recette cour locale',email,password});
  await post('/api/auth/login',{email,password});
  const cases=await (await page.request.get('/api/cases?role_id=defense')).json();
  const created=await post('/api/trials',{caseId:cases.results[0].id,roleId:'defense'});
  const state=async()=> (await page.request.get('/api/trials/'+created.id)).json();
  await page.goto('/app/trials/'+created.id);
  await expect(page.getByText('CONNECTÉ À DJANGO')).toBeVisible();
  await expect(page.getByText(/Réponses aux interventions : modèle local/)).toBeVisible();
  if(process.env.LEXORA_TEST_ROOM==='1'){
    await page.getByRole('button',{name:'Voir la salle 3D'}).click();
    await expect(page.locator('iframe[title="Salle d’audience 3D Lexora"]')).toBeVisible();
    await expect(page.locator('.courtroom-loading')).toBeHidden({timeout:90000});
  }
  await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();
  await expect.poll(async()=> (await state()).step).toBe(1);
  await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();
  await expect.poll(async()=> (await state()).step).toBe(2);
  await page.getByLabel('Votre argumentation').fill('Je demande de distinguer ce qui a été directement observé des suppositions. Quelle pièce permet de vérifier cette distinction ?');
  const started=Date.now();
  await page.getByRole('button',{name:'Envoyer',exact:true}).click();
  await expect(page.getByText(/La cour prépare sa réponse/)).toBeVisible();
  if(process.env.LEXORA_TEST_ROOM==='1'){
    await page.waitForTimeout(2100);
    await expect(page.getByRole('group',{name:'Microphone dans la scène',exact:true})).toContainText(/Traitement de votre intervention… \d+ s/);
    await page.locator('.court-scene').screenshot({path:'test-results/local-court-processing.png'});
  }
  await expect.poll(async()=> (await state()).entries.filter((e:{speaker:string})=>e.speaker==='Vous').length,{timeout:150000}).toBe(1);
  const final=await state(),answer=final.entries.at(-1).text;
  expect(answer.length).toBeGreaterThan(15);
  expect(answer).not.toMatch(/^Intervention enregistrée\./);
  expect(final.step).toBe(2);
  const displayed=page.locator('.transcript-panel').getByText(answer,{exact:true});
  await expect(displayed).toBeVisible();
  await displayed.scrollIntoViewIfNeeded();
  await writeFile('test-results/local-court-answer.json',JSON.stringify({caseId:final.caseId,engine:final.replyEngine,elapsedSeconds:(Date.now()-started)/1000,answer},null,2));
  await test.info().attach('réponse-locale',{body:JSON.stringify({caseId:final.caseId,engine:final.replyEngine,answer}),contentType:'application/json'});
  await page.screenshot({path:'test-results/local-court.png',fullPage:true});
  if(process.env.LEXORA_TEST_ROOM==='1'){
    await page.getByLabel('Votre argumentation').fill('Les trois retraits sont établis, mais je conteste que leur montant prouve leur destination. Quelle pièce documente leur usage ?');
    const nextStart=Date.now();
    await page.getByRole('button',{name:'Envoyer',exact:true}).click();
    await expect.poll(async()=> (await state()).entries.filter((e:{speaker:string})=>e.speaker==='Vous').length,{timeout:150000}).toBe(2);
    const next=await state();
    await writeFile('test-results/local-court-followup.json',JSON.stringify({elapsedSeconds:(Date.now()-nextStart)/1000,answer:next.entries.at(-1).text},null,2));
  }
});
