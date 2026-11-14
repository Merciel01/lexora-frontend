import { describe, expect, it } from "vitest";
import { mouthAmplitude } from "./mouth";

describe("voice amplitude envelope", () => {
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
