import test from "node:test";
import assert from "node:assert/strict";
import {summarizeAuthenticated,runPhase2} from "../dev-bridge/verify-gameplay.mjs";
import {DesktopController} from "../dev-bridge/controller-actions.mjs";
import {parseCommand} from "../dev-bridge/controller-cli.mjs";

const row=(elapsedMs,state="LOGGED_IN",cycle=1000+elapsedMs/20,frames=300+elapsedMs/50,heapUsedMB=70)=>({
    elapsedMs,state,cycle,frames,fps:24,cycleRate:50,originalFps:24,
    clientThread:true,frameChanged:true,error:false,heapUsedMB
});
test("Phase 2 analyzer distinguishes real runtime observation from gameplay feature proof",()=>{
    const rows=[row(0),row(600000),row(1195000)];
    const result=summarizeAuthenticated(rows,1200000,"2026-10-10T01:45:00.000Z");
    assert.equal(result.status,"PASS_RUNTIME_ONLY");
    assert.equal(result.sampleCount,3);
    assert.equal(result.medianCyclesPerSecond,50);
    assert.equal(result.jsHeapGrowthMB,0);
    assert.equal(result.verifiedGameplaySystems.length,0);
    assert.ok(result.unverifiedGameplaySystems.includes("banking"));
    assert.ok(result.unverifiedGameplaySystems.includes("disconnect/reconnect"));
});
test("Phase 2 analyzer catches callback errors and disconnected world state",()=>{
    const rows=[row(0),row(400000),{...row(1000000,"LOGIN_SCREEN"),error:true},
        row(1195000)];
    const result=summarizeAuthenticated(rows,1200000,"2026-10-10T01:45:00.000Z");
    assert.equal(result.status,"FAILED_OR_INCOMPLETE");
    assert.equal(result.loggedOutSamples,1);
    assert.equal(result.fatalSamples,1);
});
test("Phase 2 analyzer detects genuine game-cycle stalls",()=>{
    const rows=[row(0),row(10000,"LOGGED_IN",1000,300),row(1195000)];
    const result=summarizeAuthenticated(rows,1200000,"2026-10-10T01:45:00.000Z");
    assert.equal(result.status,"FAILED_OR_INCOMPLETE");
    assert.ok(result.stalls.length>=1);
});
test("Phase 2 flags renderer starvation even when the Java simulation still advances",()=>{
    const samples=[row(0),row(10000,"LOGGED_IN",1500,300),row(1195000)];
    const result=summarizeAuthenticated(samples,1200000,"2026-10-10T01:45:00.000Z");
    assert.equal(result.status,"FAILED_OR_INCOMPLETE");
    assert.equal(result.renderStalls.length,1);
});

test("Phase 2 flags very low FPS or simulation rate even without a client crash",()=>{
    const result=summarizeAuthenticated([row(0),{...row(600000),fps:1,cycleRate:10},
        row(1195000)],1200000,"2026-10-10T01:45:00.000Z");
    assert.equal(result.status,"FAILED_OR_INCOMPLETE");
    assert.equal(result.severePerformanceSamples.length,1);
    assert.equal(result.severePerformanceSamples[0].fps,1);
});

test("Phase 2 can run with a fake timer and reports logged-in simulation rates, without waiting in tests",async()=>{
    let fakeNow=0,steps=0;
    const report=await runPhase2({
        minutes:0.1,waitLoginMinutes:0.01,pollMs:200,
        now:()=>fakeNow,pause:async ms=>{fakeNow+=ms;},
        request:async action=>{
            if(action==="heap")return {usedBytes:25*1048576,totalBytes:40*1048576};
            steps++;return {client:{gameState:"LOGGED_IN",gameCycle:Math.floor(fakeNow/20)+1,
                presentedFrames:Math.floor(fakeNow/40),presentedFps:25,
                cyclesPerSecond:50,originalFps:25,clientThread:true,
                frameChanged:true,hasError:false,callbackError:""}};
        },emit:()=>{}
    });
    assert.equal(report.status,"PASS_RUNTIME_ONLY");
    assert.ok(report.sampleCount>=5);
    assert.equal(report.jsHeapStartMB,25);
    assert.ok(steps>5);
});
test("Phase 2 never claims an authenticated pass if disposable-account login is missing",async()=>{
    let fakeNow=0;
    const result=await runPhase2({minutes:0.02,waitLoginMinutes:0.001,pollMs:100,
        now:()=>fakeNow,pause:async ms=>{fakeNow+=ms;},
        request:async()=>({client:{gameState:"LOGIN_SCREEN",hasError:false,callbackError:""}}),
        emit:()=>{}});
    assert.equal(result.status,"NEEDS_MANUAL_LOGIN");
});
test("Read-only original JavaScript heap measurement never inspects page contents or credentials",async()=>{
    const events=[];
    const bridge={
        browserStatus:()=>({connected:true}),
        requireWorld:async()=>events.push("verified-logged-in"),
        browser:{command:async method=>{
            events.push(method);return {usedSize:104857600,totalSize:209715200};
        }}
    };
    const controller=new DesktopController(bridge);
    const output=await controller.dispatch("heap");
    assert.equal(output.usedBytes,104857600);
    assert.equal(output.totalBytes,209715200);
    assert.deepEqual(events,["verified-logged-in","Runtime.getHeapUsage"]);
    assert.deepEqual(parseCommand(["heap"]),{action:"heap",args:{}});
});
