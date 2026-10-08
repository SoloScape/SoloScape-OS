// Exact pinned TSPS scene tile geometry and HSL utilities, compiled to native ESM.
// This avoids another hand-copied implementation of the OSRS shape/rotation rules.
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const upstream=resolve(root,"tsps-upstream/client/rs");
const output=resolve(root,"browser/tsps-runtime");
await mkdir(output,{recursive:true});
for(const [source,target] of [
    ["util/ColorUtil.ts","rs-util-ColorUtil.mjs"],
    ["scene/SceneTileModel.ts","rs-scene-SceneTileModel.mjs"],
]){
    let code=await readFile(resolve(upstream,source),"utf8");
    if(source==="scene/SceneTileModel.ts")
        code=code.replace(/from ["']\.\.\/util\/ColorUtil["']/g,'from "./rs-util-ColorUtil.mjs"');
    code=stripTypeScriptTypes(code,{mode:"transform"});
    await writeFile(resolve(output,target),
        "// Generated from pinned TSPS client/rs/"+source+"\n"+
        "// BSD-2-Clause: see Mobile/licenses/tsps-BSD-2-Clause.txt.\n"+
        "// Regenerate: node scripts/adapt-tsps-scene.mjs; do not hand-edit.\n"+code);
    console.log(target);
}
