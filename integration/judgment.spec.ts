import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('le président rend un verdict motivé et l’évaluation porte sur ses points décisifs',async({page})=>{
  test.skip(process.env.LEXORA_TEST_LOCAL_LLM!=='1','Recette Qwen explicite');
  test.setTimeout(420000);
  const post=async(url:string,data:unknown)=>{
    const csrf=(await (await page.request.get('/api/auth/csrf')).json()).csrfToken;
    const r=await page.request.post(url,{data,headers:{'X-CSRFToken':csrf}});
    expect(r.ok(),await r.text()).toBe(true);return r.json();
  };
  const email=`judge-${Date.now()}@lexora.test`,password='JudgeRecipe!928461';
  await post('/api/auth/register',{name:'Recette verdict',email,password});await post('/api/auth/login',{email,password});
  const cases=await (await page.request.get('/api/cases?role_id=defense')).json();
  const trial=await post('/api/trials',{caseId:cases.results[0].id,roleId:'defense'});
  const state=async()=> (await page.request.get('/api/trials/'+trial.id)).json();
  await page.goto('/app/trials/'+trial.id);
  await expect(page.getByText('CONNECTÉ À DJANGO')).toBeVisible();
  for(const step of [1,2]){
    await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();
    await expect.poll(async()=> (await state()).step).toBe(step);
  }
  await page.getByLabel('Votre argumentation').fill('Les retraits ne démontrent pas leur destination. Je demande que les justificatifs incomplets et les autorisations soient confrontés avant de retenir l’accusation.');
  await page.getByRole('button',{name:'Envoyer',exact:true}).click();
  await expect.poll(async()=> (await state()).entries.filter((e:{speaker:string})=>e.speaker==='Vous').length,{timeout:150000}).toBe(1);
  for(const step of [3,4,5]){
    await page.getByRole('button',{name:'Terminer mon intervention',exact:true}).click();
    await expect.poll(async()=> (await state()).step).toBe(step);
  }
  await page.getByRole('button',{name:'Consulter le jugement',exact:true}).click();
  await expect.poll(async()=> (await state()).finished,{timeout:210000}).toBe(true);
  const final=await state();
  const r=await page.request.get('/api/trials/'+trial.id+'/result');expect(r.status()).toBe(200);
  const verdict=await r.json();
  expect(verdict.decision.engine).toBe('local');expect(verdict.decision.motivation.length).toBeGreaterThan(20);
  expect(verdict.criteria.some((c:{id:string})=>c.id==='decision')).toBe(true);
  expect(final.entries.at(-1).speaker).toBe('Le président');
  expect(final.entries.at(-1).text).toContain(verdict.outcome);
  await page.getByRole('link',{name:'Consulter mon évaluation',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Jugement motivé'})).toBeVisible();
  await expect(page.getByText(verdict.outcome,{exact:true})).toBeVisible();
  await expect(page.getByText('Réponse aux points décisifs du verdict',{exact:true})).toBeVisible();
  await writeFile('test-results/judgment-real.json',JSON.stringify(verdict,null,2));
  await page.screenshot({path:'test-results/judgment-real.png',fullPage:true});
});
