import {test,expect} from '@playwright/test';

test('ouverture automatique, attente étudiant et vrai micro transcrit localement',async({page,context})=>{
  test.skip(!process.env.LEXORA_TEST_MIC_FILE,'Recette avec fichier vocal synthétique requise');
  test.setTimeout(240000);
  await context.grantPermissions(['microphone']);
  const events: {type:string;snapshot?:{step:number};speaker?:string;text?:string}[]=[];
  page.on('websocket',ws=>ws.on('framereceived',frame=>{if(typeof frame.payload==='string')events.push(JSON.parse(frame.payload));}));
  const email=`auto-${Date.now()}@lexora.test`,password='AutoVoiceRecipe!928461';
  await page.goto('/register');
  await page.getByLabel('Nom complet').fill('Recette audience automatique');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe',{exact:true}).fill(password);
  await page.getByLabel('Confirmer le mot de passe').fill(password);
  await page.getByRole('button',{name:'Créer mon compte'}).click();
  await expect(page.getByText('Compte créé. Vous pouvez maintenant vous connecter à LEXORA.')).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole('link',{name:'Commencer une simulation'}).click();
  await page.getByRole('link',{name:'Choisir un dossier'}).click();
  await page.getByRole('link',{name:'Consulter le dossier'}).first().click();
  await page.getByRole('link',{name:'Vérifier mon équipement'}).click();
  await page.getByRole('button',{name:'Entrer dans la salle'}).click();
  await expect(page.getByText('CONNECTÉ À DJANGO')).toBeVisible();
  const trialId=page.url().split('/').at(-1)!;
  const state=async()=> (await page.request.get(`/api/trials/${trialId}`)).json();
  // Exercise toggle capture explicitly, independent of the account's saved preference.
  await page.getByLabel('Utiliser le mode démarrer / arrêter').check();
  await page.getByRole('button',{name:'Voir la salle 3D'}).click();
  await expect(page.frameLocator('iframe[title="Salle d’audience 3D Lexora"]').locator('canvas')).toBeVisible();
  await expect(page.locator('.courtroom-loading')).toBeHidden({timeout:90000});
  const sceneMic=page.getByRole('group',{name:'Microphone dans la scène',exact:true});
  await expect(sceneMic).toBeVisible();
  expect((await state()).audioCodecs.length).toBeGreaterThan(0);
  const opening=page.waitForResponse(r=>r.url().includes('/audio/'),{timeout:120000});
  await page.getByRole('button',{name:'Démarrer l’audience automatique',exact:true}).click();
  expect((await opening).status()).toBe(200);
  await expect.poll(async()=> (await state()).step,{timeout:150000}).toBe(2);
  // No manual court-advance click was needed for opening and facts.
  await expect(page.getByRole('button',{name:'Démarrer la capture',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:'Démarrer la capture',exact:true}).click();
  await expect(sceneMic.getByText('Enregistrement en cours',{exact:true})).toBeVisible();
  const sceneBox=await page.locator('.court-scene').boundingBox(),micBox=await sceneMic.boundingBox();
  expect(micBox!.y).toBeGreaterThanOrEqual(sceneBox!.y);
  expect(micBox!.y+micBox!.height).toBeLessThanOrEqual(sceneBox!.y+sceneBox!.height);
  await page.locator('.court-scene').screenshot({path:'test-results/scene-microphone-recording.png'});
  // Keep genuine MediaRecorder running long enough to capture the synthetic spoken phrase.
  await page.waitForTimeout(6000);
  expect((await state()).step).toBe(2);
  await page.getByRole('button',{name:'Arrêter la capture',exact:true}).click();
  await expect.poll(()=>events.find(e=>e.type==='turn'&&e.speaker==='student')?.text,{timeout:60000}).toContain('calme');
  await expect.poll(()=>events.filter(e=>e.type==='turn'&&e.speaker==='president').length,{timeout:60000}).toBeGreaterThan(1);
  expect((await state()).step).toBe(2); // Do not steal the student's remaining speaking time.
  await page.getByRole('button',{name:'Mettre l’audience en pause',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reprendre l’audience',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/automatic-voice-real.png',fullPage:true});
  await page.getByRole('button',{name:'Reprendre l’audience',exact:true}).click();
  await expect(page.getByRole('button',{name:'Terminer mon intervention',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:'Terminer mon intervention',exact:true}).click();
  await expect.poll(async()=> (await state()).step,{timeout:60000}).toBe(4); // prosecution speaks, then replies open automatically
  await expect(page.getByRole('button',{name:'Terminer mon intervention',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:'Terminer mon intervention',exact:true}).click();
  await expect.poll(async()=> (await state()).finished,{timeout:60000}).toBe(true); // deliberation -> closing without another click
});
