import {afterEach,expect,it,vi} from "vitest";
import {remoteAudioItem} from "./queue";
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it("cancels optional mouth analysis without starting an orphaned voice",async()=>{
  const Audio=vi.fn();
  vi.stubGlobal("Audio",Audio);
  vi.stubGlobal("location",{href:"http://localhost/app/trials/test"});
  vi.stubGlobal("fetch",vi.fn((_url,options)=>new Promise((_resolve,reject)=>{
    options.signal.addEventListener("abort",()=>reject(new Error("aborted")));
  })));
  const item=remoteAudioItem("id","turn",0,"/api/trials/test/audio/turn",undefined,undefined,()=>{});
  const playback=item.play();
  item.stop();
  await playback;
  expect(Audio).not.toHaveBeenCalled();
});

it("rejects stalled playback and leaves the phrase retryable",async()=>{
  vi.useFakeTimers();
  const pause=vi.fn();
  vi.stubGlobal("Audio",vi.fn(function(){return {currentTime:0,play:()=>Promise.resolve(),pause};}));
  const item=remoteAudioItem("stalled","turn",0,"/audio");
  const result=expect(item.play()).rejects.toThrow("ne progresse plus");
  await vi.advanceTimersByTimeAsync(47000);
  await result;
  expect(pause).toHaveBeenCalled();
});
it("keeps playing while audio time advances",async()=>{
  vi.useFakeTimers();
  const audio={currentTime:0,play:()=>Promise.resolve(),pause:vi.fn(),removeAttribute:vi.fn(),load:vi.fn()};
  vi.stubGlobal("Audio",vi.fn(function(){return audio;}));
  const item=remoteAudioItem("progress","turn",0,"/audio");
  const playback=item.play();
  for(let i=0;i<6;i++){audio.currentTime+=10;await vi.advanceTimersByTimeAsync(10000);}
  expect(audio.pause).not.toHaveBeenCalled();
  item.stop();await playback;
  expect(vi.getTimerCount()).toBe(0);
});
