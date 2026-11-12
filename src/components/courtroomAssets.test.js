import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
const directory = new URL("../../public/courtroom/", import.meta.url);
it("ships nine intact GLB characters and a separate local decor", () => {
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
  expect(manifest.version).toBe(27);
  expect(manifest.assets).toHaveLength(10);
  expect(new Set(manifest.assets.map(a => a.id)).size).toBe(10);
  for (const asset of manifest.assets) {
    const data = readFileSync(new URL(asset.file, directory));
    expect(data.readUInt32LE(0)).toBe(0x46546c67);
    expect(createHash("sha256").update(data).digest("hex")).toBe(asset.sha256);
  }
});
it("ships syntactically valid classic scripts without a build-time Blender dependency", () => {
  for (const file of ["engine.js", "data.js", "runtime.js", "lexora-bridge.js"]) {
    expect(() => new Script(readFileSync(new URL(file, directory), "utf8"), { filename: file })).not.toThrow();
  }
});
