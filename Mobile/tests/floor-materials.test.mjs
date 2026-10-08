import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32, gzipSync } from "node:zlib";
import { NativeJs5Cache } from "../browser/native-js5.mjs";
import { decodeTerrainRegion } from "../browser/terrain-world.mjs";
import { buildTerrainMesh } from "../browser/world-webgl.mjs";
import {
    decodeFloorDefinition, unpackArchiveFiles, loadFloorMaterials,
} from "../browser/floor-materials.mjs";

function packedPair(a,b){
    const table=Buffer.alloc(8);
    table.writeInt32BE(a.length,0);
    table.writeInt32BE(b.length-a.length,4);
    return Buffer.concat([a,b,table,Buffer.from([1])]);
}
function container(body,compressed=true){
    const payload=compressed?gzipSync(body):body;
    const head=Buffer.alloc(compressed?9:5);
    head[0]=compressed?2:0;
    head.writeUInt32BE(payload.length,1);
    if(compressed)head.writeUInt32BE(body.length,5);
    return Buffer.concat([head,payload]);
}
function nativeResult(archive,group,bytes){
    return {
        archive,group,container:Uint8Array.from(bytes),
        compression:bytes[0],
        uncompressedBytes:bytes[0]===0?bytes.readUInt32BE(1):bytes.readUInt32BE(5),
    };
}
function floorReference(group1,group4){
    const head=Buffer.alloc(8);
    head[0]=7;
    head.writeUInt32BE(138442,1);
    head.writeUInt16BE(2,6);
    const ids=Buffer.from([0,1,0,3]); // deltas => groups 1 and 4
    const checks=Buffer.alloc(8);
    checks.writeUInt32BE(crc32(group1),0);
    checks.writeUInt32BE(crc32(group4),4);
    const revs=Buffer.alloc(8);
    const counts=Buffer.from([0,2,0,1]);
    const files=Buffer.from([0,0,0,1,0,0]);
    return Buffer.concat([head,ids,checks,revs,counts,files]);
}
const underlay0=Buffer.from([1,0xaa,0x11,0x22,0]);
const underlay1=Buffer.from([1,0x22,0xbb,0x44,0]);
const overlay0=Buffer.from([1,0x11,0x33,0xcc,7,0xcc,0x22,0x44,0]);
const fileUnderlays=container(packedPair(underlay0,underlay1));
const fileOverlays=container(overlay0);
const refContainer=container(floorReference(fileUnderlays,fileOverlays));
const masterData=Buffer.alloc(3*8);
masterData.writeUInt32BE(crc32(refContainer),2*8);
masterData.writeUInt32BE(138442,2*8+4);
const master=container(masterData,false);

test("native floor archive unpacker selects individual named file IDs",()=>{
    const data=packedPair(underlay0,underlay1);
    const all=unpackArchiveFiles(data,[0,1],new Set([0,1]));
    assert.deepEqual(Buffer.from(all.get(0)),underlay0);
    assert.deepEqual(Buffer.from(all.get(1)),underlay1);
    const only1=unpackArchiveFiles(data,[0,1],new Set([1]));
    assert.equal(only1.has(0),false);
    assert.deepEqual(Buffer.from(only1.get(1)),underlay1);
    const single=unpackArchiveFiles(overlay0,[0],new Set([0]));
    assert.deepEqual(Buffer.from(single.get(0)),overlay0);
    const wrongIds=[1,1];
    assert.throws(()=>unpackArchiveFiles(data,wrongIds,new Set([1])),/metadata/);
    const damaged=Buffer.from(data);
    damaged[damaged.length-1]=255;
    assert.throws(()=>unpackArchiveFiles(damaged,[0,1],new Set([0])),/chunk/);
});

test("native packed archive supports multiple chunks and sparse file IDs",()=>{
    const a=Buffer.from([1,2,3,4,5,6,7,8]);
    const b=Buffer.from([9,10,11,12]);
    const table=Buffer.alloc(16);
    table.writeInt32BE(3,0);
    table.writeInt32BE(-2,4);
    table.writeInt32BE(5,8);
    table.writeInt32BE(-2,12);
    const payload=Buffer.concat([a.subarray(0,3),b.subarray(0,1),
        a.subarray(3),b.subarray(1),table,Buffer.from([2])]);
    const files=unpackArchiveFiles(payload,[0,7],new Set([0,7]));
    assert.deepEqual(Buffer.from(files.get(0)),a);
    assert.deepEqual(Buffer.from(files.get(7)),b);
});

test("OSRS floor opcodes decode underlay RGB and overlay secondary RGB",()=>{
    assert.deepEqual(decodeFloorDefinition(underlay0,"underlay"),{
        rgb:0xaa1122,secondaryRgb:null,textureId:-1,hideUnderlay:true,
    });
    const overlay=decodeFloorDefinition(overlay0,"overlay");
    assert.equal(overlay.rgb,0x1133cc);
    assert.equal(overlay.secondaryRgb,0xcc2244);
    const textured=decodeFloorDefinition(Buffer.from([3,0xff,0xff,5,0]),"overlay");
    assert.equal(textured.textureId,-1);
    assert.equal(textured.hideUnderlay,false);
    assert.throws(()=>decodeFloorDefinition(Buffer.from([200,0]),"underlay"),/Unsupported/);
    assert.throws(()=>decodeFloorDefinition(Buffer.from([1,2,3]),"overlay"),/Truncated/);
    assert.throws(()=>decodeFloorDefinition(Buffer.from([0,200]),"overlay"),/terminator/);
});

test("configuration index 2 supplies verified underlay and overlay RGB to native mesh",async()=>{
    const fetches=[];
    const cache=new NativeJs5Cache({WebSocketClass:class Fake{}});
    cache.fetchRawGroup=async(a,g)=>{
        fetches.push(a+":"+g);
        if(a===255&&g===255)return nativeResult(a,g,master);
        if(a===255&&g===2)return nativeResult(a,g,refContainer);
        if(a===2&&g===1)return nativeResult(a,g,fileUnderlays);
        if(a===2&&g===4)return nativeResult(a,g,fileOverlays);
        throw new Error("Unexpected native floor group");
    };
    const terrain={
        side:64,heights:new Int32Array(4096),
        underlays:new Uint16Array(4096),
        overlays:new Int16Array(4096),
    };
    terrain.underlays[0]=1;
    terrain.underlays[1]=2;
    terrain.overlays[0]=1;
    const materials=await loadFloorMaterials(cache,terrain);
    terrain.floorMaterials=materials;
    assert.equal(materials.loadedUnderlays,2);
    assert.equal(materials.loadedOverlays,1);
    assert.equal(materials.selectedUnderlays,2);
    assert.equal(materials.selectedOverlays,1);
    assert.deepEqual(fetches,["255:255","255:2","2:1","2:4"]);
    const mesh=buildTerrainMesh(terrain);
    const shade=1;
    assert.ok(Math.abs(mesh[3]-(0x11/255)*shade)<1e-6);
    assert.ok(Math.abs(mesh[4]-(0x33/255)*shade)<1e-6);
    assert.ok(Math.abs(mesh[5]-(0xcc/255)*shade)<1e-6);
    const withoutOverlay={...terrain,overlays:new Int16Array(4096)};
    const baseMesh=buildTerrainMesh(withoutOverlay);
    assert.ok(Math.abs(baseMesh[3]-(0xaa/255)*shade)<1e-6);
    assert.ok(Math.abs(baseMesh[4]-(0x11/255)*shade)<1e-6);
    await loadFloorMaterials(cache,terrain);
    assert.deepEqual(fetches,["255:255","255:2","2:1","2:4"]);
});

test("unknown floor tile ids do not trigger arbitrary extra group downloads",async()=>{
    const cache=new NativeJs5Cache({WebSocketClass:class Fake{}});
    const requests=[];
    cache.fetchRawGroup=async(a,g)=>{
        requests.push(a+":"+g);
        if(a===255&&g===255)return nativeResult(a,g,master);
        if(a===255&&g===2)return nativeResult(a,g,refContainer);
        if(a===2&&g===1)return nativeResult(a,g,fileUnderlays);
        throw new Error("Unexpected group");
    };
    const terrain={
        side:64,heights:new Int32Array(4096),
        underlays:new Uint16Array(4096),
        overlays:new Int16Array(4096),
    };
    terrain.underlays[0]=500;
    const materials=await loadFloorMaterials(cache,terrain);
    assert.equal(materials.selectedUnderlays,1);
    assert.equal(materials.loadedUnderlays,0);
    assert.equal(materials.selectedOverlays,0);
    assert.deepEqual(requests,["255:255","255:2","2:1"]);
    assert.ok(buildTerrainMesh({...terrain,floorMaterials:materials}).every(Number.isFinite));
});

test("floor faces use primary scene RGB and omit missing, transparent or textured definitions",()=>{
    const terrain={
        side:64,heights:new Int32Array(4096),
        underlays:new Uint16Array(4096),overlays:new Int16Array(4096),
        overlayShapes:new Uint8Array(4096),overlayRotations:new Uint8Array(4096),
        floorMaterials:{underlays:new Map([[0,{rgb:0xff0000,textureId:-1}]]),
            overlays:new Map([[0,{rgb:0x0000ff,secondaryRgb:0x00ff00,textureId:-1}]])},
    };
    terrain.underlays[0]=1;
    terrain.overlays[0]=1;
    terrain.overlayShapes[0]=1;
    const mesh=buildTerrainMesh(terrain);
    assert.equal(mesh.length,36);
    assert.deepEqual(Array.from(mesh.subarray(3,6)),[1,0,0]);
    assert.deepEqual(Array.from(mesh.subarray(21,24)),[0,0,1]);
    terrain.floorMaterials.overlays.set(0,{rgb:0xff00ff,textureId:-1});
    assert.equal(buildTerrainMesh(terrain).length,18);
    terrain.floorMaterials.overlays.set(0,{rgb:0x0000ff,textureId:2});
    assert.equal(buildTerrainMesh(terrain).length,18);
    terrain.floorMaterials.overlays.clear();
    assert.equal(buildTerrainMesh(terrain).length,18);
    terrain.floorMaterials.underlays.clear();
    assert.equal(buildTerrainMesh(terrain).length,0);
});
