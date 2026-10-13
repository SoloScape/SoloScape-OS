// Use the pinned TSPS roof/plane/flag computations directly with a light
// Scene constant adapter: no TSPS GameRenderer/MapManager is required.
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=resolve(root,"tsps-upstream/client");
const target=resolve(root,"browser/tsps-runtime");
const modules=[
    ["game/utils/PlaneUtil.ts","game-utils-PlaneUtil.mjs"],
    ["game/scene/TileRenderFlags.ts","game-scene-TileRenderFlags.mjs"],
    ["game/roof/RoofVisibility.ts","game-roof-RoofVisibility.mjs"],
];
const sceneImport="import { Scene } from \"../../rs/scene/Scene\";";
const shim='const Scene={MAP_SQUARE_SIZE:64,MAX_LEVELS:4};';
for(const [path,file] of modules){
    let code=await readFile(resolve(source,path),"utf8");
    code=code.replace(/^[ \t]*TileFlagMapSquare,\r?\n/m,"");
    code=code.replace(sceneImport,shim)
        .replace(/^import type \{ MapManager, MapSquare \} from "[^"]+";\r?\n/m,"")
        .replace(/^import \{ getMapIndexFromTile \} from "[^"]+";\r?\n/m,
            "const getMapIndexFromTile=tile=>Math.floor(tile/64);\n")
        .replace(/from "\.\.\/utils\/PlaneUtil"/g,'from "./game-utils-PlaneUtil.mjs"')
        .replace(/from "\.\.\/scene\/TileRenderFlags"/g,'from "./game-scene-TileRenderFlags.mjs"');
    code=stripTypeScriptTypes(code,{mode:"transform"});
    await writeFile(resolve(target,file),
        "// Generated from pinned TSPS client/"+path+"; BSD-2-Clause.\n"+
        "// Regenerate with node scripts/adapt-tsps-roofs.mjs; never hand edit.\n"+code);
    console.log(file);
}
