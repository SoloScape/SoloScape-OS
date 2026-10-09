import assert from "node:assert/strict";
import {spawnSync,spawn} from "node:child_process";
import {readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {createHash} from "node:crypto";
import {createServer} from "node:http";
import {once} from "node:events";
import {tmpdir} from "node:os";
import {join,resolve,delimiter} from "node:path";
import {fileURLToPath} from "node:url";
import {WebSocketServer} from "ws";
import {findTeaVmJdk} from "../../scripts/build-teavm.mjs";
import {prepareEngineBytecode,compileEngineTools} from "../../scripts/prepare-engine-bytecode.mjs";

const services=process.argv.includes("--services");
if(services)assert.ok(process.env.CHROME_BIN,"Service proof requires CHROME_BIN for IndexedDB, image decoding and audio");

const root=fileURLToPath(new URL("../../",import.meta.url));
const manifest=JSON.parse(readFileSync(join(root,"openosrs-reference.json"),"utf8"));
const reference=resolve(process.env.SOLOSCAPE_OPENOSRS_ROOT||resolve(root,manifest.localDefault));
const gamepack=process.env.SOLOSCAPE_OPENOSRS_GAMEPACK||join(reference,"runelite-client/src/main/resources/injected-client.oprs");
const api=process.env.SOLOSCAPE_OPENOSRS_API||join(reference,`runelite-api/build/libs/runelite-api-${manifest.version}.jar`);
assert.equal(createHash("sha256").update(readFileSync(gamepack)).digest("hex"),manifest.gamepackSha256);
const jdk=findTeaVmJdk(),target=join(root,"teavm-poc/target/engine");mkdirSync(target,{recursive:true});
const env={...process.env,JAVA_HOME:jdk.home,PATH:join(jdk.home,"bin")+delimiter+(process.env.PATH||process.env.Path||"")};
const prepared=prepareEngineBytecode({root,target,gamepack,api,jdk,env});
const outputName=services?"services.js":"platform.js";
rmSync(join(target,"javascript",outputName),{force:true});
const args=["-B","-f",join(root,"teavm-poc/engine-pom.xml"),`-Dgamepack.path=${prepared.gamepack}`,`-Dapi.path=${prepared.api}`,
    `-Dengine.mainClass=${services?"ServicesProof":"PlatformProof"}`,`-Dengine.outputName=${outputName}`,
    `-Dengine.reflectionProofType=${services?"ServicesProof$ReflectionTarget":""}`,"package"];
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
writeFileSync(join(target,services?"services-compiler.log":"platform-compiler.log"),(built.stdout||"")+(built.stderr||""));
assert.equal(built.status,0,"Platform build failed; inspect platform-compiler.log");
const source=readFileSync(join(target,"javascript",outputName),"utf8");
let serialized="";
if(services){
    const {classes}=compileEngineTools({root,target,jdk,env,fixture:true});
    const fixture=spawnSync(jdk.binary,["-cp",classes,"EngineServicesJvmTest","fixture"],{encoding:"utf8"});
    assert.equal(fixture.status,0,fixture.stderr);serialized=fixture.stdout;
}
if(!services){
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
}

if(process.env.CHROME_BIN){
    const profile=mkdtempSync(join(tmpdir(),"soloscape-platform-chrome-"));let child,timer;
    let finish;const result=new Promise(resolve=>finish=resolve);
    const server=createServer((request,response)=>{
        if(request.url==="/platform.js"){response.setHeader("Content-Type","text/javascript");response.end(source);return;}
        if(request.url.startsWith("/result?")){finish(new URL(request.url,"http://localhost").searchParams.get("value"));response.end("ok");return;}
        if(request.url==="/echo"){
            const chunks=[];request.on("data",data=>chunks.push(data));request.on("end",()=>{response.writeHead(201,{"Content-Type":"application/octet-stream"});response.end(Buffer.concat(chunks));});return;
        }
        if(request.url==="/missing"){response.writeHead(404);response.end("error body");return;}
        response.setHeader("Content-Type","text/html");
        if(services){response.end(`<script type="module">
            import * as p from '/platform.js';
            try {const c=document.createElement('canvas');c.width=2;c.height=1;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,1,1);ctx.fillStyle='#00ff00';ctx.fillRect(1,0,1,1);
                const png=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
                const image=Array.from(new Uint8Array(await png.arrayBuffer()),b=>b.toString(16).padStart(2,'0')).join('');
                p.verify(location.origin,image,${JSON.stringify(serialized)});
                while(!globalThis.soloscapeServicesResult)await new Promise(r=>setTimeout(r,10));
                fetch('/result?value='+encodeURIComponent(globalThis.soloscapeServicesResult));
            }catch(error){fetch('/result?value='+encodeURIComponent(String(error)));}
            </script>`);return;}
        response.end(`<canvas id="input-proof"></canvas><script type="module">
            import * as p from '/platform.js';
            try {p.verify();while(!globalThis.soloscapePlatformResult)await new Promise(r=>setTimeout(r,10));
                if(globalThis.soloscapePlatformResult!=='PASS')throw new Error(globalThis.soloscapePlatformResult);
                if(!p.graphics())throw new Error('ARGB upload or drawing readback');if(!p.input())throw new Error('DOM keyboard dispatch');
                fetch('/result?value=PASS');}catch(error){fetch('/result?value='+encodeURIComponent(String(error)));}
            </script>`);
    });
    const websocket=new WebSocketServer({noServer:true});
    server.on("upgrade",(request,socket,head)=>{
        if(request.url!=="/socket"){socket.destroy();return;}
        websocket.handleUpgrade(request,socket,head,client=>client.on("message",data=>client.send(data,{binary:true})));
    });
    try{
        server.listen(0,"127.0.0.1");await once(server,"listening");
        child=spawn(process.env.CHROME_BIN,["--headless","--no-sandbox","--no-first-run","--autoplay-policy=no-user-gesture-required",`--user-data-dir=${profile}`,
            `http://127.0.0.1:${server.address().port}/`],{stdio:"ignore",windowsHide:true});
        child.on("error",error=>finish(String(error)));
        child.on("exit",()=>finish("Chrome exited before completing the proof"));
        timer=setTimeout(()=>finish("Chrome platform proof timed out"),30000);
        assert.equal(await result,"PASS");
        console.log(services?"PASS: real Chrome IndexedDB persistence, Fetch status/body, WebSocket binary streams, SHA-256/Guava, reflection/serialization, PNG decoding and Web Audio PCM.":"PASS: real Chrome canvas ARGB pixels, drawing readback, DOM keyboard consumption and cooperative scheduling.");
    }finally{
        clearTimeout(timer);
        if(child?.pid&&child.exitCode===null&&child.signalCode===null){
            const exited=once(child,"exit").catch(()=>{});child.kill();await exited;
        }
        for(const client of websocket.clients)client.terminate();
        await new Promise(resolve=>websocket.close(resolve));await new Promise(resolve=>server.close(resolve));
        rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    }
}else console.log("SKIP: real canvas/DOM checks require CHROME_BIN.");
