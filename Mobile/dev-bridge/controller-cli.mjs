#!/usr/bin/env node
// Commands are safe to invoke separately using Desktop Commander.
import {createControllerService,sendControllerRequest} from "./controller-service.mjs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

export const usage=`SoloScape original-engine Desktop Commander controller:
  node dev-bridge/controller-cli.mjs serve
  node dev-bridge/controller-cli.mjs status
  node dev-bridge/controller-cli.mjs start
  node dev-bridge/controller-cli.mjs initialize
  node dev-bridge/controller-cli.mjs wait LOGIN_SCREEN [timeoutMs]
  node dev-bridge/controller-cli.mjs wait LOGGED_IN [timeoutMs]
  node dev-bridge/controller-cli.mjs screenshot
  node dev-bridge/controller-cli.mjs click <x> <y> [left|right]
  node dev-bridge/controller-cli.mjs key <Escape|F1|a|0...>
  node dev-bridge/controller-cli.mjs smoke-test [durationMs]
  node dev-bridge/controller-cli.mjs profile [durationMs] [--cpu]
  node dev-bridge/controller-cli.mjs diagnostics
  node dev-bridge/controller-cli.mjs scene
  node dev-bridge/controller-cli.mjs heap
  node dev-bridge/controller-cli.mjs rebuild-and-test
  node dev-bridge/controller-cli.mjs shutdown
No passwords, arbitrary JavaScript, external ports, or custom gameplay renderer.`;
export function parseCommand(argv){
    const [action,...params]=argv;
    if(!action||action==="help"||action==="--help")return {action:"help"};
    const numeric=value=>{const n=Number(value);if(!Number.isInteger(n))throw new Error("Expected integer");return n;};
    switch(action){
        case "serve":
        case "status":
        case "start":
        case "initialize":
        case "diagnostics":
        case "scene":
        case "heap":
        case "screenshot":
        case "rebuild-and-test":
        case "shutdown":
            if(params.length)throw new Error("Unexpected arguments");
            return {action,args:{}};
        case "wait":
            if(params.length<1||params.length>2)throw new Error("Usage: wait <gameState> [timeoutMs]");
            return {action,args:{gameState:params[0],
                ...(params.length===2?{timeoutMs:numeric(params[1])}:{})}};
        case "click":
            if(params.length<2||params.length>3)throw new Error("Usage: click <x> <y> [left|right]");
            return {action,args:{x:numeric(params[0]),y:numeric(params[1]),
                button:params[2]||"left"}};
        case "key":
            if(params.length!==1)throw new Error("Usage: key <key>");
            return {action,args:{key:params[0]}};
        case "smoke-test":
            if(params.length>1)throw new Error("Usage: smoke-test [durationMs]");
            return {action,args:params.length?{durationMs:numeric(params[0])}:{}};
        case "profile":
            if(params.length>2||params.some((v,i)=>v==="--cpu"&&i!==params.length-1))
                throw new Error("Usage: profile [durationMs] [--cpu]");
            const cpu=params.at(-1)==="--cpu";
            const vals=cpu?params.slice(0,-1):params;
            if(vals.length>1)throw new Error("Usage: profile [durationMs] [--cpu]");
            return {action,args:{...(vals.length?{durationMs:numeric(vals[0])}:{}),cpu}};
        default:throw new Error("Unknown command");
    }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
    try{
        const {action,args}=parseCommand(process.argv.slice(2));
        if(action==="help")console.log(usage);
        else if(action==="serve"){
            const controller=await createControllerService();
            console.log("[READY] SoloScape Stage 2 local controller is running.");
            console.log("[READY] Private named pipe session. Use controller-cli.mjs commands through Desktop Commander.");
            console.log("[INFO] Manual disposable-account login is required for world input and screenshots.");
            const stop=async()=>{await controller.close();process.exit(0);};
            process.once("SIGINT",()=>{stop().catch(()=>process.exit(1));});
            process.once("SIGTERM",()=>{stop().catch(()=>process.exit(1));});
        }else{
            const response=await sendControllerRequest(action,args,{
                timeoutMs:action==="rebuild-and-test"?380000:
                    ["profile","smoke-test","wait"].includes(action)?75000:15000
            });
            console.log(JSON.stringify(response,null,2));
            if(action==="rebuild-and-test"&&response.passed===false)process.exitCode=1;
            if(action==="smoke-test"&&response.passed===false)process.exitCode=1;
        }
    }catch(error){
        console.error("[ERROR] "+String(error.message||"Controller unavailable").slice(0,240));
        process.exitCode=1;
    }
}
