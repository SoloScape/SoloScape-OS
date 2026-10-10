// The original Java gamepack still owns every game action and software frame.
import {loadOriginalCache} from "/original-cache-loader.mjs";
import {attachOriginalKeyboard} from "/original-mobile-keyboard.mjs";
const $=id=>document.getElementById(id);
function loading(message){
    const indicator=$("loading-status");
    if(indicator&&!indicator.hidden)indicator.textContent=message;
}
function showStartupError(message){
    const indicator=$("loading-status");if(indicator)indicator.hidden=true;
    const box=$("startup-error");
    if(box){box.textContent=message;box.hidden=false;}
}
const state=window.engineSmokeState={phase:"not-started",step:"not-started",cycles:[],frameChanged:false,canvasSampleColors:0,
    clientThread:false,gameState:"UNAVAILABLE",originalFps:-1,presentedFrames:0,presentedFps:0,cycleRate:0,clockStats:null,loginRsaConfigured:false,callbackTrace:"",socketAttempts:[], resourceLookups:[],filePaths:[],error:"",callbackError:"",events:[]};
let engine,clock=0,initialPixelSignature,framePoll;
// An invisible password-type input opens the mobile OS keyboard. The original
// Java client still renders login fields and handles authentication itself.
attachOriginalKeyboard({canvas:$("original-engine-canvas"),
    keyboard:$("original-soft-keyboard"),getGameState:()=>state.gameState});
// Fixed, read-only scene count snapshot for debugging missing original world locs.
window.engineSmokeSceneCounts=()=>engine?.sceneLocCounts?.()??null;
const fpsSamples=[];
function event(message){
    const safe=String(message).slice(0,1000);
    state.events.push(safe);if(state.events.length>25)state.events.shift();
}
function signature(){
    const canvas=$("original-engine-canvas");
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx||!canvas.width||!canvas.height)return null;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let hash=2166136261,unique=new Set();
    for(let y=0;y<20;y++)for(let x=0;x<30;x++){
        const i=(Math.floor((y+.5)*canvas.height/20)*canvas.width+
            Math.floor((x+.5)*canvas.width/30))*4;
        const rgb=(data[i]<<16)|(data[i+1]<<8)|data[i+2];
        unique.add(rgb);hash=Math.imul((hash^rgb)>>>0,16777619)>>>0;
    }
    return {hash,colors:unique.size};
}
function collect(){
    try{
        state.step=engine.startupStep();
        const hooksError=engine.callbackError();
        if(hooksError && hooksError!==state.callbackError){
            state.callbackError=hooksError;
            state.phase="error";
            state.error="original client thread: "+hooksError;
            state.callbackTrace=engine.callbackTrace?.()??"";
            event("Original client callback error: "+hooksError);
            if(state.gameState!=="LOGGED_IN")showStartupError(
                "The original game stopped during startup. Reload to retry; /health checks the LAN connection.");
            if(state.callbackTrace)event("Original client callback frames: "+state.callbackTrace);
            showStartupError("Original game encountered an error. Reload the page to retry.");
        }
        const cycle=engine.gameCycle();
        if(state.cycles.at(-1)!==cycle){state.cycles.push(cycle);if(state.cycles.length>50)state.cycles.shift();}
        state.clientThread=engine.hasClientThread();
        state.gameState=engine.gameState();
        if(state.gameState==="LOGIN_SCREEN"||state.gameState==="LOGGED_IN"){
            const indicator=$("loading-status");
            if(indicator)indicator.hidden=true;
        }
        state.socketAttempts=globalThis.soloscapeEngineSocketAttempts??[];
        state.resourceLookups=globalThis.soloscapeOriginalResourceLookups??[];
        state.filePaths=(globalThis.soloscapeOriginalFilePaths??[]).filter(path=>/cache|jagex|oldschool|random\.dat|\.idx/i.test(path)).slice(-40);
        state.originalFps=engine.originalFps();
        state.presentedFrames=engine.presentedFrames();
        state.clockStats={
            calls:engine.clockCalls(),ticks:engine.clockTicks(),
            lastTicks:engine.clockLastTicks(),maxTicks:engine.clockMaxTicks(),
            gapMs:engine.clockGapMs(),waitMs:engine.clockWaitMs()
        };
        const now=performance.now();
        if(cycle>=0){
            fpsSamples.push({time:now,cycle,frames:state.presentedFrames});
            while(fpsSamples.length>2&&now-fpsSamples[0].time>3500)fpsSamples.shift();
            if(fpsSamples.length>1){
                const earliest=fpsSamples[0],seconds=(now-earliest.time)/1000;
                if(seconds>=1){
                    state.presentedFps=Math.round(10*(state.presentedFrames-earliest.frames)/seconds)/10;
                    state.cycleRate=Math.round(10*(cycle-earliest.cycle)/seconds)/10;
                }
            }
        }
        const current=signature();
        state.canvasSampleColors=current?.colors??0;
        if(current&&initialPixelSignature&&current.hash!==initialPixelSignature.hash)
            state.frameChanged=true;
    }catch(error){state.error=String(error);event("Telemetry error: "+state.error);}
}
// The page owns startup; opening it is the only initialization action.
// Keep the original public configuration, original cache, RSA and gateway.
async function initializeOriginalEngine(){
    try{
        let params=JSON.parse($("params").textContent);
        let codebase=window.location.origin+"/";
        const routes=[];
        // This optional endpoint exists only for isolated, loopback-only
        // browser tests; player pages do not expose editable bootstrap UI.
        const overridesResponse=await fetch("/original-public-config");
        if(overridesResponse.ok){
            const overrides=await overridesResponse.json();
            if(overrides?.parameters!==undefined)params=overrides.parameters;
            if(overrides?.routes!==undefined){
                if(!Array.isArray(overrides.routes))throw new Error("Invalid public gateway overrides");
                routes.push(...overrides.routes);
            }
            if(overrides?.codebase!==undefined){
                if(typeof overrides.codebase!=="string")throw new Error("Invalid public codebase override");
                codebase=overrides.codebase;
            }
        }else if(overridesResponse.status!==404)
            throw new Error("Local public bootstrap unavailable");
        if(!params||Array.isArray(params)||typeof params!=="object")
            throw new Error("Original public startup parameters are invalid");
        // The pinned original gamepack writes jav_config parameter 9 into its
        // login packet. Omitting it leaves a null Java String and crashes the
        // original packet writer (JavaScript string property dereference).
        if(typeof params["9"]!=="string"||!params["9"].length)
            throw new Error("Missing original gamepack public startup parameter 9");
        // In revision 240, parameter 4 is the original login client-type ID,
        // NOT the TCP port. rsprot requires desktop=1; the gateway routes
        // the separate native TCP connection to port 43594.
        if(params["4"]!=="1")
            throw new Error("Original revision-240 login client type must be desktop (parameter 4 = 1)");
        if(routes.length===0){
            const configured=await fetch("/original-gateway");
            if(configured.ok){
                const {routes:defaults}=await configured.json();
                if(Array.isArray(defaults))routes.push(...defaults);
            }
        }
        state.phase="loading";loading("Loading original Java engine…");
        engine=await import("/engine.js");
        for(const name of ["configureClient","configureClientParameter","initializeAsync","gameCycle","hasClientThread"])
            if(typeof engine[name]!=="function")throw new Error("Engine rebuild required: "+name+" missing");
        // Supply the exact small classpath resources packaged in the pinned
        // original gamepack, never placeholders or gameplay substitutions.
        // An explicit local development cache snapshot is mounted read-write
        // only inside Chrome's memory. The original server files remain read-only.
        loading("Preparing original game cache…");
        const cacheManifest=await fetch("/original-cache/manifest");
        if(cacheManifest.ok){
            const manifest=await cacheManifest.json();
            if(!Array.isArray(manifest.files))throw new Error("Invalid local cache manifest");
            const files=await loadOriginalCache(manifest,{onProgress:({loaded,total})=>{
                const percent=total?Math.min(100,Math.floor(loaded*100/total)):100;
                loading("Loading original game data… "+percent+"%");
            }});
            globalThis.soloscapeOriginalCacheFiles=files;
            event("Loaded "+files.size+" original cache files in browser memory (no server writes)");
        }
        for(const name of ["client.serial","compilercontrol.json","runelite/index"]){
            const response=await fetch("/original-resource/"+name);
            if(!response.ok)throw new Error("Original gamepack resource missing: "+name);
            const bytes=new Uint8Array(await response.arrayBuffer());
            if(bytes.length>65536)throw new Error("Unexpected original resource size");
            engine.registerResource(name,Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join(""));
        }
        engine.configureCanvas("original-engine-canvas");
        engine.configureClient(codebase);
        for(const [name,value] of Object.entries(params)){
            if(typeof value!=="string")throw new Error("Parameter "+name+" must be a string");
            engine.configureClientParameter(name,value);
        }
        for(const route of routes){
            if(!route||typeof route.host!=="string"||!Number.isInteger(route.port)||
                typeof route.url!=="string")throw new Error("Invalid gateway route");
            engine.configureGateway(route.host,route.port,route.url);
        }
        const publicKeyResponse=await fetch("/original-login-public-key");
        if(publicKeyResponse.ok){
            const rsa=await publicKeyResponse.json();
            engine.configureLoginRsaPublic(rsa.exponent,rsa.modulus);
            state.loginRsaConfigured=engine.loginRsaConfigured();
            event("SoloScape public RSA key configured (private keys and key bytes never logged)");
        }else if(publicKeyResponse.status===404){
            event("Original title-only smoke: local login RSA not configured");
        }else throw new Error("SoloScape public login key unavailable");
        loading("Starting original game…");
        initialPixelSignature=signature();
        event("Original engine initializeAsync invoked");
        framePoll=setInterval(collect,500);
        // A stalled client thread may never invoke initializeAsync's completion
        // callback on mobile Safari. Report it without claiming a successful login.
        const slowStartup=setTimeout(()=>{
            if(state.gameState==="LOGIN_SCREEN"||state.gameState==="LOGGED_IN"||state.phase==="error")return;
            const step=engine?.startupStep?.()??"initializing";
            const safeStep=/^[a-z-]{1,40}$/.test(step)?step:"initializing";
            showStartupError("Game startup is taking too long ("+safeStep+"). Reload to retry. If it repeats on iPhone, the browser may be running out of memory.");
        },90000);
        engine.initializeAsync(error=>{
            clearTimeout(slowStartup);
            state.phase=error?"error":"initialized";
            state.error=error||"";
            event(error?"Original engine initialization error: "+error:"Initialize returned (cycles not yet proven)");
            if(error)showStartupError("Original game failed to initialize. Reload the page to retry.");
        });
    }catch(error){
        state.phase="error";state.error=String(error);
        event(state.error);
        const memory=/memory|allocation|out of bounds/i.test(String(error));
        showStartupError(memory?
            "The original game exceeded available browser memory. Try desktop while mobile optimization continues.":
            "Unable to start the game. Reload the page or visit /health to check the LAN server.");
    }
}
window.addEventListener("pagehide",()=>{if(framePoll)clearInterval(framePoll);},{once:true});
// Automatic, exactly once on page load; login itself remains manual.
void initializeOriginalEngine();
