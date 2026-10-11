// Convert the pinned TSPS state machine and loading tracker to native browser ES modules.
// Source of truth remains Mobile/tsps-upstream (BSD-2-Clause).
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const sourceRoot=resolve(mobile,"tsps-upstream/client/game");
const output=resolve(mobile,"browser/tsps-runtime");
await mkdir(output,{recursive:true});
const sources=[
    ["login/GameState.ts","game-login-GameState.mjs"],
    ["state/GameStateMachine.ts","game-state-GameStateMachine.mjs"],
    ["state/LoadingTracker.ts","game-state-LoadingTracker.mjs"],
];
for(const [source,target] of sources){
    let code=await readFile(resolve(sourceRoot,source),"utf8");
    if(source==="state/GameStateMachine.ts")
        code=code.replace(/from ["']\.\.\/login\/GameState["']/g,'from "./game-login-GameState.mjs"');
    code=stripTypeScriptTypes(code,{mode:"transform"});
    await writeFile(resolve(output,target),
        "// Generated from pinned TSPS client/game/"+source+"\n"+
        "// BSD-2-Clause: see Mobile/licenses/tsps-BSD-2-Clause.txt.\n"+
        "// Regenerate using: node scripts/adapt-tsps-loading.mjs\n"+code);
    console.log(target);
}
