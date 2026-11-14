import {afterEach,expect,it,vi} from "vitest";
import {remoteAudioItem} from "./queue";
afterEach(()=>vi.unstubAllGlobals());
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
