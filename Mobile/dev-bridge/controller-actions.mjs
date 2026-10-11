// Desktop Commander Stage 2: persistent local commands reusing the audited
// original-engine Stage 1 browser bridge. No gameplay reimplementation.
import {spawn} from "node:child_process";
import {randomBytes} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

export const mobileRoot=resolve(fileURLToPath(new URL("../",import.meta.url)));
const artifacts=join(mobileRoot,"teavm-poc","target","engine","controller-captures");
const wait=ms=>new Promise(r=>setTimeout(r,ms));

export function actionArguments(action,args={}){
    if(!args||typeof args!=="object"||Array.isArray(args))throw new Error("Invalid arguments");
    const rules={
        status:[],start:[],initialize:[],diagnostics:[],screenshot:[],heap:[],scene:[],
        "smoke-test":["durationMs"],profile:["durationMs","cpu"],
        wait:["gameState","timeoutMs"],click:["x","y","button"],
        key:["key"],"rebuild-and-test":[],shutdown:[]
    };
    if(!Object.hasOwn(rules,action))throw new Error("Unknown controller command");
    if(Object.keys(args).some(k=>!rules[action].includes(k)))
        throw new Error("Unexpected controller argument");
    for(const field of ["durationMs","timeoutMs","x","y"]){
        if(args[field]!==undefined&&(!Number.isInteger(args[field])||
            args[field]<0||args[field]>60000))throw new Error("Invalid "+field);
    }
    if(args.cpu!==undefined&&typeof args.cpu!=="boolean")throw new Error("Invalid cpu flag");
    if(args.button!==undefined&&!["left","right"].includes(args.button))throw new Error("Invalid button");
    if(args.gameState!==undefined&&!["LOGGED_IN","LOGIN_SCREEN","STARTING",
        "LOADING","CONNECTION_LOST","UNAVAILABLE"].includes(args.gameState))
        throw new Error("Invalid gameState");
    if(args.key!==undefined&&!(typeof args.key==="string"&&
        args.key.length>=1&&args.key.length<=12))throw new Error("Invalid key");
    return args;
}
const tasks=[
    {name:"build",bin:process.execPath,args:["scripts/build-openosrs-engine.mjs"],timeoutMs:300000},
    {name:"verify-engine",bin:process.execPath,args:["teavm-poc/scripts/verify-engine-module.mjs"],timeoutMs:30000},
    {name:"bridge-tests",bin:process.execPath,args:["--test","tests/dev-bridge.test.mjs"],timeoutMs:30000}
];
export function fixedBuildTasks(){return tasks.map(t=>({...t,args:[...t.args]}));}
export async function runFixedTask(task,{run}={}){
    if(run)return run(task);
    return await new Promise(resolve=>{
        const child=spawn(task.bin,task.args,{cwd:mobileRoot,windowsHide:true,
            env:process.env,stdio:["ignore","pipe","pipe"]});
        let last="",terminated=false;
        const append=chunk=>{last=(last+String(chunk)).slice(-12000);};
        child.stdout.on("data",append);
        child.stderr.on("data",append);
        const timer=setTimeout(()=>{terminated=true;child.kill();},task.timeoutMs);
        child.on("error",()=>{clearTimeout(timer);resolve({name:task.name,passed:false,error:"Process could not start"});});
        child.on("close",code=>{
            clearTimeout(timer);
            const lines=last.split(/\r?\n/).filter(line=>
                /^(?:PASS:|FAIL:|ℹ (?:tests|pass|fail|skipped)|\s*"status":|\s*"failures":|\s*"exitCode":)/.test(line));
            resolve({name:task.name,passed:code===0&&!terminated,exitCode:code,
                timedOut:terminated,summary:lines.slice(-12).map(s=>s.slice(0,140))});
        });
    });
}
export class DesktopController {
    constructor(bridge,{runTask=runFixedTask,writeCapture=writePng}={}){
        this.bridge=bridge;this.runTask=runTask;this.writeCapture=writeCapture;
        this.busy=false;
    }
    async dispatch(action,raw={}){
        const args=actionArguments(action,raw);
        if(this.busy)throw new Error("Controller busy; wait for the current action");
        this.busy=true;
        try{
            switch(action){
                case "status":{
                    const browser=this.bridge.browserStatus();
                    if(!browser.connected)return {browser,gameState:"NOT_STARTED"};
                    return {browser,client:await this.bridge.getClientState()};
                }
                case "start":return await this.bridge.browserStart();
                case "initialize":return await this.bridge.initializeEngine();
                case "wait":return await this.bridge.waitForState(args);
                case "diagnostics":return await this.bridge.getDiagnostics();
                case "scene":return await this.bridge.getSceneCounts();
                case "heap":{
                    // Read-only Chrome heap telemetry for the bridge-owned tab.
                    await this.bridge.requireWorld();
                    const usage=await this.bridge.browser.command("Runtime.getHeapUsage");
                    const n=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
                    return {usedBytes:n(usage?.usedSize),totalBytes:n(usage?.totalSize),
                        note:"JavaScript heap only; not full browser process resident memory"};
                }
                case "screenshot":{
                    const png=await this.bridge.captureScreen();
                    return await this.writeCapture(png);
                }
                case "click":return await this.bridge.clickCanvas(args);
                case "key":return await this.bridge.pressKey(args);
                case "smoke-test":return await this.bridge.runSmokeTest(args);
                case "profile":return await this.bridge.profilePerformance(args);
                case "rebuild-and-test":{
                    // An engine JS rebuild invalidates the owned browser's loaded code.
                    const wasOpen=this.bridge.browserStatus().connected;
                    if(wasOpen)await this.bridge.browserClose();
                    const steps=[];
                    for(const task of fixedBuildTasks()){
                        const result=await this.runTask(task);
                        steps.push(result);
                        if(!result.passed)break;
                    }
                    return {passed:steps.length===tasks.length&&steps.every(s=>s.passed),
                        steps,originalBrowserClosed:wasOpen,
                        note:"Reopen and manually log in to the original engine after a rebuild."};
                }
                case "shutdown":return await this.bridge.browserClose();
            }
        }finally{this.busy=false;}
    }
}
export async function writePng({mimeType,data}){
    if(mimeType!=="image/png"||typeof data!=="string"||data.length>8*1024*1024||
        !/^[A-Za-z0-9+/=]+$/.test(data))throw new Error("Invalid game screenshot");
    const bytes=Buffer.from(data,"base64");
    if(bytes.length>6*1024*1024||bytes.length<32||
        !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
        throw new Error("Invalid PNG screenshot bytes");
    await mkdir(artifacts,{recursive:true});
    const path=join(artifacts,"world-"+Date.now()+"-"+randomBytes(4).toString("hex")+".png");
    await writeFile(path,bytes,{flag:"wx",mode:0o600});
    return {saved:true,path,note:"Captured only the logged-in original game canvas; private local ignored artifact."};
}
