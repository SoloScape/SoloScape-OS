// Verify the user-provided OpenOSRS revision-240 source tree, never the
// separately licensed injected gamepack binary. No network or writes.
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await readFile(resolve(mobile,"openosrs-reference.json"),"utf8"));
const rootArgument=process.argv.indexOf("--root");
if(rootArgument!==-1&&!process.argv[rootArgument+1])
    throw new Error("--root requires an OpenOSRS source path");
const root=resolve(rootArgument!==-1?process.argv[rootArgument+1]:
    process.env.SOLOSCAPE_OPENOSRS_ROOT||resolve(mobile,manifest.localDefault));
const errors=[];
let checked=0;
for(const [relative,expected] of Object.entries(manifest.sourceFiles)){
    const file=resolve(root,relative);
    try{
        const bytes=await readFile(file);
        const actual=createHash("sha256").update(bytes).digest("hex");
        if(actual!==expected)errors.push(relative+": source has changed (re-audit before updating the pin)");
        else checked++;
    }catch(error){errors.push(relative+": "+error.message);}
}
try{
    const properties=await readFile(resolve(root,"gamepack.properties"),"utf8");
    const readProp=key=>properties.match(new RegExp("^"+key+"=(.+)$","m"))?.[1]?.trim();
    if(Number(readProp("revision"))!==manifest.protocolRevision)errors.push("gamepack revision mismatch");
    if(readProp("version")!==manifest.gamepackVersion)errors.push("gamepack version mismatch");
    if(readProp("sha256")!==manifest.gamepackSha256)errors.push("gamepack digest metadata mismatch");
    const settings=await readFile(resolve(root,"settings.gradle.kts"),"utf8");
    if(!settings.includes('rootProject.name = "openosrs"')||
        !settings.includes('include(":runelite-client")'))
        errors.push("source does not identify as the expected OpenOSRS build");
}catch(error){errors.push("OpenOSRS metadata: "+error.message);}
if(errors.length){
    console.error("OpenOSRS reference verification FAILED at "+root);
    for(const error of errors)console.error("  - "+error);
    process.exitCode=1;
}else{
    console.log("OpenOSRS reference verified: revision "+manifest.protocolRevision+
        ", "+checked+" SHA-256-checked source files, root "+root);
    console.log("Java reference only: no TSPS runtime replacement and no gamepack bundling.");
}
