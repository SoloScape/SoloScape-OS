import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Verify the actual generated gamepack module's startup *contract*. This is
// deliberately not a gameplay claim; Node cannot mount IndexedDB or run Chrome.
try {
    const report=JSON.parse(readFileSync(new URL("../target/engine/report.json",import.meta.url),"utf8"));
    assert.equal(report.status,"compiled-unverified");assert.equal(report.javascriptSyntaxVerified,true);
    const engine=await import(new URL("../target/engine/javascript/engine.js",import.meta.url));
    for(const name of ["initialize","initializeAsync","configureCanvas","configureGateway",
        "configureClient","configureClientParameter","configureMobileLayout","clientError","callbackError","startupStep","gameCycle",
        "hasClientThread","gameState","registerResource","unlockAudio","syncFilesystem",
        "configureLoginRsaPublic","loginRsaConfigured","callbackTrace","originalFps","presentedFrames","clockCalls","clockTicks","clockLastTicks","clockMaxTicks","clockGapMs","clockWaitMs"])
        assert.equal(typeof engine[name],"function",name+" missing");
    assert.equal(engine.startupState(),"not-started");
    engine.configureMobileLayout(true);
    engine.configureMobileLayout(false);
    assert.equal(engine.gameCycle(),-1);
    assert.equal(engine.originalFps(),-1);
    assert.equal(engine.presentedFrames(),0);
    assert.equal(engine.loginRsaConfigured(),false);
    assert.throws(()=>engine.configureLoginRsaPublic("2","1".repeat(256)),/Invalid SoloScape public RSA/);
    engine.configureLoginRsaPublic("10001","a".repeat(255)+"b");
    assert.equal(engine.loginRsaConfigured(),true);
    assert.equal(engine.hasClientThread(),false);
    assert.equal(globalThis.indexedDB,undefined,"Run this host-contract smoke in Node");
    assert.throws(()=>engine.initializeAsync(null),/ClientConfiguration codebase is required/);
    engine.configureClient("http://127.0.0.1:3097/");
    engine.configureClientParameter("worldid","1");
    engine.configureCanvas("original-engine-canvas");
    let timer;
    const result=new Promise((resolve,reject)=>{
        timer=setTimeout(()=>reject(new Error("Engine initialization callback timed out")),10000);
        engine.initializeAsync(error=>{clearTimeout(timer);resolve(error);});
    });
    const error=await result;
    assert.match(error,/initialize-game-engine:/,"Node has no browser DOM and must not claim a successful original client startup");
    assert.doesNotMatch(error,/IndexedDB unavailable/,"missing browser persistence now has a safe ephemeral fallback");
    assert.equal(engine.startupState(),"error");
    assert.match(engine.startupError(),/initialize-game-engine:/);
    console.log("PASS: original engine module exposes ClientConfiguration, startup/cycle telemetry, ephemeral browser-storage fallback, and rejects Node-only game initialization. Gameplay not yet established.");
}catch(error){console.error(error.name+": "+error.message);process.exitCode=1;}
