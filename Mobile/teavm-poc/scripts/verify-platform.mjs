import assert from "node:assert/strict";
import {spawnSync,spawn} from "node:child_process";
import {readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {createHash} from "node:crypto";
import {createServer} from "node:http";
import {once} from "node:events";
import {tmpdir} from "node:os";
import {join,resolve,delimiter} from "node:path";
import {fileURLToPath} from "node:url";
import {findTeaVmJdk} from "../../scripts/build-teavm.mjs";
import {prepareEngineBytecode} from "../../scripts/prepare-engine-bytecode.mjs";

const root=fileURLToPath(new URL("../../",import.meta.url));
const manifest=JSON.parse(readFileSync(join(root,"openosrs-reference.json"),"utf8"));
const reference=resolve(process.env.SOLOSCAPE_OPENOSRS_ROOT||resolve(root,manifest.localDefault));
const gamepack=process.env.SOLOSCAPE_OPENOSRS_GAMEPACK||join(reference,"runelite-client/src/main/resources/injected-client.oprs");
const api=process.env.SOLOSCAPE_OPENOSRS_API||join(reference,`runelite-api/build/libs/runelite-api-${manifest.version}.jar`);
assert.equal(createHash("sha256").update(readFileSync(gamepack)).digest("hex"),manifest.gamepackSha256);
const jdk=findTeaVmJdk(),target=join(root,"teavm-poc/target/engine");mkdirSync(target,{recursive:true});
const env={...process.env,JAVA_HOME:jdk.home,PATH:join(jdk.home,"bin")+delimiter+(process.env.PATH||process.env.Path||"")};
const prepared=prepareEngineBytecode({root,target,gamepack,api,jdk,env});
rmSync(join(target,"javascript/platform.js"),{force:true});
const args=["-B","-f",join(root,"teavm-poc/engine-pom.xml"),`-Dgamepack.path=${prepared.gamepack}`,`-Dapi.path=${prepared.api}`,
    "-Dengine.mainClass=PlatformProof","-Dengine.outputName=platform.js","package"];
let binary="mvn",commandArgs=args;
if(process.platform==="win32"){
    const bin=(process.env.PATH||process.env.Path||"").split(delimiter).find(dir=>existsSync(join(dir,"mvn.cmd")));
    assert.ok(bin,"Maven must be on PATH");const home=resolve(bin,"..");
    const boot=join(home,"boot"),launcher=readdirSync(boot).find(name=>/^plexus-classworlds-.*\.jar$/.test(name));
    binary=jdk.binary;commandArgs=["-classpath",join(boot,launcher),`-Dmaven.home=${home}`,
        `-Dmaven.multiModuleProjectDirectory=${join(root,"teavm-poc")}`,`-Dclassworlds.conf=${join(home,"bin/m2.conf")}`,
        "org.codehaus.plexus.classworlds.launcher.Launcher",...args];
}
const built=spawnSync(binary,commandArgs,{env,encoding:"utf8",maxBuffer:32*1024*1024});
writeFileSync(join(target,"platform-compiler.log"),(built.stdout||"")+(built.stderr||""));
assert.equal(built.status,0,"Platform build failed; inspect platform-compiler.log");
const source=readFileSync(join(target,"javascript/platform.js"),"utf8");
const module=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const originalWarn=console.warn,originalError=console.error,logs=[];
console.warn=(...args)=>logs.push(["warn",args.join(" ")]);console.error=(...args)=>logs.push(["error",args.join(" ")]);
try{
    module.verify();const deadline=Date.now()+10000;
    while(!globalThis.soloscapePlatformResult&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));
    assert.equal(globalThis.soloscapePlatformResult,"PASS");
    assert.ok(logs.some(([level,message])=>level==="warn"&&message.includes("value 42")));
    assert.ok(logs.some(([level,message])=>level==="error"&&message.includes("failure test")&&message.includes("IllegalArgumentException: sentinel")));
}finally{console.warn=originalWarn;console.error=originalError;}
console.log("PASS: compiled TeaVM platform resources, regex, logging, input dispatch, FIFO/pool tasks, cancellation, timeout, periodic scheduling and locks.");

if(process.env.CHROME_BIN){
    const profile=mkdtempSync(join(tmpdir(),"soloscape-platform-chrome-"));let child,timer;
    let finish;const result=new Promise(resolve=>finish=resolve);
    const server=createServer((request,response)=>{
        if(request.url==="/platform.js"){response.setHeader("Content-Type","text/javascript");response.end(source);return;}
        if(request.url.startsWith("/result?")){finish(new URL(request.url,"http://localhost").searchParams.get("value"));response.end("ok");return;}
        response.setHeader("Content-Type","text/html");
        response.end(`<canvas id="input-proof"></canvas><script type="module">
            import * as p from '/platform.js';
            try {p.verify();while(!globalThis.soloscapePlatformResult)await new Promise(r=>setTimeout(r,10));
                if(globalThis.soloscapePlatformResult!=='PASS')throw new Error(globalThis.soloscapePlatformResult);
                if(!p.graphics())throw new Error('ARGB upload or drawing readback');if(!p.input())throw new Error('DOM keyboard dispatch');
                fetch('/result?value=PASS');}catch(error){fetch('/result?value='+encodeURIComponent(String(error)));}
            </script>`);
    });
    try{
        server.listen(0,"127.0.0.1");await once(server,"listening");
        child=spawn(process.env.CHROME_BIN,["--headless","--no-sandbox","--no-first-run",`--user-data-dir=${profile}`,
            `http://127.0.0.1:${server.address().port}/`],{stdio:"ignore",windowsHide:true});
        child.on("error",error=>finish(String(error)));
        child.on("exit",()=>finish("Chrome exited before completing the proof"));
        timer=setTimeout(()=>finish("Chrome platform proof timed out"),30000);
        assert.equal(await result,"PASS");
        console.log("PASS: real Chrome canvas ARGB pixels, drawing readback, DOM keyboard consumption and cooperative scheduling.");
    }finally{
        clearTimeout(timer);
        if(child?.pid&&child.exitCode===null&&child.signalCode===null){
            const exited=once(child,"exit").catch(()=>{});child.kill();await exited;
        }
        await new Promise(resolve=>server.close(resolve));
        rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    }
}else console.log("SKIP: real canvas/DOM checks require CHROME_BIN.");
