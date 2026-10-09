// Compile the entire pinned client, independently of the stripped renderer proof.
// All generated gamepack-derived output stays local under teavm-poc/target/.
import {spawnSync} from "node:child_process";
import {readFileSync,mkdirSync,writeFileSync,existsSync,rmSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname,resolve,join,delimiter} from "node:path";
import {fileURLToPath} from "node:url";
import {findTeaVmJdk} from "./build-teavm.mjs";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export function classifyEngineBuild(result,log,hasOutput){
    if(result.error)return {status:"blocked",stage:"toolchain",reason:result.error.message};
    if(result.status!==0){
        const parser=/ProgramParser\$1\.visitLdcInsn/.test(log);
        return {status:"blocked",stage:parser?"bytecode-parser":"compiler",
            reason:parser?"TeaVM rejected an LDC constant while parsing the complete client. Inspect the log and dynamic-constant bootstraps before adapting bytecode.":
                "Whole-engine compilation failed; inspect compiler.log for the first unsupported dependency or instruction."};
    }
    if(!hasOutput)return {status:"blocked",stage:"output",reason:"Maven succeeded without emitting engine.js."};
    return {status:"compiled-unverified",stage:"runtime",
        reason:"Compilation alone does not prove initialization, browser platform support, gameplay or OpenOSRS parity."};
}

export function buildOpenOsrsEngine({root=mobile,env=process.env,platform=process.platform,
    run=spawnSync,selectJdk=findTeaVmJdk}={}){
    const manifest=JSON.parse(readFileSync(join(root,"openosrs-reference.json"),"utf8"));
    const reference=resolve(env.SOLOSCAPE_OPENOSRS_ROOT||resolve(root,manifest.localDefault));
    const gamepack=resolve(env.SOLOSCAPE_OPENOSRS_GAMEPACK||join(reference,"runelite-client/src/main/resources/injected-client.oprs"));
    const api=resolve(env.SOLOSCAPE_OPENOSRS_API||join(reference,`runelite-api/build/libs/runelite-api-${manifest.version}.jar`));
    const target=join(root,"teavm-poc/target/engine"),output=join(target,"javascript/engine.js");
    mkdirSync(target,{recursive:true});
    // Remove only the known output file so a prior successful build cannot mask failure.
    rmSync(output,{force:true});
    const report={revision:manifest.protocolRevision,gamepackSha256:manifest.gamepackSha256,
        wholeEngine:true,parityVerified:false,entryPoint:"EngineBridge.initialize -> new client().initialize",
        status:"blocked",stage:"prerequisites"};
    let log="";
    try{
        if(!existsSync(gamepack))throw new Error("Pinned local gamepack missing; set SOLOSCAPE_OPENOSRS_GAMEPACK.");
        const digest=createHash("sha256").update(readFileSync(gamepack)).digest("hex");
        if(digest!==manifest.gamepackSha256)throw new Error("Gamepack SHA-256 mismatch; refusing to compile a different engine.");
        if(!existsSync(api))throw new Error("Built local RuneLite API missing; build runelite-api in the reference checkout or set SOLOSCAPE_OPENOSRS_API.");
        report.apiSha256=createHash("sha256").update(readFileSync(api)).digest("hex");
        const jdk=selectJdk({env,platform});
        const buildEnv={...env};
        if(jdk.home){buildEnv.JAVA_HOME=jdk.home;buildEnv.PATH=join(jdk.home,"bin")+delimiter+(env.PATH||env.Path||"");}
        report.javaMajor=jdk.major;
        const args=["-B","-e","-f",join(root,"teavm-poc/engine-pom.xml"),
            `-Dgamepack.path=${gamepack}`,`-Dapi.path=${api}`,"package"];
        // Pass all paths as process arguments, never through a shell command string.
        const result=run(jdk.binary,["-version"],{env:buildEnv,encoding:"utf8"});
        if(result.error||result.status!==0)throw new Error("Selected JDK is unavailable.");
        // Maven's Windows launcher is a .cmd. Use its Java entry point directly
        // so paths containing spaces/metacharacters never require shell interpolation.
        let command="mvn",commandArgs=args;
        if(platform==="win32"){
            const pathDirs=(env.PATH||env.Path||"").split(delimiter);
            const mavenBin=pathDirs.find(dir=>existsSync(join(dir,"mvn.cmd")));
            if(!mavenBin)throw new Error("Maven launcher missing from PATH.");
            const mavenHome=resolve(mavenBin,"..");
            const boot=join(mavenHome,"boot");
            const launcher=readdirSync(boot).find(name=>/^plexus-classworlds-.*\.jar$/.test(name));
            if(!launcher)throw new Error("Maven classworlds launcher missing.");
            command=jdk.binary;
            commandArgs=["-classpath",join(boot,launcher),
                `-Dmaven.home=${mavenHome}`,`-Dmaven.multiModuleProjectDirectory=${join(root,"teavm-poc")}`,
                `-Dclassworlds.conf=${join(mavenHome,"bin/m2.conf")}`,
                "org.codehaus.plexus.classworlds.launcher.Launcher",...args];
        }
        const compiled=run(command,commandArgs,{cwd:root,env:buildEnv,encoding:"utf8",maxBuffer:32*1024*1024});
        log=(compiled.stdout||"")+(compiled.stderr||"");
        report.exitCode=compiled.status;
        Object.assign(report,classifyEngineBuild(compiled,log,existsSync(output)));
    }catch(error){report.reason=error.message;}
    writeFileSync(join(target,"compiler.log"),log);
    writeFileSync(join(target,"report.json"),JSON.stringify(report,null,2)+"\n");
    return {report,target};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const {report,target}=buildOpenOsrsEngine();
    console.log(JSON.stringify(report,null,2));
    console.log("Local diagnostics: "+target);
    if(report.status==="blocked")process.exitCode=1;
}
