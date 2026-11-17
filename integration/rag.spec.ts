import {test,expect} from '@playwright/test';

test('RAG réel : accès authentifié et abstention sans source validée',async({page})=>{
  const post=async(url:string,data:unknown)=>{
    const csrf=(await(await page.request.get('/api/auth/csrf')).json()).csrfToken;
    const result=await page.request.post(url,{data,headers:{'X-CSRFToken':csrf}});
    expect(result.ok(),await result.text()).toBe(true);return result.json();
  };
  const email=`rag-${Date.now()}@lexora.test`,password='RagTest!928461';
  await post('/api/auth/register',{name:'Essai RAG',email,password});
  await post('/api/auth/login',{email,password});
  const cases=await(await page.request.get('/api/cases?role_id=defense')).json();
  const trial=await post('/api/trials',{caseId:cases.results[0].id,roleId:'defense'});
  await page.goto(`/app/trials/${trial.id}`);
  await expect(page.getByText('CONNECTÉ À DJANGO')).toBeVisible();
  await page.getByText('Consulter les sources juridiques',{exact:true}).click();
  await page.getByLabel('Votre question',{exact:true}).fill('Quelles sources validées traitent de la présomption d’innocence ?');
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/ai/rag'));
  await page.getByRole('button',{name:'Rechercher',exact:true}).click();
  const response=await pending;
  expect(response.status()).toBe(200);
  const result=await response.json();
  expect(result.status).toBe('no_validated_source');
  expect(result.citations).toEqual([]);expect(result.retrievedSources).toEqual([]);
  await expect(page.getByText(result.text,{exact:true})).toBeVisible();
  await expect(page.getByText('Aucune source juridique validée ne correspond à cette recherche.',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/rag-no-approved-sources.png',fullPage:true});
});
