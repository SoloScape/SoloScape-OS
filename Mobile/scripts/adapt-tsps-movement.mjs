// Regenerate directly from the pinned TSPS TypeScript movement/animation controllers.
// Pinned source is a git submodule; keep this transformation reproducible.
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,dirname,posix} from "node:path";
import {fileURLToPath} from "node:url";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const upstream=resolve(mobile,"tsps-upstream/client");
const output=resolve(mobile,"browser/tsps-runtime");
const sources=[
  "common/Direction.ts",
  "common/CollisionFlag.ts",
  "rs/MathConstants.ts",
  "rs/utils/rotation.ts",
  "rs/interaction/InteractionIndex.ts",
  "game/movement/MovementPath.ts",
  "game/movement/MovementState.ts",
  "game/movement/OsrsRouteFinder32.ts",
  "game/ecs/PlayerEcs.ts",
  "game/movement/PlayerMovementSync.ts",
  "game/PlayerAnimController.ts",
  "game/actor/ActorAnimation.ts",
];
const generated=new Map(sources.map(src=>[src,src.replace(/\//g,"-").replace(/\.ts$/,".mjs")]));
await mkdir(output,{recursive:true});
for(const source of sources){
  let code=await readFile(resolve(upstream,source),"utf8");
  // Imports used exclusively for TypeScript types are erased by the upstream
  // compiler; the Node transformer needs those value imports erased explicitly.
  if(source==="game/ecs/PlayerEcs.ts")
    code=code.replace(/^import \{ PlayerAppearance \} from .*\r?\n/m,"");
  if(source==="game/movement/PlayerMovementSync.ts"){
    code=code.replace(/^import \{ PlayerAnimController \} from .*\r?\n/m,"");
    code=code.replace(/^import \{ PlayerEcs \} from .*\r?\n/m,"");
    code=code.replace("MovementState, MovementStateInit","MovementState");
  }
  if(source==="game/PlayerAnimController.ts")
    code=code.replace(/^import \{ PlayerEcs \} from .*\r?\n/m,"");
  if(source==="game/actor/ActorAnimation.ts")
    code=code.replace(/^import \{ DrawRange \} from .*\r?\n/m,"");
  code=stripTypeScriptTypes(code,{mode:"transform"});
  code=code.replace(/from (["'])(\.[^"']+)\1/g,(_match,quote,path)=>{
    const resolved=posix.normalize(posix.join(posix.dirname(source),path))+".ts";
    const dependency=generated.get(resolved);
    if(!dependency)throw new Error("Unexpected pinned runtime import: "+source+" -> "+resolved);
    return "from "+quote+"./"+dependency+quote;
  });
  const header="// Generated from pinned RSPSApp/tsps: client/"+source+"\n"+
    "// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.\n";
  await writeFile(resolve(output,generated.get(source)),header+code);
  console.log(generated.get(source));
}
