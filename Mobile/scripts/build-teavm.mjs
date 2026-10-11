// Run TeaVM's Maven plugin on JDK 17+ without changing the system Java default.
import {spawnSync} from "node:child_process";
import {existsSync,readdirSync,copyFileSync,mkdirSync,readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join,delimiter,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

export function javaMajor(versionOutput){
    const match=String(versionOutput).match(/\bversion\s+["']((?:1\.)?\d+)/i);
    if(!match)return 0;
    const raw=match[1];
    return Number(raw.startsWith("1.")?raw.slice(2):raw);
}
export function findTeaVmJdk({env=process.env,platform=process.platform,exists=existsSync,
    list=readdirSync,run=spawnSync}={}){
    const names=platform==="win32"?["java.exe"]:["java"];
    const choices=[],visited=new Set();
    const add=home=>{
        if(home&&typeof home==="string"&&!visited.has(home.toLowerCase())){
            visited.add(home.toLowerCase());choices.push(home);
        }
    };
    add(env.JAVA_HOME);
    if(platform==="win32"){
        for(const root of [
            join(env.ProgramFiles||"C:\\Program Files","Eclipse Adoptium"),
            join(env.ProgramFiles||"C:\\Program Files","Java"),
            join(env["ProgramFiles(x86)"]||"C:\\Program Files (x86)","Eclipse Adoptium")
        ]){
            try{
                for(const dir of list(root).filter(name=>/^jdk[-_]?\d/.test(name)))
                    add(join(root,dir));
            }catch{}
        }
    }else{
        for(const root of ["/usr/lib/jvm","/opt/homebrew/opt","/Library/Java/JavaVirtualMachines"]){
            try{
                for(const dir of list(root)){
                    add(join(root,dir));
                    if(root.startsWith("/Library"))add(join(root,dir,"Contents","Home"));
                }
            }catch{}
        }
    }
    let best=null;
    for(const home of choices){
        const binary=join(home,"bin",names[0]);
        if(!exists(binary))continue;
        const probe=run(binary,["-version"],{encoding:"utf8",timeout:5000});
        if(probe.error||probe.status!==0)continue;
        const major=javaMajor(probe.stderr||probe.stdout);
        if(major>=17&&(!best||major<best.major))best={home,major,binary};
    }
    if(best)return best;
    const fallback=run("java",["-version"],{encoding:"utf8",timeout:5000});
    if(!fallback.error&&fallback.status===0&&javaMajor(fallback.stderr||fallback.stdout)>=17)
        return {home:null,major:javaMajor(fallback.stderr||fallback.stdout),binary:"java"};
    throw new Error("TeaVM 0.15.0 needs JDK 17+. Install JDK 17 or set JAVA_HOME to a JDK 17+ directory. Java 8 cannot run its Maven plugin.");
}

export function runTeaVmBuild(){
    // Only use the exact local rev-240 binary. Never commit or bundle its bytes.
    const mobileRoot=resolve(dirname(fileURLToPath(import.meta.url)),"..");
    const source=process.env.SOLOSCAPE_OPENOSRS_GAMEPACK||resolve(mobileRoot,"..","..","Client","runelite-client","src","main","resources","injected-client.oprs");
    if(!existsSync(source))throw new Error("Local rev-240 OpenOSRS injected-client.oprs missing. Set SOLOSCAPE_OPENOSRS_GAMEPACK to its local path.");
    const expected="25f42961c400bd9dfff1554402441c0ba6d1cffd011163cb9b0b4c42ae194f85";
    const hash=createHash("sha256").update(readFileSync(source)).digest("hex");
    if(hash!==expected)throw new Error("OpenOSRS gamepack SHA-256 mismatch; this renderer bridge supports only the pinned rev-240 binary.");
    const target=join(mobileRoot,"teavm-poc","target","gamepack");
    mkdirSync(target,{recursive:true});
    copyFileSync(source,join(target,"injected-client.oprs"));
    const jdk=findTeaVmJdk();
    const java=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"java.exe":"java"):"java";
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const asm=join(process.env.USERPROFILE||process.env.HOME,".m2","repository","org","ow2","asm","asm","9.8","asm-9.8.jar");
    if(!existsSync(asm))throw new Error("Missing ASM 9.8 in Maven cache. Build TeaVM dependencies first.");
    const extractor=join(target,"extractor");mkdirSync(extractor,{recursive:true});
    const compiler=spawnSync(javac,["-cp",asm,"-d",extractor,join(mobileRoot,"teavm-poc","scripts","ExtractRasterizer.java")],{encoding:"utf8"});
    if(compiler.status!==0)throw new Error("Renderer extractor compile failed: "+(compiler.stderr||compiler.error));
    const isolated=spawnSync(java,["-cp",extractor+delimiter+asm,"ExtractRasterizer",source,join(target,"rasterizer2d.jar")],{encoding:"utf8"});
    if(isolated.status!==0)throw new Error("Original bytecode extraction failed: "+(isolated.stderr||isolated.error));
    console.log(isolated.stdout.trim());
    const env={...process.env};
    if(jdk.home){
        env.JAVA_HOME=jdk.home;
        env.PATH=join(jdk.home,"bin")+delimiter+(env.PATH||env.Path||"");
    }
    console.log("[teavm] Using Java "+jdk.major+(jdk.home?" from "+jdk.home:" from PATH"));
    const cmd=process.platform==="win32"?"mvn.cmd":"mvn";
    const args=["-f","teavm-poc/pom.xml","package"];
    const result=spawnSync(cmd,args,{stdio:"inherit",env,shell:process.platform==="win32"});
    if(result.error)throw new Error("Maven unavailable: "+result.error.message);
    if(result.status!==0)process.exitCode=result.status??1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
    runTeaVmBuild();
