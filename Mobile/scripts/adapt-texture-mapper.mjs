// Reproduce the BSD-2-Clause mapper from the pinned TSPS source, without dependencies.
import {readFile,writeFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
const upstream=new URL("../tsps-upstream/",import.meta.url);
const source=await readFile(new URL("client/rs/model/TextureMapper.ts",upstream),"utf8");
const licence=await readFile(new URL("LICENSE",upstream),"utf8");
const js=stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,""),{mode:"transform"});
await writeFile(new URL("../browser/texture-mapper.mjs",import.meta.url),
    "/*\n"+licence.trim()+"\n*/\n// Adapted from pinned TSPS TextureMapper (b9ca431).\n"+js);
