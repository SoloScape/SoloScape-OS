// Phase 2 sustained authenticated original-engine verification.
// This is instrumentation, NOT a gameplay implementation or fabricated parity check.
// Run only against the private Stage 2 controller's owned original Chrome session.
import {writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {sendControllerRequest} from "./controller-service.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const dest=join(root,"teavm-poc","target","engine","phase2-reports");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const isFiniteNonnegative=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
export function summarizeAuthenticated(samples,durationMs,startedAt){
    const first=samples[0],last=samples.at(-1);
    const valid=samples.filter(s=>s.state==="LOGGED_IN"&&!s.error);
    const fps=valid.map(s=>s.fps).filter(isFiniteNonnegative);
    const cycles=valid.map(s=>s.cycleRate).filter(isFiniteNonnegative);
    const heap=samples.filter(s=>isFiniteNonnegative(s.heapUsedMB));
    const p50=list=>list.length?list.slice().sort((a,b)=>a-b)[Math.floor(list.length/2)]:null;
    const stalls=[];
    for(let i=1;i<samples.length;i++){
        const a=samples[i-1],b=samples[i];
        if(a.state==="LOGGED_IN"&&b.state==="LOGGED_IN"&&
            b.elapsedMs-a.elapsedMs>=3000&&b.cycle-a.cycle<0.25*((b.elapsedMs-a.elapsedMs)/1000))
            stalls.push({elapsedMs:b.elapsedMs,seconds:(b.elapsedMs-a.elapsedMs)/1000,
                cycleChange:b.cycle-a.cycle});
    }

    const renderStalls=[];
    for(let i=1;i<samples.length;i++){
        const a=samples[i-1],b=samples[i];
        if(a.state==="LOGGED_IN"&&b.state==="LOGGED_IN"&&
            b.elapsedMs-a.elapsedMs>=5000&&b.frames<=a.frames)
            renderStalls.push({elapsedMs:b.elapsedMs,seconds:(b.elapsedMs-a.elapsedMs)/1000});
    }
    const fatal=samples.filter(s=>s.error);
    const lost=samples.filter(s=>s.state!=="LOGGED_IN");
    const heapGrowth=heap.length>=2?Math.round(10*(heap.at(-1).heapUsedMB-heap[0].heapUsedMB))/10:null;
    const reasons=[];
    if(samples.length<2)reasons.push("Insufficient samples");
    if((last?.elapsedMs??0)<durationMs*0.95)reasons.push("Authenticated duration incomplete");
    if(lost.length)reasons.push("Original game state left LOGGED_IN");
    if(fatal.length)reasons.push("Original client callback or telemetry error");
    if(stalls.length)reasons.push("Possible game-cycle stalls");
    if(renderStalls.length)reasons.push("Original framebuffer not presented across sampling interval");
    const severeSamples=valid.filter(s=>isFiniteNonnegative(s.fps)&&isFiniteNonnegative(s.cycleRate)&&
        (s.fps<5||s.cycleRate<35));
    if(severeSamples.length)reasons.push("Severe transient original-engine performance degradation");
    return {status:reasons.length?"FAILED_OR_INCOMPLETE":"PASS_RUNTIME_ONLY",
        reasons,requestedMinutes:durationMs/60000,startedAt,
        observedSeconds:last?Math.round(last.elapsedMs/1000):0,sampleCount:samples.length,
        minPresentedFps:fps.length?Math.min(...fps):null,medianPresentedFps:p50(fps),
        minCyclesPerSecond:cycles.length?Math.min(...cycles):null,
        medianCyclesPerSecond:p50(cycles),
        gameCycleDelta:first&&last?last.cycle-first.cycle:null,
        originalFramesDelta:first&&last?last.frames-first.frames:null,
        jsHeapStartMB:heap.length?heap[0].heapUsedMB:null,
        jsHeapEndMB:heap.length?heap.at(-1).heapUsedMB:null,
        jsHeapGrowthMB:heapGrowth,heapSamples:heap.length,stalls,
        renderStalls,severePerformanceSamples:severeSamples.map(s=>({
            elapsedMs:s.elapsedMs,fps:s.fps,cyclesPerSecond:s.cycleRate,
            pageVisibility:s.pageVisibility,pageFocused:s.pageFocused
        })),loggedOutSamples:lost.length,fatalSamples:fatal.length,
        verifiedGameplaySystems:[],
        unverifiedGameplaySystems:["NPC interaction","inventory","banking",
            "dialogue","chat","region transitions","disconnect/reconnect"],
        note:"Runtime-only observation. Category-specific gameplay and memory leak diagnosis require screenshots/action evidence; JS heap is not full Chrome RSS."};
}
function shape(sample,elapsedMs){
    const c=sample?.client;
    if(!c)throw new Error("Original engine session not started");
    return {elapsedMs:Math.round(elapsedMs),state:c.gameState,
        cycle:c.gameCycle,frames:c.presentedFrames,
        fps:c.presentedFps,cycleRate:c.cyclesPerSecond,
        originalFps:c.originalFps,
        clientThread:c.clientThread,frameChanged:c.frameChanged,
        pageVisibility:c.pageVisibility??"UNAVAILABLE",pageFocused:c.pageFocused===true,
        error:!!(c.hasError||c.callbackError||!c.clientThread)};
}
export async function runPhase2({
    minutes=20,waitLoginMinutes=5,pollMs=10000,
    request=sendControllerRequest,now=Date.now,pause=sleep,
    emit=message=>console.log(message)
}={}){
    if(!Number.isFinite(minutes)||minutes<0.02||minutes>30)
        throw new Error("Minutes out of range");
    const durationMs=Math.round(minutes*60000);
    const deadline=now()+waitLoginMinutes*60000;
    let initial;
    while(now()<deadline){
        initial=await request("status");
        if(initial.client?.gameState==="LOGGED_IN")break;
        if(initial.client?.hasError||initial.client?.callbackError)
            throw new Error("Original engine callback error before login");
        await pause(Math.min(5000,pollMs));
    }
    if(initial?.client?.gameState!=="LOGGED_IN")
        return {status:"NEEDS_MANUAL_LOGIN",started:false,
            note:"Original client never reached LOGGED_IN; no authenticated stability claim."};
    const begin=now(),startedAt=new Date(begin).toISOString(),samples=[];
    emit("Authenticated Phase 2 runtime sampling started: "+startedAt);
    for(let index=0;now()-begin<durationMs;index++){
        const elapsedMs=now()-begin;
        const current=await request("status");
        const row=shape(current,elapsedMs);
        if(index%3===0&&row.state==="LOGGED_IN"){
            try{
                const heap=await request("heap");
                if(isFiniteNonnegative(heap.usedBytes))
                    row.heapUsedMB=Math.round(100*heap.usedBytes/1048576)/100;
                if(isFiniteNonnegative(heap.totalBytes))
                    row.heapTotalMB=Math.round(100*heap.totalBytes/1048576)/100;
            }catch{row.heapUnavailable=true;}
        }
        samples.push(row);
        if(index%6===0)emit("Phase 2 "+Math.round(elapsedMs/60000)+"m: "+row.state+
            ", presented FPS "+row.fps+", cycles/s "+row.cycleRate+
            (row.heapUsedMB===undefined?"":", JS heap "+row.heapUsedMB+"MB"));
        await pause(Math.min(pollMs,Math.max(0,durationMs-(now()-begin))));
    }
    const report=summarizeAuthenticated(samples,durationMs,startedAt);
    return {...report,samples};
}
async function main(argv){
    const minutes=argv.length?Number(argv[0]):20;
    if(!Number.isFinite(minutes)||minutes<15||minutes>30)
        throw new Error("Usage: node dev-bridge/verify-gameplay.mjs <15..30 minutes>");
    const result=await runPhase2({minutes});
    await mkdir(dest,{recursive:true});
    const name="phase2-"+Date.now()+".json";
    const path=join(dest,name);
    await writeFile(path,JSON.stringify(result,null,2)+"\n",{flag:"wx",mode:0o600});
    const {samples,...summary}=result;
    console.log(JSON.stringify({reportPath:path,...summary},null,2));
    if(result.status!=="PASS_RUNTIME_ONLY")process.exitCode=1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
    main(process.argv.slice(2)).catch(e=>{
        console.error("Phase 2 test failed: "+
            (/^(?:Original|Minutes|Usage|Controller)/.test(String(e?.message))?e.message:"Runtime error; review local diagnostic"));
        process.exitCode=1;
    });
}
