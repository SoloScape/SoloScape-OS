// Copy only pinned, local build/reference files; never remove the source tree.
import {createHash} from "node:crypto";
import {readFile,mkdir,copyFile} from "node:fs/promises";
import {constants} from "node:fs";
import {resolve,relative,isAbsolute,dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
function inside(root,path){
    const file=resolve(root,path),rel=relative(root,file);
    if(!rel||rel===".."||rel.startsWith("..\\")||rel.startsWith("../")||isAbsolute(rel))
        throw new Error("OpenOSRS input path must stay inside its directory");
    return file;
}
export async function importOpenOsrsInputs({sourceRoot,mobileRoot=mobile}={}){
    if(!sourceRoot)throw new Error("Supply --from <existing OpenOSRS folder>");
    const manifest=JSON.parse(await readFile(join(mobileRoot,"openosrs-reference.json"),"utf8"));
    const destination=inside(mobileRoot,manifest.localDefault),source=resolve(sourceRoot);
    if(source===destination)throw new Error("Source must differ from the local input destination");
    const entries=Object.entries({...manifest.sourceFiles,...manifest.buildFiles});
    if(!entries.length||!manifest.buildFiles)throw new Error("Pinned OpenOSRS build inputs are missing from the manifest");
    // Validate ALL source and existing destination files before writing any.
    const pending=[];let totalBytes=0,unchanged=0;
    for(const [name,expected] of entries){
        const from=inside(source,name),to=inside(destination,name),bytes=await readFile(from);
        if(hash(bytes)!==expected)throw new Error("Pinned OpenOSRS SHA-256 mismatch: "+name);
        totalBytes+=bytes.length;
        let existing;
        try{existing=await readFile(to);}catch(error){if(error.code!=="ENOENT")throw error;}
        if(existing){
            if(hash(existing)!==expected)throw new Error("Preserving different existing local input: "+name);
            unchanged++;
        }else pending.push({name,from,to,expected});
    }
    for(const file of pending){
        await mkdir(dirname(file.to),{recursive:true});
        await copyFile(file.from,file.to,constants.COPYFILE_EXCL);
        if(hash(await readFile(file.to))!==file.expected)
            throw new Error("Copied OpenOSRS input failed verification: "+file.name);
    }
    return {destination,files:entries.length,copied:pending.length,unchanged,totalBytes};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    try{
        const args=process.argv.slice(2);
        if(args.length!==2||args[0]!=="--from")throw new Error("Usage: npm run import:openosrs-inputs -- --from <existing OpenOSRS folder>");
        console.log(JSON.stringify(await importOpenOsrsInputs({sourceRoot:args[1]}),null,2));
    }catch(error){console.error(error.message);process.exitCode=1;}
}
