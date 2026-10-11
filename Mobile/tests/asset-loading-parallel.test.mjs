import assert from "node:assert/strict";
import {test} from "node:test";
import {mapBounded} from "../browser/bounded-work.mjs";
import {SceneTextures} from "../browser/texture-cache.mjs";

test("bounded JS5 work overlaps requests without exceeding the connection budget",async()=>{
    let release;
    const barrier=new Promise(resolve=>{release=resolve;});
    let started=0,inFlight=0,peak=0;
    const pending=mapBounded(Array.from({length:19},(_,i)=>i),6,async value=>{
        started++;inFlight++;peak=Math.max(peak,inFlight);
        await barrier;
        inFlight--;return value*2;
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(started,6,"the first six requests must start without serial waits");
    assert.equal(peak,6,"never start an unbounded number of connections");
    release();
    assert.deepEqual(await pending,Array.from({length:19},(_,i)=>i*2));
    assert.equal(inFlight,0);
    assert.equal(peak,6);
    await assert.rejects(mapBounded([1,2],2,async value=>{
        if(value===2)throw new Error("corrupt CRC");
        return value;
    }),/corrupt CRC/);
    await assert.rejects(mapBounded([1],0,async()=>0),/concurrency/);
});
test("scene texture requests coalesce pending sprite materials",async()=>{
    const textures=new SceneTextures({revision:240});
    let resolve,requests=0;
    const barrier=new Promise(done=>{resolve=done;});
    textures.loadUncached=async id=>{
        requests++;await barrier;
        const texture={id};textures.textures.set(id,texture);return texture;
    };
    const a=textures.load(42),b=textures.load(42),c=textures.load(43);
    assert.strictEqual(a,b,"multiple placements must reuse exactly one verified pending load");
    assert.notStrictEqual(a,c);
    assert.equal(requests,2);
    resolve();
    const [first,second,third]=await Promise.all([a,b,c]);
    assert.strictEqual(first,second);
    assert.notStrictEqual(first,third);
    assert.equal(textures.pendingTextures.size,0);
    assert.strictEqual(await textures.load(42),first,"completed materials are cached");
    assert.equal(requests,2);
});
