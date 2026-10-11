// Reproduce the standalone decoder from the pinned BSD-2-Clause TSPS submodule.
// No model/cache assets or upstream dependencies are copied.
import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const upstream=new URL("../tsps-upstream/",import.meta.url);
const source=await readFile(new URL("client/rs/model/ModelData.ts",upstream),"utf8");
const licence=await readFile(new URL("LICENSE",upstream),"utf8");
const start=source.indexOf("    decode(data: Int8Array): void {");
const end=source.indexOf("    decodeLegacy(loader:",start);
if(start<0||end<0)throw new Error("Pinned model decoder boundaries changed");
const methods=source.slice(start,end);
const adaptation=`export class CacheModel {
    constructor(){this.version=-1;this.verticesCount=0;this.usedVertexCount=0;this.faceCount=0;this.priority=0;}
${methods}}
`;
const js=stripTypeScriptTypes(adaptation,{mode:"strip"});
await writeFile(new URL("../browser/model-codec.mjs",import.meta.url),
    "/*\n"+licence.trim()+"\n*/\n"+
    "// Decode-only adaptation of pinned TSPS ModelData (b9ca431).\n"+
    "// Uses a strict reader. Placement, transformations and lighting live in scenery-models.mjs.\n"+
    'import { ByteBuffer } from "./cache-reader.mjs";\n'+js);
