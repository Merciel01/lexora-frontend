import {test,expect} from '@playwright/test';

test('une fin d’intervention envoyée fait avancer sans bouton Terminer',async({page})=>{
  test.setTimeout(120000);
  const email=`handover-${Date.now()}@lexora.test`,password='HandoverTest!928461';
  await page.goto('/register');
  await page.getByLabel('Nom complet').fill('Test passage naturel');
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
  const id=page.url().split('/').at(-1);
  const state=async()=>(await page.request.get(`/api/trials/${id}`)).json();
  // Only the opening is advanced manually; no finish button is used below.
  for(const step of [1,2]){
    await page.getByRole('button',{name:'Écouter la cour',exact:true}).click();
    await expect.poll(async()=>(await state()).step).toBe(step);
  }
  await page.getByLabel('Votre argumentation').fill("Je n'ai pas fini ma défense");
  await page.getByRole('button',{name:'Envoyer',exact:true}).click();
  await expect(page.getByLabel('Votre argumentation')).toHaveValue('');
  expect((await state()).step).toBe(2);
  for(const [step,text] of [[3,"c'est bon pour moi, j'ai fini ma défense"],[4,"Je n'ai rien à ajouter"],[5,'ma défense est déjà complète']] as const){
    await page.getByLabel('Votre argumentation').fill(text);
    await page.getByRole('button',{name:'Envoyer',exact:true}).click();
    await expect.poll(async()=>(await state()).step).toBe(step);
  }
  expect((await state()).finished).toBe(false);
  await page.getByRole('button',{name:'Consulter le jugement',exact:true}).click();
  await expect(page.getByRole('link',{name:'Consulter mon évaluation'})).toBeVisible();
  expect((await state()).hasDecision).toBe(true);
});
