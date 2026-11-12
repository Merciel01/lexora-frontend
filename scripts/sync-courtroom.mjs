// Import the validated Skillforce scene. No Blender files or user profiles enter Git.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "..");
const source = resolve(process.argv[2] || join(root, "../Skillforce_Blender"));
const target = join(root, "public/courtroom");
await mkdir(join(target, "assets"), { recursive: true });
await mkdir(join(target, "licenses"), { recursive: true });
const web = join(source, "cour_v04/web");
const map = JSON.parse(await readFile(join(source, "cour_v04/state_mapping.json"), "utf8"));
const overrides = JSON.parse(await readFile(join(web, "asset_overrides.json"), "utf8"));
const assets = [];
for (const [id, config] of Object.entries(map)) {
  const file = resolve(web, overrides[id].source);
  const name = basename(file);
  await copyFile(file, join(target, "assets", name));
  config.asset_url = "./assets/" + name;
  assets.push({ id, file: "assets/" + name, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
}
const decor = join(source, "cour_v27/salle_decor_v27.glb");
await copyFile(decor, join(target, "assets/salle_decor_v27.glb"));
assets.push({ id: "decor", file: "assets/salle_decor_v27.glb", sha256: createHash("sha256").update(await readFile(decor)).digest("hex") });
const room = JSON.parse(await readFile(join(source, "cour_v27/salle_layout_v27.json"), "utf8"));
await writeFile(join(target, "data.js"), `const LEXORA_EMBED=new URLSearchParams(location.search).get('embed')==='1';if(LEXORA_EMBED)document.documentElement.dataset.embed='true';\nconst MAP=${JSON.stringify(map)};const ROOM=${JSON.stringify(room)};const EMBED=null;\n`);
let runtime = await readFile(join(web, "app.js"), "utf8");
const oldLoader = "const raw=Uint8Array.from(atob(DECOR_EMBED),c=>c.charCodeAt(0));const gltf=await new Promise((yes,no)=>loader.parse(raw.buffer,'',yes,no));";
if (!runtime.includes(oldLoader) || !runtime.includes("timeline('audience');last=performance.now();")) throw new Error("Scene importer needs review: upstream bootstrap changed");
runtime = runtime.replace(oldLoader, "const gltf=await loader.loadAsync('./assets/salle_decor_v27.glb');")
  .replace("timeline('audience');last=performance.now();", "if(!LEXORA_EMBED)timeline('audience');else{schedule=null;releaseFloor();window.lexoraBootReady=true;window.lexoraSceneReady?.();}last=performance.now();")
  .replace("})().catch(e=>{", "})().catch(e=>{window.lexoraBootFailed=true;if(LEXORA_EMBED)parent.postMessage({channel:'lexora-courtroom',version:1,type:'unavailable'},location.origin);");
await writeFile(join(target, "runtime.js"), runtime.trimEnd() + "\n");
await copyFile(join(web, "engine.js"), join(target, "engine.js"));
await copyFile(join(web, "vendor/LICENSE"), join(target, "licenses/THREE-MIT.txt"));
await copyFile(join(source, "resources/makehuman/LICENSE.ASSETS.md"), join(target, "licenses/MAKEHUMAN-ASSETS.md"));
await copyFile(join(web, "vendor/manifest.json"), join(target, "licenses/three-provenance.json"));
let html = await readFile(join(web, "template.html"), "utf8");
html = html.replace("Skillforce v27 — validation animations", "Lexora — exploration de la salle d’audience").replace("Skillforce v27 · validation locale", "Lexora · exploration de la salle");
html = html.replace(/<!--ENGINE-->[\s\S]*$/, '<script>window.addEventListener("error",()=>{if(new URLSearchParams(location.search).get("embed")==="1")parent.postMessage({channel:"lexora-courtroom",version:1,type:"unavailable"},location.origin);},true);</script><script src="./engine.js"></script><script src="./data.js"></script><script src="./runtime.js"></script><script src="./lexora-bridge.js"></script></html>');
html = html.replace("</style>", '[data-embed] main{display:none}[data-embed],[data-embed] body{height:100%;overflow:hidden}[data-embed] canvas{height:100vh;min-height:0} </style>');
html = html.replace(/<details>[\s\S]*?<\/details>/, "");
await writeFile(join(target, "index.html"), html);
await writeFile(join(target, "manifest.json"), JSON.stringify({ version: 27, source: "Skillforce v27", engine: "Three.js r182 (isolated from the React renderer)", assets }, null, 2) + "\n");
console.log(`Imported ${assets.length - 1} characters and the v27 decor`);
