// Reproduce the pinned BSD-2-Clause animation evaluator without upstream cache services.
import {stripTypeScriptTypes} from "node:module";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,dirname,posix} from "node:path";
import {fileURLToPath} from "node:url";
const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const upstream=resolve(mobile,"tsps-upstream/client"),output=resolve(mobile,"browser/tsps-runtime");
const names=["Curve","CurveInterp","CurveInterpType","CurveType","SkeletalTransformType","MatrixPool","QuatPool","SkeletalBone","SkeletalBase","SkeletalSeq"];
const sources=["common/utils/FloatUtil.ts",...names.map(name=>`rs/model/skeletal/${name}.ts`)];
const generated=new Map(sources.map(src=>[src,src.replace(/\//g,"-").replace(/\.ts$/,".mjs")]));
await mkdir(output,{recursive:true});
for(const source of sources){
    let code=await readFile(resolve(upstream,source),"utf8");
    code=code.replace(/^import \{ ByteBuffer \} from .*\r?\n/m,"");
    code=code.replace(/^import \{ SeqBase \} from .*\r?\n/m,"");
    code=code.replace(/^import \{ SeqBaseLoader \} from .*\r?\n/m,"");
    code=code.replace("ReadonlyMat4, mat4","mat4");
    code=stripTypeScriptTypes(code,{mode:"transform"});
    code=code.replace(/from (["'])(\.[^"']+)\1/g,(_match,quote,path)=>{
        const target=posix.normalize(posix.join(posix.dirname(source),path))+".ts";
        if(!generated.has(target))throw new Error(`Unexpected skeletal import ${target}`);
        return `from ${quote}./${generated.get(target)}${quote}`;
    });
    code=code.replace(/from "gl-matrix"/g,'from "./skeletal-math.mjs"');
    // Only static load constructs a reader; instance constructors receive one.
    if(source.endsWith("SkeletalSeq.ts"))code='import {ByteBuffer} from "../cache-reader.mjs";\n'+code;
    await writeFile(resolve(output,generated.get(source)),
        `// Generated from pinned TSPS client/${source}.\n// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.\n`+code);
}
