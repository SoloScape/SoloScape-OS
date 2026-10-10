// Opt-in real-Chrome smoke for the Stage 1 MCP bridge. No account or login.
import assert from "node:assert/strict";
import {Stage1Bridge} from "./bridge.mjs";
import {OwnedChrome} from "./chrome.mjs";

const bridge=new Stage1Bridge(new OwnedChrome({
    port:Number(process.env.SOLOSCAPE_ENGINE_SMOKE_PORT??3097),
    headless:true
}));
let success=false;
try{
    await bridge.browserStart();
    let first;
    for(let i=0;i<35;i++){
        try{first=await bridge.getClientState();break;}
        catch{await new Promise(resolve=>setTimeout(resolve,200));}
    }
    assert.ok(first,"Original engine telemetry must become available");
    assert.notEqual(first.phase,"error","Automatic original-engine startup must not fail");
    await assert.rejects(()=>bridge.captureScreen(),/LOGGED_IN/);
    await assert.rejects(()=>bridge.clickCanvas({x:100,y:200}),/LOGGED_IN/);
    await bridge.initializeEngine(); // idempotent when the page already auto-started
    const title=await bridge.waitForState({gameState:"LOGIN_SCREEN",timeoutMs:60000});
    assert.equal(title.reached,true,"Original revision-240 title must initialize");
    assert.equal(title.callbackError,"");
    assert.equal(title.clientThread,true);
    assert.ok(title.gameCycle>=0);
    console.log("PASS: owned local Chrome, original OpenOSRS title, sanitized state, blocked pre-login screenshots and input.");
    console.log(JSON.stringify({gameState:title.gameState,gameCycle:title.gameCycle,originalFps:title.originalFps}));
    success=true;
}catch(error){
    console.error("FAIL: Stage 1 live Chrome smoke:",error?.message||"unknown error");
    process.exitCode=1;
}finally{
    await bridge.browserClose();
    if(success)console.log("PASS: bridge-owned Chrome session closed.");
}
