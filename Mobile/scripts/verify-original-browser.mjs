// Run the *real* generated engine in isolated headless Chrome over loopback.
// Zero fabricated ticks, cache payloads, framebuffers or success results.
import {spawn,spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {setTimeout as pause} from "node:timers/promises";
import {WebSocket} from "ws";
import {createEngineSmokeServer} from "./engine-smoke-server.mjs";
import {createGateway} from "../gateway/server.mjs";

const chrome=process.env.CHROME_BIN;
if(!chrome){console.error("Set CHROME_BIN to an installed Chrome executable");process.exit(2);}
const profile=await mkdtemp(join(tmpdir(),"soloscape-original-chrome-"));
const server=createEngineSmokeServer();
const timeout=Number(process.env.SOLOSCAPE_ENGINE_SMOKE_TIMEOUT_MS??30000);
const stabilityMs=Number(process.env.SOLOSCAPE_ENGINE_STABILITY_MS??5000);
let child,socket,debuggerPort,passed=false,js5Gateway;
const gatewayTraffic={connected:0,upstreamBytes:0,downstreamBytes:0};
function assertTime(){if(Date.now()>deadline)throw new Error("Original-engine browser proof timed out");}
let deadline=Date.now()+timeout;
try{
    await new Promise((resolve,reject)=>server.listen(0,"127.0.0.1",error=>error?reject(error):resolve()));
    const pageUrl="http://127.0.0.1:"+server.address().port+"/";
    if(process.env.SOLOSCAPE_ENGINE_JS5_UPSTREAM_PORT){
        const tcpPort=Number(process.env.SOLOSCAPE_ENGINE_JS5_UPSTREAM_PORT);
        if(!Number.isInteger(tcpPort)||tcpPort<1||tcpPort>65535)
            throw new Error("Invalid explicit JS5 TCP port");
        // Loopback-only, explicit native cache test; no login or external hosts.
        js5Gateway=createGateway({tcpHost:"127.0.0.1",tcpPort,
            allowedOrigins:new Set([new URL(pageUrl).origin]),
            onActivity:(kind,n)=>{gatewayTraffic[kind]+=kind==="connected"?1:n;}});
        await new Promise((resolve,reject)=>
            js5Gateway.httpServer.listen(43595,"127.0.0.1",error=>error?reject(error):resolve()));
    }
    child=spawn(chrome,["--headless=new","--no-first-run","--no-default-browser-check","--disable-extensions",
        "--disable-background-networking","--no-sandbox","--remote-debugging-port=0",
        "--user-data-dir="+profile,pageUrl],{stdio:"ignore"});
    while(!debuggerPort){
        assertTime();
        // Windows Chrome launchers can exit immediately after delegating to a browser process.
        try{debuggerPort=Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split(/\r?\n/)[0]);}
        catch{await pause(150);}
    }
    let target;
    while(!target){
        assertTime();
        const pages=await(await fetch("http://127.0.0.1:"+debuggerPort+"/json/list")).json();
        target=pages.find(page=>page.type==="page"&&page.url.startsWith(pageUrl));
        if(!target)await pause(150);
    }
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.once("open",resolve);socket.once("error",reject);});
    let seq=0;
    const pending=new Map(),browserExceptions=[],debugPauses=[],debugProbes=[];
    const debugExceptions=process.env.SOLOSCAPE_ENGINE_DEBUG_EXCEPTIONS==="1";
    socket.on("message",raw=>{
        const message=JSON.parse(String(raw));
        if(message.method==="Debugger.paused"){
            if(debugPauses.length<20){
                const data=message.params?.data;
                debugPauses.push({reason:message.params?.reason,
                    description:data?.description||data?.value||"",
                    frames:message.params?.callFrames?.slice(0,5).map(f=>({
                        functionName:f.functionName,line:f.location?.lineNumber,column:f.location?.columnNumber
                    }))});
            }
            const description=message.params?.data?.description||"";
            const urlFrame=message.params?.callFrames?.find(f=>f.functionName==="C7V");
            if(debugExceptions&&description.includes("cah")&&urlFrame&&debugProbes.length===0){
                debugProbes.push("pending");
                const id=++seq;
                const resume=()=>socket.send(JSON.stringify({id:++seq,method:"Debugger.resume"}));
                pending.set(id,{resolve:value=>{debugProbes[0]=value;resume();},
                    reject:error=>{debugProbes[0]=error.message;resume();}});
                socket.send(JSON.stringify({id,method:"Debugger.evaluateOnCallFrame",
                    params:{callFrameId:urlFrame.callFrameId,returnByValue:true,
                    expression:"JSON.stringify({resource:Y(4702)?.bsH,fallback:Y(4703)?.bsH,bIsNull:b===null,cValue:c?.bsH,dType:d?.constructor?.name,actualType:typeof b})"}}));
            }else socket.send(JSON.stringify({id:++seq,method:"Debugger.resume"}));
        }
        if(message.method==="Runtime.exceptionThrown"&&browserExceptions.length<8)
            browserExceptions.push(message.params?.exceptionDetails?.text||"Unknown JavaScript exception");
        const promise=pending.get(message.id);
        if(!promise)return;
        pending.delete(message.id);
        if(message.error||message.result?.exceptionDetails)promise.reject(new Error(JSON.stringify(message.error||message.result.exceptionDetails).slice(0,600)));
        else promise.resolve(message.result?.result?.value??message.result?.data);
    });
    async function evalJs(expression){
        const id=++seq;
        const promise=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
        socket.send(JSON.stringify({id,method:"Runtime.evaluate",params:{expression,returnByValue:true,awaitPromise:true}}));
        return await Promise.race([promise,pause(5000).then(()=>{pending.delete(id);throw new Error("DevTools evaluation timed out");})]);
    }
    socket.send(JSON.stringify({id:++seq,method:"Runtime.enable"}));
    if(debugExceptions){
        socket.send(JSON.stringify({id:++seq,method:"Debugger.enable"}));
        socket.send(JSON.stringify({id:++seq,method:"Debugger.setPauseOnExceptions",params:{state:"all"}}));
    }
    while(!(await evalJs("document.readyState !== 'loading' && !!document.getElementById('start')"))){
        assertTime();await pause(150);
    }
    const parameters=process.env.SOLOSCAPE_ENGINE_SMOKE_PARAMETERS;
    const gateways=process.env.SOLOSCAPE_ENGINE_SMOKE_GATEWAYS;
    const codebase=process.env.SOLOSCAPE_ENGINE_SMOKE_CODEBASE;
    if(parameters)await evalJs("document.getElementById('params').value = "+JSON.stringify(parameters));
    if(gateways)await evalJs("document.getElementById('routes').value = "+JSON.stringify(gateways));
    if(codebase)await evalJs("document.getElementById('codebase').value = "+JSON.stringify(codebase));
    await evalJs("document.getElementById('start').click()");
    let result={},steadyStart=0,steadyStartCycle=-1,lastProgress=0,lastCycle=-1;
    const requireTitle=process.env.SOLOSCAPE_ENGINE_REQUIRE_TITLE==="1";
    while(Date.now()<deadline){
        await pause(500);
        result=await evalJs("JSON.parse(JSON.stringify(window.engineSmokeState ?? {}))");
        const progressed=result.cycles?.filter(c=>Number.isInteger(c)&&c>=0)??[];
        if(result.phase==="error"||result.callbackError)break;
        const cycle=progressed.at(-1)??-1;
        if(cycle>lastCycle){lastCycle=cycle;lastProgress=Date.now();}
        const active=progressed.length>=2&&cycle>progressed[0]&&
            result.frameChanged&&result.clientThread&&result.phase==="initialized";
        if(active){
            if(!steadyStart){steadyStart=Date.now();steadyStartCycle=cycle;}
            // Sustained real progress matters: a startup burst followed by a
            // blocked JS5 read cannot count as a stable game loop.
            const expected=Math.max(3,Math.floor(stabilityMs/1000)*4);
            if(Date.now()-steadyStart>=stabilityMs&&cycle-steadyStartCycle>=expected&&
                Date.now()-lastProgress<2500&&(!requireTitle||result.gameState==="LOGIN_SCREEN"&&result.canvasSampleColors>=16)){
                passed=true;break;
            }
        }else{steadyStart=0;steadyStartCycle=-1;}
    }
    const captureDirectory=process.env.SOLOSCAPE_ENGINE_CAPTURE_DIR;
    let capture=null;
    if(captureDirectory){
        await mkdir(captureDirectory,{recursive:true});
        const canvas=await evalJs("document.getElementById('original-engine-canvas').toDataURL('image/png').split(',')[1]");
        const id=++seq;
        const imagePromise=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
        socket.send(JSON.stringify({id,method:"Page.captureScreenshot",params:{format:"png",captureBeyondViewport:false}}));
        const page=await imagePromise;
        await writeFile(join(captureDirectory,"original-engine-canvas.png"),Buffer.from(canvas,"base64"));
        await writeFile(join(captureDirectory,"original-engine-page.png"),Buffer.from(page,"base64"));
        capture={canvas:join(captureDirectory,"original-engine-canvas.png"),page:join(captureDirectory,"original-engine-page.png")};
    }
    console.log(JSON.stringify({browser:"Chrome",originalEngine:true,passed,stabilityMs,capture,gatewayTraffic,
        phase:result.phase,step:result.step,cycles:result.cycles,gameState:result.gameState,canvasSampleColors:result.canvasSampleColors,socketAttempts:result.socketAttempts,resourceLookups:result.resourceLookups,filePaths:result.filePaths,frameChanged:result.frameChanged,
        clientThread:result.clientThread,error:result.error,callbackError:result.callbackError,
        browserExceptions,debugPauses,debugProbes,events:result.events},null,2));
    if(!passed)console.error(process.env.SOLOSCAPE_ENGINE_REQUIRE_TITLE==="1"
        ?"NOT VERIFIED: Original LOGIN_SCREEN title framebuffer with substantial artwork and sustained client cycles was not observed."
        :"NOT VERIFIED: Sustained original engine cycles and framebuffer changes were not both observed.");
}catch(error){console.error("Original engine browser smoke: "+error.message);}
finally{
    if(socket){socket.on("error",()=>{});socket.close();}
    // Chrome may delegate to another Windows process and exit its launcher PID.
    // Close only our private debug-profile browser, never the user's normal Chrome.
    if(debuggerPort){
        try{
            const version=await(await fetch("http://127.0.0.1:"+debuggerPort+"/json/version")).json();
            const control=new WebSocket(version.webSocketDebuggerUrl);
            await Promise.race([
                new Promise((resolve,reject)=>{control.once("open",resolve);control.once("error",reject);}),
                pause(2000).then(()=>{throw new Error("Browser close handshake timed out");})
            ]);
            control.on("error",()=>{});
            control.send(JSON.stringify({id:1,method:"Browser.close"}));
            await pause(500);
            control.close();
        }catch{ /* isolated debug browser may already have exited */ }
    }
    if(child?.pid&&child.exitCode===null){
        if(process.platform==="win32")spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore"});
        else child.kill("SIGTERM");
    }
    if(js5Gateway)await js5Gateway.close();
    await new Promise(resolve=>server.close(resolve));
    try{await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
    catch(error){console.error("Temporary Chrome profile cleanup failed: "+error.message);}
}
if(!passed)process.exitCode=1;
