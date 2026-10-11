import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {DesktopController,actionArguments,fixedBuildTasks,writePng} from "../dev-bridge/controller-actions.mjs";
import {createControllerService,readSession,sendControllerRequest,descriptorValid} from "../dev-bridge/controller-service.mjs";
import {parseCommand} from "../dev-bridge/controller-cli.mjs";

const validPng="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJ+W1xQAAAAASUVORK5CYII=";
class FakeBridge {
    constructor(){this.open=false;this.frames=2;this.calls=[];}
    browserStatus(){return {connected:this.open,url:this.open?"http://127.0.0.1:3097/":null};}
    async browserStart(){this.open=true;this.calls.push("start");return {status:"opened"};}
    async browserClose(){this.open=false;this.calls.push("close");return {status:"stopped"};}
    async getClientState(){return {gameState:"LOGGED_IN",gameCycle:200,originalFps:22,
        presentedFps:21.5,cyclesPerSecond:50,presentedFrames:this.frames++};}
    async initializeEngine(){return {started:true};}
    async waitForState(args){return {reached:true,...args};}
    async getDiagnostics(){return {gameState:"LOGGED_IN",callbackError:""};}
    async getSceneCounts(){return {tiles:20,walls:5,decorations:0,ground:1,gameObjectReferences:2,regions:1};}
    async captureScreen(){if(!this.open)throw new Error("Gameplay actions require LOGGED_IN");
        return {mimeType:"image/png",data:validPng};}
    async clickCanvas(args){return {sent:true,...args};}
    async pressKey(args){return {sent:true,...args};}
    async runSmokeTest(){return {passed:true,originalWorld:true};}
    async profilePerformance(){return {presentedFramesPerSecond:21.5,gameCyclesPerSecond:50};}
}
test("Stage 2 allows only fixed safe commands and bounded input arguments",()=>{
    assert.deepEqual(parseCommand(["profile","3000","--cpu"]),{
        action:"profile",args:{durationMs:3000,cpu:true}});
    assert.deepEqual(parseCommand(["click","400","250","right"]),{
        action:"click",args:{x:400,y:250,button:"right"}});
    assert.deepEqual(parseCommand(["rebuild-and-test"]),{action:"rebuild-and-test",args:{}});
    assert.deepEqual(parseCommand(["scene"]),{action:"scene",args:{}});
    assert.throws(()=>parseCommand(["eval","alert(1)"]),/Unknown command/);
    assert.throws(()=>actionArguments("status",{password:"secret"}),/Unexpected/);
    assert.throws(()=>actionArguments("click",{x:-1,y:2}),/Invalid/);
    assert.throws(()=>actionArguments("click",{x:300,y:200,button:"middle"}),/Invalid/);
    assert.throws(()=>actionArguments("wait",{gameState:"LOGIN_PASSWORD"}),/Invalid/);
    assert.throws(()=>actionArguments("profile",{durationMs:Infinity}),/Invalid/);
    assert.equal(fixedBuildTasks().length,3);
    for(const step of fixedBuildTasks()){
        assert.equal(step.bin,process.execPath);
        assert.ok(!step.args.join(" ").includes("server"));
    }
});
test("Stage 2 runs passive checks and rebuilds fixed original engine, resetting owned Chrome first",async()=>{
    const bridge=new FakeBridge();await bridge.browserStart();
    const tasks=[];
    const controller=new DesktopController(bridge,{runTask:async task=>{
        tasks.push(task.name);return {name:task.name,passed:true};
    }});
    assert.equal((await controller.dispatch("status")).client.gameState,"LOGGED_IN");
    assert.equal((await controller.dispatch("profile",{durationMs:500})).gameCyclesPerSecond,50);
    assert.equal((await controller.dispatch("smoke-test")).passed,true);
    const result=await controller.dispatch("rebuild-and-test");
    assert.equal(result.passed,true);
    assert.deepEqual(tasks,["build","verify-engine","bridge-tests"]);
    assert.deepEqual(bridge.calls,["start","close"]);
    assert.equal(bridge.open,false);
});
test("Desktop controller serializes slow profiling and rejects overlapping mutation",async()=>{
    const bridge=new FakeBridge();
    let release;
    bridge.profilePerformance=()=>new Promise(resolve=>{release=()=>resolve({ok:true});});
    const controller=new DesktopController(bridge);
    const pending=controller.dispatch("profile",{durationMs:500});
    assert.equal(controller.busy,true);
    await assert.rejects(()=>controller.dispatch("click",{x:220,y:180}),/busy/);
    release();await pending;
    assert.equal(controller.busy,false);
});
test("Stage 2 halts rebuild-and-test after failing a fixed build check",async()=>{
    const controller=new DesktopController(new FakeBridge(),{runTask:async task=>({
        name:task.name,passed:false,exitCode:1
    })});
    const result=await controller.dispatch("rebuild-and-test");
    assert.equal(result.passed,false);
    assert.equal(result.steps.length,1);
});
test("Screenshots require a real PNG signature; never accept arbitrary encoded bytes",async()=>{
    await assert.rejects(()=>writePng({mimeType:"image/png",data:Buffer.from("not png").toString("base64")}),/Invalid PNG/);
    await assert.rejects(()=>writePng({mimeType:"image/jpeg",data:validPng}),/Invalid game/);
});
test("private named-pipe controller persists between separate client connections",async()=>{
    const dir=await mkdtemp(join(tmpdir(),"soloscape-controller-test-"));
    const path=join(dir,"session.json");
    const bridge=new FakeBridge();
    const controller=new DesktopController(bridge,{writeCapture:async png=>({
        mimeType:png.mimeType,saved:true,path:"[test-only-capture]"
    })});
    let service;
    try{
        service=await createControllerService({path,bridge,controller});
        const desc=await readSession(path);
        assert.ok(descriptorValid(desc));
        assert.equal(service.descriptor.token,"[private]");
        const sessionData=await readFile(path,"utf8");
        assert.ok(!sessionData.includes("password"));
        assert.deepEqual((await sendControllerRequest("status",{}, {path})).gameState,"NOT_STARTED");
        const started=await sendControllerRequest("start",{}, {path});
        assert.equal(started.status,"opened");
        const current=await sendControllerRequest("status",{}, {path});
        assert.equal(current.client.gameState,"LOGGED_IN");
        assert.equal((await sendControllerRequest("screenshot",{}, {path})).saved,true);
        assert.equal((await sendControllerRequest("diagnostics",{}, {path})).callbackError,"");
        assert.equal((await sendControllerRequest("click",{x:200,y:250}, {path})).sent,true);
        assert.equal((await sendControllerRequest("smoke-test",{durationMs:1000}, {path})).passed,true);
        await assert.rejects(()=>sendControllerRequest("status",{password:"bad"}, {path}),/Unexpected/);
        await assert.rejects(()=>createControllerService({path,bridge:new FakeBridge()}),/already running/);
        // A truly separate Node process can talk to the original open session.
        const child=spawn(process.execPath,["-e",
            "import('./dev-bridge/controller-service.mjs').then(async m=>{" +
            "const r=await m.sendControllerRequest('status',{}, {path:process.env.SOLOSCAPE_TEST_PATH});" +
            "console.log(JSON.stringify({open:r.browser.connected,state:r.client.gameState}));})"],
        {cwd:new URL("..",import.meta.url),env:{...process.env,SOLOSCAPE_TEST_PATH:path},
            stdio:["ignore","pipe","pipe"],windowsHide:true});
        let output="";child.stdout.on("data",part=>output+=part);
        const [code]=await once(child,"exit");
        assert.equal(code,0);
        assert.deepEqual(JSON.parse(output),{open:true,state:"LOGGED_IN"});
    }finally{
        if(service)await service.close();
        await rm(dir,{recursive:true,force:true});
    }
});
