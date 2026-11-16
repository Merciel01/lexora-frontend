import {test,expect} from '@playwright/test';

test('Groq simulé : guide, streaming, annulation, poursuite et verdict',async({page})=>{
 test.skip(process.env.LEXORA_TEST_MOCK_GROQ!=='1','Fournisseur simulé explicite');test.setTimeout(120000);
 const post=async(url:string,data:unknown)=>{const csrf=(await (await page.request.get('/api/auth/csrf')).json()).csrfToken;const r=await page.request.post(url,{data,headers:{'X-CSRFToken':csrf}});expect(r.ok(),await r.text()).toBe(true);return r.json();};
 const email=`groq-${Date.now()}@lexora.test`,password='MigrationRecipe!928461';
 await post('/api/auth/register',{name:'Recette migration',email,password});await post('/api/auth/login',{email,password});
 const cases=await (await page.request.get('/api/cases?role_id=defense')).json();const caseId=cases.results[0].id;
 const guide=await post(`/api/cases/${caseId}/guide`,{clientMessageId:'guide-test',roleId:'defense',intent:'question',message:'Comment examiner les pièces ?',history:[]});
 expect(guide.engine).toBe('external');expect(guide.diagnostics.provider).toBe('groq');
 const trial=await post('/api/trials',{caseId,roleId:'defense'});const state=async()=> (await page.request.get(`/api/trials/${trial.id}`)).json();
 await page.goto(`/app/trials/${trial.id}`);await expect(page.getByText('CONNECTÉ À DJANGO')).toBeVisible();
 for(const step of [1,2]){await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();await expect.poll(async()=> (await state()).step).toBe(step);}
 await page.getByLabel('Votre argumentation').fill('ANNULATION_TEST Je souhaite examiner les pièces.');await page.getByRole('button',{name:'Envoyer',exact:true}).click();
 await expect(page.getByRole('region',{name:'Réponse en cours',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Annuler la réponse',exact:true}).click();
 await expect(page.getByRole('region',{name:'Réponse en cours',exact:true})).toBeHidden();
 expect((await state()).entries.filter((e:{speaker:string})=>e.speaker==='Vous')).toHaveLength(0);
 await page.getByLabel('Votre argumentation').fill('Je distingue les faits établis des suppositions et examine les pièces.');await page.getByRole('button',{name:'Envoyer',exact:true}).click();
 await expect.poll(async()=> (await state()).entries.filter((e:{speaker:string})=>e.speaker==='Vous').length).toBe(1);
 expect((await state()).generationDiagnostics.provider).toBe('groq');
 for(const step of [3,4,5]){await page.getByRole('button',{name:'Terminer mon intervention',exact:true}).click();await expect.poll(async()=> (await state()).step).toBe(step);}
 await page.getByRole('button',{name:'Consulter le jugement',exact:true}).click();await expect.poll(async()=> (await state()).finished).toBe(true);
 const result=await (await page.request.get(`/api/trials/${trial.id}/result`)).json();expect(result.decision.engine).toBe('external');
 await page.getByRole('link',{name:'Consulter mon évaluation',exact:true}).click();await expect(page.getByRole('heading',{name:'Jugement motivé'})).toBeVisible();
});
