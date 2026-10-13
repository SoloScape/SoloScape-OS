// Pinned TSPS water classification, animation axes and render-distance policy.
// The generated output is derived from source, not a separate list of guesses.
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const upstream=resolve(mobile,"tsps-upstream/client");
const output=resolve(mobile,"browser/tsps-runtime");
const source="common/world/WaterTextureIds.ts";
const code=stripTypeScriptTypes(await readFile(resolve(upstream,source),"utf8"),{mode:"transform"});
const textureLoader=await readFile(resolve(upstream,"rs/texture/SpriteTextureLoader.ts"),"utf8");
const uv=textureLoader.match(/static ANIM_DIRECTION_UV = (\[[\s\S]*?\n    \]);/);
if(!uv)throw new Error("Pinned TSPS texture direction table has changed");
await writeFile(resolve(output,"common-world-WaterTextureIds.mjs"),
    "// Generated from pinned TSPS client/"+source+" and SpriteTextureLoader; BSD-2-Clause.\n"+
    "// Run: node scripts/adapt-tsps-water.mjs; do not hand edit.\n"+
    code+"\nexport const ANIM_DIRECTION_UV = "+uv[1]+";\n");
let policy=await readFile(resolve(upstream,"render/RenderDistancePolicy.ts"),"utf8");
policy=policy.replace(/^import \{ clamp \} from "[^"]+";\r?\n/m,
    "const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));\n");
policy=stripTypeScriptTypes(policy,{mode:"transform"});
const constants=await readFile(resolve(upstream,"render/render/constants.ts"),"utf8");
const factor=constants.match(/export const HD_AUTO_FOG_DEPTH_FACTOR = ([\d.]+);/);
if(!factor)throw new Error("Pinned TSPS automatic fog factor has changed");
await writeFile(resolve(output,"render-RenderDistancePolicy.mjs"),
    "// Generated from pinned TSPS render/RenderDistancePolicy.ts and render/constants.ts.\n"+
    "// BSD-2-Clause; regenerate via node scripts/adapt-tsps-water.mjs.\n"+
    policy+"\nexport const HD_AUTO_FOG_DEPTH_FACTOR = "+factor[1]+";\n");
