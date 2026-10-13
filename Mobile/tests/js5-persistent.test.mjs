import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeJs5Cache,crc32} from "../browser/native-js5.mjs";
import {BrowserJs5Storage} from "../browser/js5-persistent.mjs";

function fixture(){
    const entries=new Map();
    const store={
        match:async key=>entries.get(key)?.clone()??null,
        put:async(key,response)=>{entries.set(key,response.clone());},
        delete:async key=>entries.delete(key),
    };
    const storage=new BrowserJs5Storage({revision:240,origin:"http://localhost:3001",
        storage:{open:async()=>store}});
    return {entries,storage};
}
test("public CRC-verified JS5 groups persist across browser cache instances",async()=>{
    const {storage,entries}=fixture();
    const bytes=Uint8Array.of(0,0,0,0,3,4,5,6),crc=crc32(bytes);
    let gateway=0;
    const make=()=> {
        const cache=new NativeJs5Cache({WebSocketClass:class{},persistentStore:storage});
        cache.indices.set(7,{index:7,groups:new Map([[321,crc]])});
        cache.fetchRawGroup=async()=>{gateway++;return {container:bytes};};
        return cache;
    };
    const first=await make().loadGroup(7,321);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual([...first],[...bytes]);
    assert.equal(entries.size,1,"the public verified group is persisted");
    const second=await make().loadGroup(7,321);
    assert.deepEqual([...second],[...bytes]);
    assert.equal(gateway,1,"warm login must not open another WebSocket for this group");
});
test("corrupted persisted JS5 containers are evicted and re-fetched from gateway",async()=>{
    const {storage,entries}=fixture();
    const bytes=Uint8Array.of(0,0,0,0,3,4,5,6),crc=crc32(bytes);
    const corrupt=bytes.slice();corrupt[6]^=1;
    await storage.put(7,321,crc,corrupt);
    let gateway=0;
    const cache=new NativeJs5Cache({WebSocketClass:class{},persistentStore:storage});
    cache.indices.set(7,{index:7,groups:new Map([[321,crc]])});
    cache.fetchRawGroup=async()=>{gateway++;return {container:bytes};};
    const result=await cache.loadGroup(7,321);
    assert.deepEqual([...result],[...bytes]);
    assert.equal(gateway,1,"damaged browser storage cannot bypass CRC validation");
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual([...(await storage.get(7,321,crc))],[...bytes]);
});
test("unavailable storage never prevents a verified network login",async()=>{
    const storage=new BrowserJs5Storage({revision:240,origin:"http://localhost:3001",
        storage:{open:async()=>{throw new Error("Private browser storage denied");}}});
    assert.equal(await storage.get(7,123,3),null);
    assert.equal(await storage.put(7,123,3,Uint8Array.of(1,2,3)),false);
    const data=Uint8Array.of(0,0,0,0,1,17);
    const cache=new NativeJs5Cache({WebSocketClass:class{},persistentStore:storage});
    cache.indices.set(7,{groups:new Map([[123,crc32(data)]])});
    cache.fetchRawGroup=async()=>({container:data});
    assert.deepEqual([...await cache.loadGroup(7,123)],[...data]);
});
