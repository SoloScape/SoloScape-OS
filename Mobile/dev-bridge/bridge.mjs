// Fixed, audited actions against the original-engine diagnostic.
// Deliberately NO arbitrary JavaScript, DOM inspection, network fetch, credentials,
// filesystem access, packet capture, or operation outside owned localhost Chrome.
import {OwnedChrome} from "./chrome.mjs";

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const allowedKeys=new Set(["Escape","Enter","Tab","Backspace","Space",
    "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
    ...Array.from({length:12},(_,i)=>"F"+(i+1))]);
const stateExpr=`(()=>{const s=window.engineSmokeState;if(!s)return null;
return JSON.stringify({phase:s.phase,step:s.step,gameState:s.gameState,
gameCycle:s.cycles?.at(-1),originalFps:s.originalFps,
presentedFrames:s.presentedFrames,presentedFps:s.presentedFps,
cycleRate:s.cycleRate,clientThread:s.clientThread,frameChanged:s.frameChanged,
clockStats:s.clockStats,callbackError:s.callbackError,callbackTrace:s.callbackTrace,
hasError:!!s.error});})()`;
const rectExpr=`(()=>{const c=document.getElementById('original-engine-canvas');
if(!c)return null;const r=c.getBoundingClientRect();
return JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height,
canvasWidth:c.width,canvasHeight:c.height});})()`;

function finite(value,fallback=-1){
    return typeof value==="number"&&Number.isFinite(value)?value:fallback;
}
function word(value,fallback="UNAVAILABLE"){
    return typeof value==="string"&&/^[A-Za-z_ -]{1,48}$/.test(value)?value:fallback;
}
export function sanitizeError(value){
    if(!value)return "";
    const input=String(value);
    const classes=[...input.matchAll(/\b(?:java\.lang\.)?[A-Za-z]+(?:Exception|Error)\b|\b(?:TypeError|ReferenceError|SyntaxError)\b/g)]
        .map(m=>m[0]).slice(0,3);
    const property=/Cannot read properties of null \(reading '([A-Za-z0-9_$]{1,32})'\)/.exec(input);
    return classes.length||property
        ?[...classes,...(property?["null property: "+property[1]]:[])].join("; ")
        :"Original client error recorded (unrecognised details withheld)";
}
export function sanitizeTrace(input){
    if(!input)return "";
    const values=String(input).split("|").map(t=>t.trim()).filter(t=>
        /^(?:[A-Za-z_$][A-Za-z0-9_.$]{0,90}):\d{1,8}:\d{1,8}$/.test(t));
    return values.slice(0,16).join(" | ");
}
function boundedInt(v,min,max,label){
    if(!Number.isInteger(v)||v<min||v>max)
        throw new Error(label+" must be an integer from "+min+" to "+max);
    return v;
}
export function sanitizeState(raw){
    if(!raw||typeof raw!=="object")throw new Error("Original diagnostic telemetry unavailable");
    const stats=raw.clockStats;
    return {
        phase:word(raw.phase),startupStep:word(raw.step),
        gameState:word(raw.gameState),gameCycle:finite(raw.gameCycle),
        originalFps:finite(raw.originalFps),presentedFps:finite(raw.presentedFps),
        presentedFrames:finite(raw.presentedFrames),cyclesPerSecond:finite(raw.cycleRate),
        clientThread:raw.clientThread===true,frameChanged:raw.frameChanged===true,
        clock:stats&&typeof stats==="object"?{
            calls:finite(stats.calls),ticks:finite(stats.ticks),
            lastTicks:finite(stats.lastTicks),maxTicks:finite(stats.maxTicks),
            gapMs:finite(stats.gapMs),waitMs:finite(stats.waitMs)
        }:null,
        callbackError:sanitizeError(raw.callbackError),
        callbackFrames:sanitizeTrace(raw.callbackTrace),
        hasError:raw.hasError===true
    };
}
function keyDescription(key){
    if(allowedKeys.has(key)){
        if(key.startsWith("Arrow"))return {key,code:key,virtualKey:37+["Left","Up","Right","Down"].indexOf(key.slice(5))};
        if(/^F\d+$/.test(key))return {key,code:key,virtualKey:111+Number(key.slice(1))};
        const maps={Escape:27,Enter:13,Tab:9,Backspace:8,Space:32};
        return {key:key==="Space"?" ":key,code:key,virtualKey:maps[key],text:key==="Space"?" ":undefined};
    }
    if(/^[a-z0-9]$/.test(key)){
        const code=/^[a-z]$/.test(key)?"Key"+key.toUpperCase():"Digit"+key;
        return {key,code,virtualKey:key.toUpperCase().charCodeAt(0),text:key};
    }
    throw new Error("Key not allowed. Use navigation keys, F1–F12 or one alphanumeric character.");
}
export class Stage1Bridge {
    constructor(browser=new OwnedChrome()){this.browser=browser;}
    async browserStart(){return this.browser.start();}
    async browserClose(){return this.browser.stop();}
    browserStatus(){return {connected:this.browser.active,url:this.browser.active?this.browser.url:null};}
    async getClientState(){
        const raw=await this.browser.evaluate(stateExpr);
        return sanitizeState(raw==null?null:JSON.parse(raw));
    }
    async initializeEngine(){
        const state=await this.getClientState();
        if(state.phase!=="not-started")
            throw new Error("Initialize is only allowed once per fresh diagnostic page");
        const started=await this.browser.evaluate(`(()=>{const b=document.getElementById('start');
if(!b||b.disabled)return false;b.click();return true;})()`);
        if(started!==true)throw new Error("Original engine Initialize button unavailable");
        return {started:true,note:"Original engine initialization requested; check get_client_state for progress"};
    }
    async waitForState({gameState="LOGGED_IN",timeoutMs=30000}={}){
        if(!["LOGGED_IN","LOGIN_SCREEN","STARTING","LOADING","CONNECTION_LOST","UNAVAILABLE"].includes(gameState))
            throw new Error("Unsupported original game state");
        boundedInt(timeoutMs,500,60000,"timeoutMs");
        const deadline=Date.now()+timeoutMs;
        let state=await this.getClientState();
        while(state.gameState!==gameState&&Date.now()<deadline&&!state.hasError){
            await sleep(Math.min(500,Math.max(1,deadline-Date.now())));
            state=await this.getClientState();
        }
        return {reached:state.gameState===gameState,wanted:gameState,...state};
    }
    async requireWorld(){
        const state=await this.getClientState();
        if(state.gameState!=="LOGGED_IN"||state.hasError||state.callbackError)
            throw new Error("Gameplay actions and screenshots require a healthy LOGGED_IN original client");
        return state;
    }
    async canvasBounds(){
        const raw=await this.browser.evaluate(rectExpr);
        if(!raw)throw new Error("Original framebuffer canvas not ready");
        const p=JSON.parse(raw);
        for(const name of ["left","top","width","height","canvasWidth","canvasHeight"]){
            if(!Number.isFinite(p[name]))throw new Error("Invalid original canvas geometry");
        }
        if(p.width<20||p.height<20||p.canvasWidth<20||p.canvasHeight<20||
            p.width>4096||p.height>4096||p.canvasWidth>4096||p.canvasHeight>4096)
            throw new Error("Original canvas dimensions outside safe limits");
        return p;
    }
    async captureScreen(){
        await this.requireWorld();
        // Capture the Java game's exact backing framebuffer, not the Chrome
        // viewport: login controls, browser UI and scrolled page content never
        // enter the screenshot. This expression is fixed, not supplied by MCP.
        const data=await this.browser.evaluate(`(()=>{const c=document.getElementById('original-engine-canvas');
if(!c||c.width<20||c.height<20||c.width>4096||c.height>4096)return null;
const png=c.toDataURL('image/png');return png.startsWith('data:image/png;base64,')?
png.slice('data:image/png;base64,'.length):null;})()`);
        if(typeof data!=="string"||data.length<32||data.length>8*1024*1024||
            !/^[A-Za-z0-9+/=]+$/.test(data))
            throw new Error("Invalid or oversized framebuffer capture");
        return {mimeType:"image/png",data};
    }
    async clickCanvas({x,y,button="left"}={}){
        await this.requireWorld();
        const rect=await this.canvasBounds();
        boundedInt(x,0,rect.canvasWidth-1,"x");
        boundedInt(y,0,rect.canvasHeight-1,"y");
        if(!["left","right"].includes(button))throw new Error("Only left or right mouse button allowed");
        const px=rect.left+(x+0.5)*rect.width/rect.canvasWidth;
        const py=rect.top+(y+0.5)*rect.height/rect.canvasHeight;
        await this.browser.command("Input.dispatchMouseEvent",{type:"mouseMoved",x:px,y:py});
        await this.browser.command("Input.dispatchMouseEvent",{type:"mousePressed",x:px,y:py,button,clickCount:1});
        await this.browser.command("Input.dispatchMouseEvent",{type:"mouseReleased",x:px,y:py,button,clickCount:1});
        return {sent:true,button,x,y,note:"Click delivered to original canvas; game response not inferred"};
    }
    async pressKey({key}={}){
        await this.requireWorld();
        const k=keyDescription(key);
        const common={key:k.key,code:k.code,windowsVirtualKeyCode:k.virtualKey,
            nativeVirtualKeyCode:k.virtualKey};
        await this.browser.command("Input.dispatchKeyEvent",{type:"keyDown",...common});
        if(k.text)await this.browser.command("Input.dispatchKeyEvent",{
            type:"char",text:k.text,unmodifiedText:k.text,...common});
        await this.browser.command("Input.dispatchKeyEvent",{type:"keyUp",...common});
        return {sent:true,key,note:"Single key sent after login; no credential-entry tools"};
    }
    async getDiagnostics(){
        const state=await this.getClientState();
        return {gameState:state.gameState,phase:state.phase,gameCycle:state.gameCycle,
            callbackError:state.callbackError,callbackFrames:state.callbackFrames,
            hasError:state.hasError,clock:state.clock};
    }
    async profilePerformance({durationMs=3000,cpu=false}={}){
        boundedInt(durationMs,500,15000,"durationMs");
        if(typeof cpu!=="boolean")throw new Error("cpu must be a boolean");
        const before=await this.getClientState();
        if(cpu){await this.browser.command("Profiler.enable");await this.browser.command("Profiler.start");}
        const began=Date.now();
        let profile;
        try{await sleep(durationMs);}
        finally{if(cpu)profile=await this.browser.command("Profiler.stop");}
        const after=await this.getClientState();
        const seconds=(Date.now()-began)/1000;
        const result={durationSeconds:Math.round(seconds*100)/100,
            startState:before.gameState,endState:after.gameState,
            gameCyclesPerSecond:Math.round(10*(after.gameCycle-before.gameCycle)/seconds)/10,
            presentedFramesPerSecond:Math.round(10*(after.presentedFrames-before.presentedFrames)/seconds)/10,
            originalReportedFps:after.originalFps,callbackError:after.callbackError};
        if(cpu){
            const names=new Map((profile?.profile?.nodes||[]).map(n=>[n.id,n.callFrame?.functionName]));
            const counts=new Map();
            for(const id of profile?.profile?.samples||[]){
                const name=names.get(id)||"(anonymous)";
                if(!/^(?:[A-Za-z_$][\w$]{0,60}|\((?:idle|program|garbage collector|anonymous)\))$/.test(name))continue;
                counts.set(name,(counts.get(name)||0)+1);
            }
            result.cpuSampleCounts=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,12)
                .map(([functionName,samples])=>({functionName,samples}));
        }
        return result;
    }
    async runSmokeTest({durationMs=3000}={}){
        boundedInt(durationMs,1000,15000,"durationMs");
        const begin=await this.getClientState();
        await sleep(durationMs);
        const end=await this.getClientState();
        const checks={
            originalWorld:begin.gameState==="LOGGED_IN"&&end.gameState==="LOGGED_IN",
            originalClientThread:end.clientThread,
            gameCyclesAdvance:end.gameCycle>begin.gameCycle,
            originalFramesAdvance:end.presentedFrames>begin.presentedFrames,
            noCallbackError:!end.callbackError&&!end.hasError
        };
        return {passed:Object.values(checks).every(Boolean),checks,
            startCycle:begin.gameCycle,endCycle:end.gameCycle,
            startFrames:begin.presentedFrames,endFrames:end.presentedFrames,
            note:"Passive original-engine runtime checks only; movement requires a separate click and observation"};
    }
}
