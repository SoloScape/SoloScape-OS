import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {sha256} from "../teavm-poc/site/original-sha256.mjs";

const expected=bytes=>createHash("sha256").update(bytes).digest("hex");
const hex=bytes=>Buffer.from(bytes).toString("hex");

test("HTTP LAN SHA-256 fallback matches standard hash vectors and padding boundaries",()=>{
    const enc=new TextEncoder();
    for(const sample of ["","abc","hello world","The quick brown fox jumps over the lazy dog"]){
        const bytes=enc.encode(sample);
        assert.equal(hex(sha256(bytes)),expected(bytes),sample);
    }
    for(const n of [0,1,7,15,54,55,56,63,64,65,119,120,127,128,495,512,1024,2049]){
        const bytes=Uint8Array.from({length:n},(_,i)=>(i*137+91)&255);
        assert.equal(hex(sha256(bytes)),expected(bytes),"length "+n);
    }
    assert.throws(()=>sha256(new Uint8Array(1024*1024+1)),/at most 1 MiB/);
    assert.throws(()=>sha256("secret"),/requires at most/);
});

test("public hashcash prefix reuse yields identical SHA-256 for changing nonces and salts",()=>{
    const encoder=new TextEncoder();
    for(const salt of ["a".repeat(990),"f".repeat(990),"b".repeat(1020)]){
        for(const nonce of [0,1,14,15,16,255,256,4095,65535,0x1000000]){
            const challenge=encoder.encode("18"+salt+nonce.toString(16));
            assert.equal(hex(sha256(challenge)),expected(challenge),
                "SHA-256 challenge should match Node for nonce "+nonce);
        }
    }
    // A different prefix at the same length must never reuse the old state.
    for(const prefix of ["c".repeat(990),"d".repeat(990)]){
        const input=encoder.encode("18"+prefix+"abcdef");
        assert.equal(hex(sha256(input)),expected(input));
    }
    const short=encoder.encode("credential-free-short-vector");
    assert.equal(hex(sha256(short)),expected(short));
});
test("long binary and SHA-256 padding-boundary inputs remain correct across prefix changes",()=>{
    for(const size of [899,900,959,960,1023,1024,1025,1199,1200,1201]){
        for(let pass=0;pass<3;pass++){
            const bytes=Uint8Array.from({length:size},(_,i)=>(i*31+pass*17)&255);
            assert.equal(hex(sha256(bytes)),expected(bytes),"size "+size+" pass "+pass);
        }
    }
});

test("reused public hash scratch handles unaligned input, shrinking nonces and independent results",()=>{
    const encoder=new TextEncoder(),prefix="18"+"a".repeat(1020);
    const first=sha256(encoder.encode(prefix+"abcdef")),saved=first.slice();
    for(const nonce of ["abcdef","0","fffffff","1"]){
        const bytes=encoder.encode(prefix+nonce),backing=new Uint8Array(bytes.length+3);
        backing.set(bytes,1);
        const unaligned=backing.subarray(1,1+bytes.length);
        assert.equal(hex(sha256(unaligned)),expected(bytes));
        assert.deepEqual(first,saved,"later hashes must not mutate an earlier result");
    }
});

const source=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/BrowserDigest.java",import.meta.url),"utf8");
const script=/@JSBody\(params=\{"algorithm","bytes","done"\},script="([^"]*)"\)/.exec(source)?.[1];
assert.ok(script,"BrowserDigest SHA-256 adapter must be compiled into original gamepack");

function digestBridge(algorithm,bytes,{crypto=null,fallback=sha256,timeout=setTimeout}={}){
    return new Promise((resolve,reject)=>{
        const realm={
            algorithm,bytes,
            done:(result,error)=>error?reject(Error(error)):resolve(result),
            Uint8Array,
            queueMicrotask,
            setTimeout:timeout,
        };
        realm.globalThis={crypto,soloscapeOriginalSha256:fallback,soloscapeOriginalSha256Ticks:0};
        runInNewContext("(function(){"+script+"})()",realm);
    });
}

test("original Java digest handles HTTP LAN without crypto.subtle using real SHA-256",async()=>{
    for(const size of [3,56,495,1000]){
        const bytes=Uint8Array.from({length:size},(_,i)=>(i*21+31)&255);
        const digest=await digestBridge("SHA-256",bytes);
        assert.equal(hex(digest),expected(bytes));
    }
    await assert.rejects(digestBridge("SHA-512",new Uint8Array(0)),
        /Digest not available/, "unsupported insecure-origin algorithms must fail closed");
});
test("browser adapter preserves Web Crypto on secure PC origins",async()=>{
    const data=new Uint8Array([1,2,3,4]);
    let called=0;
    const browserCrypto={subtle:{digest:async(algorithm,bytes)=>{
        called++;
        assert.equal(algorithm,"SHA-256");
        return createHash("sha256").update(bytes).digest().buffer.slice(0);
    }}};
    const actual=await digestBridge("SHA-256",data,{
        crypto:browserCrypto,
        fallback:()=>{throw Error("WebCrypto should remain in use");}
    });
    assert.equal(called,1);
    assert.equal(hex(actual),expected(data));
});
test("hashcash digest yields to the event loop periodically during long original PoW computation",async()=>{
    const bytes=new Uint8Array([42]);
    let tasks=0;
    let calls=0;
    const run=(algorithm,bytes,done)=>{
        const realm={algorithm,bytes,done,
            Uint8Array,queueMicrotask,
            setTimeout:(task)=>{tasks++;queueMicrotask(task)}
        };
        realm.globalThis={
            crypto:null,soloscapeOriginalSha256:(data)=>{calls++;return sha256(data);},
            soloscapeOriginalSha256Ticks:255
        };
        runInNewContext("(function(){"+script+"})()",realm);
    };
    await new Promise((resolve,reject)=>run("SHA-256",bytes,(result,error)=>
        error?reject(Error(error)):(assert.equal(hex(result),expected(bytes)),resolve())));
    assert.equal(tasks,1,"every 256th proof hash must yield");
    assert.equal(calls,1);
});

test("ordinary HTTP proof hashes complete inline without a per-nonce microtask",()=>{
    const bytes=new Uint8Array([42]);
    let result,scheduled=0;
    const realm={algorithm:"SHA-256",bytes,Uint8Array,
        done:(data,error)=>{assert.equal(error,null);result=data;},
        queueMicrotask:()=>{scheduled++;},setTimeout:()=>{scheduled++;},
        globalThis:{crypto:null,soloscapeOriginalSha256:sha256,soloscapeOriginalSha256Ticks:0}};
    runInNewContext("(function(){"+script+"})()",realm);
    assert.equal(hex(result),expected(bytes));
    assert.equal(scheduled,0);
});
test("original game imports local hash function before initializing authentic Java engine",async()=>{
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(page,/import \{sha256 as originalSha256\} from "\/original-sha256\.mjs"/);
    assert.match(page,/globalThis\.soloscapeOriginalSha256=originalSha256/);
    assert.ok(page.indexOf("soloscapeOriginalSha256=originalSha256")<
        page.indexOf("void initializeOriginalEngine()"));
    assert.doesNotMatch(page,/autoLogin\(|loginPassword\(/);
});
