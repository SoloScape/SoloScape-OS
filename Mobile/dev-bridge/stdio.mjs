#!/usr/bin/env node
// Dedicated local stdio entrypoint for an MCP-capable development host.
// Stdout is JSON-RPC only. Progress and failures go to stderr.
import readline from "node:readline";
import {OwnedChrome} from "./chrome.mjs";
import {Stage1Bridge} from "./bridge.mjs";
import {createMcpHandler} from "./mcp.mjs";

const bridge=new Stage1Bridge(new OwnedChrome({
    port:Number(process.env.SOLOSCAPE_ENGINE_SMOKE_PORT??3097),
    // Headless is test-only; normal MCP launches a visible window for manual login.
    headless:process.env.SOLOSCAPE_MCP_TEST_HEADLESS==="1"
}));
const handler=createMcpHandler(bridge);
let tail=Promise.resolve(),closing=false;
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
function send(message){if(message)process.stdout.write(JSON.stringify(message)+"\n");}
lines.on("line",line=>{
    if(line.length>1024*1024){
        send({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Message too large"}});
        return;
    }
    tail=tail.then(async()=>{
        let message;
        try{message=JSON.parse(line);}
        catch{send({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}});return;}
        try{send(await handler(message));}
        catch{send({jsonrpc:"2.0",id:message?.id??null,error:{code:-32603,message:"Internal error"}});}
    }).catch(error=>{
        console.error("Stage 1 bridge request failed:",error?.name||"Error");
    });
});
async function shutdown(){
    if(closing)return;closing=true;
    lines.close();
    await tail.catch(()=>{});
    await bridge.browserClose();
}
process.stdin.on("end",()=>{shutdown().then(()=>process.exit(0)).catch(()=>process.exit(1));});
for(const signal of ["SIGINT","SIGTERM"])
    process.once(signal,()=>{shutdown().then(()=>process.exit(0)).catch(()=>process.exit(1));});
