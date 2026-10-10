import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const src=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/fs/BrowserStorage.java",import.meta.url),"utf8");
const loadScript=/@JSBody\(params=\{"done"\},script="([^"]+)"\)\s*private static native void load\(/.exec(src)?.[1];
const saveScript=/@JSBody\(params=\{"records","done"\},script="([^"]+)"\)\s*private static native void save\(/.exec(src)?.[1];
assert.ok(loadScript,"Need original Java browser filesystem load JSBody");
assert.ok(saveScript,"Need original Java browser filesystem save JSBody");

function runLoad(ctx){
    const calls=[],tasks=[];
    const realm={...ctx,done:(records,error)=>calls.push({records,error}),
        setTimeout:callback=>{tasks.push(callback);}};
    realm.globalThis=realm;
    runInNewContext("(function(){"+loadScript+"})()",realm);
    return {realm,calls,flush:()=>{for(const callback of tasks.splice(0))callback();}};
}
function runSave(realm,records){
    const result=[];
    realm.records=records;
    realm.done=error=>result.push(error);
    runInNewContext("(function(){"+saveScript+"})()",realm);
    return result;
}

test("insecure LAN origin initializes temporary original Java filesystem without requiring IndexedDB",()=>{
    let opened=false;
    const {realm,calls,flush}=runLoad({isSecureContext:false,indexedDB:{open(){opened=true;throw Error("should not be called");}}});
    assert.equal(opened,false);
    assert.equal(calls.length,0,"fallback must yield to TeaVM scheduler");
    flush();
    assert.equal(calls.length,1);
    assert.deepEqual(JSON.stringify(calls),JSON.stringify([{records:[],error:null}]));
    assert.equal(realm.soloscapeOriginalFsEphemeral,true);
    assert.deepEqual(runSave(realm,[{name:"/tmp/game.dat",bytes:[1,2]}]),[null],
        "ephemeral writes remain in original Java process memory without browser storage persistence");
});

test("denied browser storage on a secure origin does not strand original Java startup callback",()=>{
    const {realm,calls,flush}=runLoad({isSecureContext:true,indexedDB:{open(){throw Error("SecurityError");}}});
    assert.equal(calls.length,0);
    flush();
    assert.equal(calls.length,1);
    assert.equal(calls[0].error,null);
    assert.equal(realm.soloscapeOriginalFsEphemeral,true);
});

test("existing secure localhost IndexedDB filesystem still loads and persists normally",()=>{
    const req={};
    const db={close(){},transaction(mode){return {objectStore(){return {
        getAll(){return get;},
        clear(){},
        put(){}
    }}}}};
    const get={};
    const indexedDB={open(){return req;}};
    const {realm,calls}=runLoad({isSecureContext:true,indexedDB});
    assert.equal(calls.length,0);
    req.result=db;
    req.onsuccess();
    get.result=[{name:"/tmp/test",directory:false,bytes:new Uint8Array([5])}];
    get.onsuccess();
    assert.equal(calls.length,1);
    assert.equal(calls[0].error,null);
    assert.equal(calls[0].records.length,1);
    assert.notEqual(realm.soloscapeOriginalFsEphemeral,true);
    const writes=runSave(realm,[{name:"/tmp/test",bytes:[5]}]);
    assert.equal(writes.length,0);
});

test("fullscreen LAN client auto-starts with progress and reports safe startup errors",async()=>{
    const script=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    const html=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    assert.match(script,/void initializeOriginalEngine\(\)/);
    assert.match(script,/engine\.initializeAsync\(/);
    assert.match(script,/engine\?\.startupStep\?\.\(\)/);
    assert.match(script,/safeStep/);
    assert.match(script,/loading\("Loading original Java engine/);
    assert.match(html,/id="loading-status"/);
    assert.match(html,/id="original-engine-canvas"/);
    assert.doesNotMatch(script,/login.*password\(|automateLogin\(/i);
});

test("private LAN Java applet identity uses native localhost host check without moving fetches off the LAN",async()=>{
    const script=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(script,/let codebase=window\.location\.origin\+"\/"/);
    assert.match(script,/engine\.configureClient\(codebase\)/);
    assert.match(script,/const configured=await fetch\("\/original-gateway"\)/);
    assert.match(script,/await fetch\("\/original-cache\/manifest"\)/);
    assert.match(script,/await import\("\/engine\.js"\)/);
    assert.match(script,/void initializeOriginalEngine\(\)/);
});

test("blocked IndexedDB upgrade falls back once; late events cannot double-complete startup",()=>{
    const req={};
    const {realm,calls,flush}=runLoad({isSecureContext:true,indexedDB:{open(){return req;}}});
    req.onblocked();
    assert.equal(calls.length,0);
    flush();
    assert.equal(calls.length,1);
    assert.equal(realm.soloscapeOriginalFsEphemeral,true);
    req.result={close(){}};
    req.onsuccess();
    assert.equal(calls.length,1);
});
