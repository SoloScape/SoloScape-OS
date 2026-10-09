import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Import the actual full-engine artifact. This deliberately exercises the
// missing-storage failure before starting network/game threads in Node.
try {
    const report=JSON.parse(readFileSync(new URL("../target/engine/report.json",import.meta.url),"utf8"));
    assert.equal(report.status,"compiled-unverified");assert.equal(report.javascriptSyntaxVerified,true);
    const engine=await import(new URL("../target/engine/javascript/engine.js",import.meta.url));
    for(const name of ["initialize","initializeAsync","configureCanvas","configureGateway","registerResource","unlockAudio","syncFilesystem"])
        assert.equal(typeof engine[name],"function");
    assert.equal(engine.startupState(),"not-started");
    assert.equal(globalThis.indexedDB,undefined,"Run this host-contract smoke in Node");
    let timer;
    const result=new Promise((resolve,reject)=>{
        timer=setTimeout(()=>reject(new Error("Engine initialization callback timed out")),10000);
        engine.initializeAsync(error=>{clearTimeout(timer);resolve(error);});
    });
    const error=await result;
    assert.match(error,/IndexedDB unavailable/);assert.equal(engine.startupState(),"error");
    assert.match(engine.startupError(),/IndexedDB unavailable/);
    console.log("PASS: actual full-engine module imports, exports its host API and reports storage failure through a cooperative initialization callback.");
}catch(error){console.error(error.name+": "+error.message);process.exitCode=1;}
