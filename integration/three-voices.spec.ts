import {test,expect} from '@playwright/test';

test('audience réelle : Kokoro greffier, Piper Pierre et Jessica',async({page})=>{
  test.skip(process.env.LEXORA_TEST_THREE_VOICES!=='1','Trois voix locales requises');
  test.setTimeout(240000);
  const email=`voices-${Date.now()}@lexora.test`,password='VoicesRecipe!928461';
  await page.goto('/register');
  await page.getByLabel('Nom complet').fill('Recette trois voix');
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
  await page.getByRole('button',{name:'Activer le son',exact:true}).click();
  for(const [provider,voice] of [['kokoro','ff_siwis'],['piper','pierre'],['piper','jessica']]){
    const audio=page.waitForResponse(r=>r.url().includes('/audio/'),{timeout:150000});
    await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();
    const response=await audio;
    expect(response.status(),await response.text().catch(()=>'' )).toBe(200);
    expect(response.headers()['x-lexora-tts-provider']).toBe(provider);
    expect(response.headers()['x-lexora-tts-voice']).toContain(voice);
    const body=await response.body(); expect(body.subarray(0,4).toString()).toBe('RIFF');
    // Decode the actual returned sound in Chrome: validates browser audio format support.
    const duration=await page.evaluate(async bytes=>{
      const ctx=new AudioContext();try{return (await ctx.decodeAudioData(Uint8Array.from(bytes).buffer)).duration;}finally{await ctx.close();}
    },Array.from(body));
    expect(duration).toBeGreaterThan(1);
  }
  await page.screenshot({path:'test-results/three-voices-audience.png',fullPage:true});
});
