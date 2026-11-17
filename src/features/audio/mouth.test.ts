import { describe, expect, it, vi } from "vitest";
import { mouthAmplitude, mouthShapeAt, parseMouthCues, followAudioMouth } from "./mouth";

describe("voice amplitude envelope", () => {
  it("uses real audio time, silence gaps and exact cue boundaries", () => {
    const cues=parseMouthCues([{start:0,end:.2,value:"A"},{start:.3,end:.5,value:"F"}]);
    expect(mouthShapeAt(cues,.1)).toBe("A");
    expect(mouthShapeAt(cues,.2)).toBe("X");
    expect(mouthShapeAt(cues,.3)).toBe("F");
    expect(mouthShapeAt(cues,2)).toBe("X");
  });
  it("rejects malformed and overlapping metadata", () => {
    for (const bad of [null,[{start:0,end:2,value:"Z"}],[{start:0,end:301,value:"A"}],
      [{start:0,end:2,value:"A"},{start:1,end:3,value:"B"}]]) expect(parseMouthCues(bad)).toEqual([]);
  });
  it("closes the mouth for silence and low background noise", () => {
    expect(mouthAmplitude(new Uint8Array())).toBe(0);
    expect(mouthAmplitude(new Uint8Array(512).fill(128))).toBe(0);
    expect(mouthAmplitude(Uint8Array.from([127,129,128,128]))).toBe(0);
  });
  it("responds to speech energy without exceeding morph bounds", () => {
    const soft=mouthAmplitude(Uint8Array.from([120,136,120,136]));
    const loud=mouthAmplitude(Uint8Array.from([96,160,96,160]));
    expect(soft).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(soft);
    expect(loud).toBeLessThanOrEqual(1);
    expect(mouthAmplitude(Uint8Array.from([0,255]))).toBe(1);
  });
});

it("does not route audio into a suspended audio context",async()=>{
  const source=vi.fn();
  vi.stubGlobal("AudioContext",vi.fn(function(){return {state:"suspended",resume:()=>Promise.resolve(),createMediaElementSource:source,createAnalyser:()=>({fftSize:0,getByteTimeDomainData:vi.fn()}),close:()=>Promise.resolve()};}));
  const stop=followAudioMouth({paused:false,ended:false} as HTMLAudioElement,()=>{});
  await Promise.resolve(); expect(source).not.toHaveBeenCalled();stop();vi.unstubAllGlobals();
});
