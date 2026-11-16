import {afterEach,expect,it,vi} from "vitest";
import {remoteAudioItem} from "./queue";
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it("does not advance past a phrase ending before the advertised duration",async()=>{
  const audio={currentTime:3,duration:12,play:()=>Promise.resolve(),removeAttribute:vi.fn(),onended:()=>{}};
  vi.stubGlobal("Audio",vi.fn(function(){return audio;}));
  const result=expect(remoteAudioItem("cut","turn",0,"/audio").play()).rejects.toThrow("avant sa fin");
  audio.onended();
  await result;
});
it("starts voice immediately while optional lip analysis is pending and cancels both",async()=>{
  const audio={currentTime:0,play:vi.fn(()=>Promise.resolve()),pause:vi.fn(),removeAttribute:vi.fn(),load:vi.fn()};
  vi.stubGlobal("Audio",vi.fn(function(){return audio;}));
  vi.stubGlobal("location",{href:"http://localhost/app/trials/test"});
  let signal:AbortSignal;
  vi.stubGlobal("fetch",vi.fn((_url,options)=>new Promise((_resolve,reject)=>{
    signal=options.signal;
    signal.addEventListener("abort",()=>reject(new Error("aborted")));
  })));
  const item=remoteAudioItem("id","turn",0,"/api/trials/test/audio/turn",undefined,undefined,()=>{});
  const playback=item.play();
  expect(audio.play).toHaveBeenCalledOnce();
  item.stop(); await playback;
  expect(signal!.aborted).toBe(true);
  expect(audio.pause).toHaveBeenCalledOnce();
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
