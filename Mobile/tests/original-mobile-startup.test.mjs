import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {loadOriginalCache,readCacheResponse} from "../teavm-poc/site/original-cache-loader.mjs";

const fixture=bytes=>new Response(new Uint8Array(bytes),{status:200});
test("native cache reader streams into one pre-sized buffer and tracks progress",async()=>{
    const chunks=[new Uint8Array([1,2,3]),new Uint8Array([4,5])];
    let index=0,canceled=false;
    const response={ok:true,body:{getReader:()=>({
        async read(){return index<chunks.length?{done:false,value:chunks[index++]}:{done:true};},
        async cancel(){canceled=true;},
        releaseLock(){}
    })}};
    const progress=[];
    const result=await readCacheResponse(response,5,{onProgress:v=>progress.push(v)});
    assert.deepEqual([...result],[1,2,3,4,5]);
    assert.equal(canceled,false);
    assert.equal(progress.at(-1),5);
});
test("native cache reader detects incomplete and oversized streamed data",async()=>{
    await assert.rejects(()=>readCacheResponse(fixture([1,2]),3),/Incomplete/);
    await assert.rejects(()=>readCacheResponse(fixture([1,2,3]),2),/exceeded/);
    await assert.rejects(()=>readCacheResponse(fixture([1]),512*1024*1024+1),/Invalid/);
});
test("original cache loads files sequentially, and mounts only fixed cache filenames",async()=>{
    let active=0,maxActive=0;
    const calls=[],statuses=[];
    const files=await loadOriginalCache({files:[
        {name:"main_file_cache.dat2",bytes:3},{name:"main_file_cache.idx255",bytes:2}
    ]},{
        fetchFile:async name=>{
            calls.push(name);active++;maxActive=Math.max(maxActive,active);
            await Promise.resolve();active--;return fixture(name.endsWith("dat2")?[1,2,3]:[4,5]);
        },
        onProgress:p=>statuses.push(p)
    });
    assert.equal(maxActive,1);
    assert.deepEqual(calls,["main_file_cache.dat2","main_file_cache.idx255"]);
    assert.deepEqual([...files.get("/home/soloscape/jagexcache/oldschool/LIVE/main_file_cache.dat2")],[1,2,3]);
    assert.equal(files.size,27);
    assert.equal(statuses.at(-1).loaded,5);
    assert.equal(statuses.at(-1).total,5);
    await assert.rejects(()=>loadOriginalCache({files:[{name:"../../secret",bytes:5}]}),/Invalid native cache/);
    await assert.rejects(()=>loadOriginalCache({files:[
        {name:"main_file_cache.dat2",bytes:3},{name:"main_file_cache.dat2",bytes:3}
    ]}),/Invalid native cache/);
});
test("iOS client loads original game without a startup text overlay",async()=>{
    const html=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    const script=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.doesNotMatch(html,/id="loading-status"/);
    assert.match(html,/id="original-engine-canvas"/);
    const css=await readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8");
    assert.match(css,/background:#000/);
    assert.match(html,/viewport-fit=cover/);
    assert.match(script,/loadOriginalCache\(manifest/);
    assert.match(script,/state\.gameState==="LOGIN_SCREEN"/);
    assert.doesNotMatch(script,/Loading original game data|Starting original game/);
    assert.match(script,/void initializeOriginalEngine\(\)/);
    assert.doesNotMatch(script,/Promise\.all\(manifest\.files/);
    assert.doesNotMatch(script,/\.submit\(\)|autoLogin|loginPassword/);
});
