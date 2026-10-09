// Distinct diagnostic entry point. Never imported by the normal SoloScape homepage.
const $=id=>document.getElementById(id);
const state=window.engineSmokeState={phase:"not-started",step:"not-started",cycles:[],frameChanged:false,canvasSampleColors:0,
    clientThread:false,gameState:"UNAVAILABLE",socketAttempts:[],resourceLookups:[],filePaths:[],error:"",callbackError:"",events:[]};
let engine,clock=0,initialPixelSignature,framePoll;
function event(message){
    const safe=String(message).slice(0,1000);
    state.events.push(safe);if(state.events.length>25)state.events.shift();
    $("events").textContent=state.events.join("\n");
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
        $("status").textContent=state.phase+" ("+state.step+")";
        const hooksError=engine.callbackError();
        if(hooksError && hooksError!==state.callbackError){
            state.callbackError=hooksError;
            state.phase="error";
            state.error="original client thread: "+hooksError;
            $("status").textContent="error (client thread)";
            event("Original client callback error: "+hooksError);
        }
        const cycle=engine.gameCycle();
        if(state.cycles.at(-1)!==cycle){state.cycles.push(cycle);if(state.cycles.length>50)state.cycles.shift();}
        state.clientThread=engine.hasClientThread();
        state.gameState=engine.gameState();
        state.socketAttempts=globalThis.soloscapeEngineSocketAttempts??[];
        state.resourceLookups=globalThis.soloscapeOriginalResourceLookups??[];
        state.filePaths=(globalThis.soloscapeOriginalFilePaths??[]).filter(path=>/cache|jagex|oldschool|random\.dat|\.idx/i.test(path)).slice(-40);
        const gameState=document.getElementById("game-state");
        if(gameState)gameState.textContent=state.gameState;
        $("cycle").textContent=String(cycle);
        $("thread").textContent=state.clientThread?"Present":"Missing";
        const current=signature();
        state.canvasSampleColors=current?.colors??0;
        if(current&&initialPixelSignature&&current.hash!==initialPixelSignature.hash)
            state.frameChanged=true;
        $("frame").textContent=state.frameChanged?"Yes":"No";
        const progressed=state.cycles.filter(c=>c>=0);
        const running=progressed.length>=2&&progressed.at(-1)>progressed[0];
        $("result").textContent=running&&state.frameChanged
            ?"Original game cycles are advancing and the canvas changed."
            : "Initialization alone is not gameplay proof. Checking original cycles and canvas pixels.";
    }catch(error){state.error=String(error);event("Telemetry error: "+state.error);}
}
function parseJson(id,kind){
    const value=JSON.parse($(id).value);
    if(kind==="object"&&(!value||Array.isArray(value)||typeof value!=="object"))throw new Error(id+" must be a JSON object");
    if(kind==="array"&&!Array.isArray(value))throw new Error(id+" must be a JSON array");
    return value;
}
$("codebase").value=window.location.origin+"/";
$("start").addEventListener("click",async()=>{
    $("start").disabled=true;
    try{
        const params=parseJson("params","object"),routes=parseJson("routes","array");
        if(routes.length===0){
            const configured=await fetch("/original-gateway");
            if(configured.ok){
                const {routes:defaults}=await configured.json();
                if(Array.isArray(defaults))routes.push(...defaults);
            }
        }
        state.phase="loading";$("status").textContent="Importing engine";
        engine=await import("/engine.js");
        for(const name of ["configureClient","configureClientParameter","initializeAsync","gameCycle","hasClientThread"])
            if(typeof engine[name]!=="function")throw new Error("Engine rebuild required: "+name+" missing");
        // Supply the exact small classpath resources packaged in the pinned
        // original gamepack, never placeholders or gameplay substitutions.
        // An explicit local development cache snapshot is mounted read-write
        // only inside Chrome's memory. The original server files remain read-only.
        const cacheManifest=await fetch("/original-cache/manifest");
        if(cacheManifest.ok){
            const manifest=await cacheManifest.json();
            if(!Array.isArray(manifest.files))throw new Error("Invalid local cache manifest");
            const files=new Map();
            const prefix="/home/soloscape/jagexcache/oldschool/LIVE/";
            await Promise.all(manifest.files.map(async file=>{
                if(!/^main_file_cache\.(?:dat2|idx(?:255|[0-9]|1[0-9]|2[0-4]))$/.test(file.name)||
                    !Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>512*1024*1024)
                    throw new Error("Invalid native cache entry");
                const response=await fetch("/original-cache/"+file.name);
                if(!response.ok)throw new Error("Native cache source unavailable: "+file.name);
                const bytes=new Uint8Array(await response.arrayBuffer());
                if(bytes.length!==file.bytes)throw new Error("Incomplete local cache: "+file.name);
                files.set(prefix+file.name,bytes);
            }));
            for(let i=0;i<=24;i++){
                const name=prefix+"main_file_cache.idx"+i;
                if(!files.has(name))files.set(name,new Uint8Array(0));
            }
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
        engine.configureClient($("codebase").value);
        for(const [name,value] of Object.entries(params)){
            if(typeof value!=="string")throw new Error("Parameter "+name+" must be a string");
            engine.configureClientParameter(name,value);
        }
        for(const route of routes){
            if(!route||typeof route.host!=="string"||!Number.isInteger(route.port)||
                typeof route.url!=="string")throw new Error("Invalid gateway route");
            engine.configureGateway(route.host,route.port,route.url);
        }
        initialPixelSignature=signature();
        $("status").textContent="Initializing";
        event("Original engine initializeAsync invoked");
        framePoll=setInterval(collect,500);
        engine.initializeAsync(error=>{
            state.phase=error?"error":"initialized";
            state.error=error||"";
            $("status").textContent=state.phase;
            event(error?"Original engine initialization error: "+error:"Initialize returned (cycles not yet proven)");
        });
    }catch(error){
        state.phase="error";state.error=String(error);
        $("status").textContent="error";event(state.error);
    }
},{once:true});
window.addEventListener("pagehide",()=>{if(framePoll)clearInterval(framePoll);},{once:true});
