import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

test('plays all three real local WAVs through their final frame',async({page})=>{
  test.skip(process.env.LEXORA_TEST_VOICE_CONTINUITY!=='1','Requires generated local voice samples');
  test.setTimeout(120000);
  await page.goto('/login');
  for(const role of ['president','prosecutor','clerk']){
    const bytes=readFileSync(resolve('../lexora-backend/.lexora-logs/french-voices',`${role}.wav`));
    await page.route('**/continuity.wav',route=>route.fulfill({contentType:'audio/wav',body:bytes}));
    await page.evaluate(async()=>{
      // Exercise the production player, including the Web Audio mouth analyser.
      const {remoteAudioItem}=await import(/* @vite-ignore */ '/src/features/audio/queue.ts');
      const NativeAudio=window.Audio;
      let actual:HTMLAudioElement;
      let finalTime=0,finalDuration=0;
      window.Audio=function(url:string){actual=new NativeAudio(url);actual.addEventListener('ended',()=>{finalTime=actual.currentTime;finalDuration=actual.duration;});return actual;} as typeof Audio;
      const button=document.createElement('button');button.textContent='Test continuity';
      button.onclick=()=>{
        const item=remoteAudioItem('sample','sample',0,'/continuity.wav',undefined,()=>{});
        (window as unknown as {continuity:Promise<unknown>}).continuity=item.play().then(()=>({time:finalTime,duration:finalDuration}));
        window.Audio=NativeAudio;
      };
      document.body.append(button);
    });
    await page.getByRole('button',{name:'Test continuity',exact:true}).click();
    const result=await page.evaluate(async()=>await (window as unknown as {continuity:Promise<{time:number;duration:number}>}).continuity);
    expect(result.duration).toBeGreaterThan(5);
    expect(result.time).toBeGreaterThanOrEqual(result.duration-.1);
    await page.getByRole('button',{name:'Test continuity',exact:true}).evaluate(el=>el.remove());
    await page.unroute('**/continuity.wav');
  }
});
