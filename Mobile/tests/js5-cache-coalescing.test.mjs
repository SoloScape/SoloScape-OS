import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeJs5Cache,crc32} from "../browser/native-js5.mjs";

test("concurrent requests for one verified JS5 group share a single gateway fetch",async()=>{
    const cache=new NativeJs5Cache(),data=Uint8Array.of(0,0,0,0,2,14,15);
    cache.indices.set(7,{index:7,groups:new Map([[13,crc32(data)]])});
    let fetches=0,release;
    const pending=new Promise(resolve=>{release=resolve;});
    cache.fetchRawGroup=async()=>{fetches++;await pending;return {container:data};};
    const first=cache.loadGroup(7,13),second=cache.loadGroup(7,13);
    assert.equal(fetches,0,"fetch awaits index/microtasks");
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fetches,1);
    release();
    const [a,b]=await Promise.all([first,second]);
    assert.strictEqual(a,b);
    assert.equal(await cache.loadGroup(7,13),a);
    assert.equal(fetches,1,"validated payload stays cached");
});

test("failed JS5 requests leave no rejected in-flight entry",async()=>{
    const cache=new NativeJs5Cache(),data=Uint8Array.of(0,0,0,0,1,7);
    cache.indices.set(7,{index:7,groups:new Map([[2,crc32(data)]])});
    let fetches=0;
    cache.fetchRawGroup=async()=>{if(++fetches===1)throw new Error("upstream failure");return {container:data};};
    await assert.rejects(Promise.all([cache.loadGroup(7,2),cache.loadGroup(7,2)]),/upstream failure/);
    assert.deepEqual(await cache.loadGroup(7,2),data);
    assert.equal(fetches,2);
});
