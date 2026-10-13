import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {Stage1Bridge,sanitizeError,sanitizeTrace} from "../dev-bridge/bridge.mjs";
import {originalDiagnosticUrl} from "../dev-bridge/chrome.mjs";
import {createMcpHandler,tools} from "../dev-bridge/mcp.mjs";

const loggedIn={
    phase:"initialized",step:"initialized",gameState:"LOGGED_IN",
    cycles:[123,150],originalFps:21,presentedFrames:83,
    presentedFps:21.5,cycleRate:50,clientThread:true,frameChanged:true,
    callbackError:"",callbackTrace:"",clockStats:{calls:82,ticks:105,
        lastTicks:1,maxTicks:5,gapMs:20,waitMs:12},error:""
};
class FakeChrome{
    constructor(state=loggedIn){this.state=state;this.active=true;this.url=originalDiagnosticUrl();
        this.calls=[];this.imageData=Buffer.from("test image bytes").toString("base64");}
    async start(){this.active=true;return {status:"opened"};}
    async stop(){this.active=false;return {status:"stopped"};}
    async evaluate(expression){
        this.calls.push({type:"eval",expression});
        if(expression.includes("window.engineSmokeState"))
            return JSON.stringify({...this.state,gameCycle:this.state.cycles.at(-1),
                hasError:!!this.state.error});
        if(expression.includes("window.engineSmokeSceneCounts"))
            return JSON.stringify({tiles:41230,walls:180,decorations:14,ground:8,
                gameObjectReferences:202,regions:12,
                nullWallRenderables:0,nullDecorRenderables:1,nullGroundRenderables:0,
                nullGameRenderables:12,modelGameRenderables:160,zeroFaceGameModels:2,
                totalGameModelFaces:4800,gameObjectRefsByPlane:[50,50,50,52],
                castleTiles:[300,100,60,5],castleWalls:[10,5,3,0],
                castleDecorations:[3,3,0,0],castleGround:[6,2,0,0],
                castleGameReferences:[9,10,7,0],castleModels:[8,8,6,0],
                castleEmptyModels:[1,1,0,0],castleAnchorGameRefs:[1,1,1,2,1],
                castleAnchorModelFaces:[40,25,25,50,25],
                castleDefinitionPresent:[1,1,1,1,1,1,1,1],
                castleDefinitionModelCount:[1,1,1,1,1,1,1,5],
                castleDefinitionTypedModelCount:[0,0,0,0,0,0,0,5],
                castleDefinitionModelReady:[1,0,0,1,1,1,1,1],
                castleRawDefinitionBytes:[73,78,70,78,19,23,46,39],
                castleFreshModelCounts:[1,1,1,1,1,1,1,5]});
        if(expression.includes("getBoundingClientRect"))
            return JSON.stringify({left:20,top:40,width:765,height:503,canvasWidth:765,canvasHeight:503});
        if(expression.includes("toDataURL('image/png')"))
            return this.imageData.padEnd(64,"A");
        if(expression.includes("b.click()"))return true;
        throw new Error("Unexpected diagnostic evaluation");
    }
    async command(method,params){
        this.calls.push({type:method,params});
        return {};
    }
}
test("Stage 1 is strictly loopback-only, with no arbitrary browser attach port",()=>{
    assert.equal(originalDiagnosticUrl(3097),"http://127.0.0.1:3097/");
    assert.throws(()=>originalDiagnosticUrl(-1),/port/);
    assert.ok(!tools.some(t=>/eval|javascript|read_file|packet|credential/i.test(t.name)));
    for(const tool of tools)assert.equal(tool.inputSchema.additionalProperties,false);
});
test("engine error messages are whitelisted, never raw credentials or network payloads",()=>{
    const privateText="testuser@example.com superSensitivePassword123 https://evil.invalid/secrets";
    assert.equal(sanitizeError(privateText),"Original client error recorded (unrecognised details withheld)");
    assert.equal(sanitizeError("unknown: java.lang.RuntimeException: (JavaScript) TypeError: Cannot read properties of null (reading 'bsX')"),
        "java.lang.RuntimeException; TypeError; null property: bsX");
    assert.equal(sanitizeTrace("ED:66:432 | testuser@example.com | J4:67:158"),
        "ED:66:432 | J4:67:158");
});
test("read-only sanitized original-game telemetry excludes login and cache secrets",async()=>{
    const browser=new FakeChrome({...loggedIn,
        resizable:true,callbackError:"user@example.com password123 java.lang.RuntimeException",
        callbackTrace:"ED:66:432 | username:password | J4:67:158",
        socketAttempts:[{payload:"SECRET"}],resourceLookups:["SECRET"],events:["SECRET"],
        filePaths:["C:\\private\\password.txt"]});
    const bridge=new Stage1Bridge(browser);
    const result=await bridge.getClientState();
    assert.equal(result.gameState,"LOGGED_IN");
    assert.equal(result.resizable,true);
    assert.equal(result.gameCycle,150);
    assert.equal(result.originalFps,21);
    assert.equal(result.pageVisibility,"UNAVAILABLE");
    assert.equal(result.pageFocused,false);
    assert.equal(result.presentedFps,21.5);
    assert.equal(result.callbackError,"java.lang.RuntimeException");
    assert.equal(result.callbackFrames,"ED:66:432 | J4:67:158");
    assert.doesNotMatch(JSON.stringify(result),/SECRET|password123|example\.com|private/);
});
test("scene counters are read-only, validated, and unavailable before original login",async()=>{
    const browser=new FakeChrome(),bridge=new Stage1Bridge(browser);
    const counts=await bridge.getSceneCounts();
    assert.deepEqual([counts.tiles,counts.walls,counts.gameObjectReferences,counts.regions],
        [41230,180,202,12]);
    assert.equal(counts.nullGameRenderables,12);
    assert.equal(counts.zeroFaceGameModels,2);
    assert.deepEqual(counts.castleGameReferences,[9,10,7,0]);
    assert.deepEqual(counts.castleAnchorGameRefs,[1,1,1,2,1]);
    assert.deepEqual(counts.castleDefinitionModelReady,[1,0,0,1,1,1,1,1]);
    assert.equal(counts.castleDefinitionTypedModelCount[7],5);
    assert.equal(counts.castleRawDefinitionBytes[0],73);
    assert.equal(counts.castleFreshModelCounts[0],1);
    assert.equal(counts.gameObjectRefsByPlane.reduce((a,b)=>a+b,0),counts.gameObjectReferences);
    assert.ok(!browser.calls.some(x=>x.type.startsWith("Input.")));
    const before=new Stage1Bridge(new FakeChrome({...loggedIn,gameState:"LOGIN_SCREEN"}));
    await assert.rejects(()=>before.getSceneCounts(),/LOGGED_IN/);
});

test("automatic browser initialization leaves the game untouched when called through old MCP command",async()=>{
    const browser=new FakeChrome({...loggedIn,phase:"loading"});
    const bridge=new Stage1Bridge(browser);
    const info=await bridge.initializeEngine();
    assert.equal(info.automatic,true);
    assert.equal(info.started,true);
    assert.ok(!browser.calls.some(call=>call.expression?.includes("b.click()")));
    const pending=new Stage1Bridge(new FakeChrome({...loggedIn,phase:"not-started"}));
    const result=await pending.initializeEngine();
    assert.equal(result.automatic,true);
    assert.equal(result.started,false);
});

test("screenshots, clicks and keyboard input are blocked until healthy LOGGED_IN",async()=>{
    const browser=new FakeChrome({...loggedIn,gameState:"LOGIN_SCREEN"});
    const bridge=new Stage1Bridge(browser);
    await assert.rejects(()=>bridge.captureScreen(),/LOGGED_IN/);
    await assert.rejects(()=>bridge.clickCanvas({x:500,y:300}),/LOGGED_IN/);
    await assert.rejects(()=>bridge.pressKey({key:"A"}),/LOGGED_IN/);
    assert.ok(!browser.calls.some(x=>x.type==="Page.captureScreenshot"||x.type.startsWith("Input.")));
});
test("owned screenshot captures ONLY the original canvas pixels, never a page screenshot",async()=>{
    const browser=new FakeChrome(),bridge=new Stage1Bridge(browser);
    const output=await bridge.captureScreen();
    assert.equal(output.mimeType,"image/png");
    assert.ok(output.data);
    assert.ok(browser.calls.some(x=>x.type==="eval"&&x.expression.includes("toDataURL('image/png')")));
    assert.ok(!browser.calls.some(x=>x.type==="Page.captureScreenshot"));
});
test("original gameplay clicks use scaled native canvas coordinates and bounded mouse events",async()=>{
    const browser=new FakeChrome(),bridge=new Stage1Bridge(browser);
    await assert.rejects(()=>bridge.clickCanvas({x:-1,y:200}),/x must/);
    await assert.rejects(()=>bridge.clickCanvas({x:765,y:200}),/x must/);
    const output=await bridge.clickCanvas({x:400,y:250});
    assert.equal(output.sent,true);
    const input=browser.calls.filter(c=>c.type==="Input.dispatchMouseEvent");
    assert.deepEqual(input.map(c=>c.params.type),["mouseMoved","mousePressed","mouseReleased"]);
    assert.equal(input[1].params.button,"left");
    assert.equal(input[1].params.x,420.5);
    assert.equal(input[1].params.y,290.5);
});
test("keyboard tool allows one safe key only after login; never arbitrary password text",async()=>{
    const browser=new FakeChrome(),bridge=new Stage1Bridge(browser);
    await assert.rejects(()=>bridge.pressKey({key:"password123"}),/not allowed/);
    await assert.rejects(()=>bridge.pressKey({key:"https://evil.test"}),/not allowed/);
    assert.equal((await bridge.pressKey({key:"Escape"})).sent,true);
    const events=browser.calls.filter(x=>x.type==="Input.dispatchKeyEvent");
    assert.deepEqual(events.map(e=>e.params.type),["keyDown","keyUp"]);
});
test("MCP handshake lists tools and tools/call enforces scoped arguments",async()=>{
    const browser=new FakeChrome(),handler=createMcpHandler(new Stage1Bridge(browser));
    const init=await handler({jsonrpc:"2.0",id:1,method:"initialize",
        params:{protocolVersion:"2025-03-26"}});
    assert.equal(init.result.serverInfo.name,"soloscape-original-engine-stage1");
    const list=await handler({jsonrpc:"2.0",id:2,method:"tools/list"});
    assert.ok(list.result.tools.some(tool=>tool.name==="get_client_state"));
    assert.ok(list.result.tools.some(tool=>tool.name==="run_smoke_test"));
    const got=await handler({jsonrpc:"2.0",id:3,method:"tools/call",
        params:{name:"get_client_state",arguments:{}}});
    assert.equal(JSON.parse(got.result.content[0].text).gameState,"LOGGED_IN");
    const invalid=await handler({jsonrpc:"2.0",id:4,method:"tools/call",
        params:{name:"get_client_state",arguments:{script:"steal secrets"}}});
    assert.equal(invalid.error.code,-32602);
    const image=await handler({jsonrpc:"2.0",id:5,method:"tools/call",
        params:{name:"capture_screen",arguments:{}}});
    assert.equal(image.result.content[0].type,"image");
    assert.equal(await handler({jsonrpc:"2.0",method:"notifications/initialized"}),null);
});
test("stdio transport speaks newline-delimited JSON-RPC with stdout reserved for protocol",async()=>{
    const processChild=spawn(process.execPath,["dev-bridge/stdio.mjs"],{
        cwd:new URL("..",import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:\/)/,""),
        stdio:["pipe","pipe","pipe"],windowsHide:true});
    try{
        let received="";
        const responses=[];
        processChild.stdout.on("data",chunk=>{
            received+=String(chunk);
            for(let index=received.indexOf("\n");index>=0;index=received.indexOf("\n")){
                responses.push(JSON.parse(received.slice(0,index)));
                received=received.slice(index+1);
            }
        });
        processChild.stdin.write(JSON.stringify({jsonrpc:"2.0",id:7,method:"initialize"})+"\n");
        processChild.stdin.write(JSON.stringify({jsonrpc:"2.0",id:8,method:"tools/list"})+"\n");
        processChild.stdin.write(JSON.stringify({jsonrpc:"2.0",id:9,method:"tools/call",
            params:{name:"browser_status",arguments:{}}})+"\n");
        const deadline=Date.now()+5000;
        while(responses.length<3&&Date.now()<deadline)
            await new Promise(resolve=>setTimeout(resolve,25));
        assert.equal(responses.length,3);
        assert.equal(responses[0].id,7);
        assert.equal(responses[1].result.tools.length,tools.length);
        assert.equal(JSON.parse(responses[2].result.content[0].text).connected,false);
    }finally{
        processChild.stdin.end();
        await Promise.race([once(processChild,"exit"),new Promise(r=>setTimeout(r,2500))]);
        if(processChild.exitCode===null)processChild.kill();
    }
});
