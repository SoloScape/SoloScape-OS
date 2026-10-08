import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32, gzipSync } from "node:zlib";
import { NativeJs5Cache } from "../browser/native-js5.mjs";
import {
    baseTileHeight, decodeTerrainRegion, djb2, getTerrainGroup, loadNativeTerrain,
    mapRegionCatalog,
} from "../browser/terrain-world.mjs";
import { buildTerrainMesh } from "../browser/world-webgl.mjs";

function cacheContainer(payload,compression=2){
    const data=compression===2?gzipSync(payload):payload;
    const hdr=Buffer.alloc(compression===2?9:5);
    hdr[0]=compression;
    hdr.writeUInt32BE(data.length,1);
    if(compression===2)hdr.writeUInt32BE(payload.length,5);
    return Buffer.concat([hdr,data]);
}
function result(archive,group,container){
    return {
        archive,group,compression:container[0],
        uncompressedBytes:container[0]===0?container.readUInt32BE(1):container.readUInt32BE(5),
        container:Uint8Array.from(container),
    };
}
function refTable(groupId,hash){
    const header=Buffer.alloc(8);
    header[0]=7;header.writeUInt32BE(90871,1);header[5]=1;
    header.writeUInt16BE(1,6); // big-smart archive count 1
    const group=Buffer.alloc(2);group.writeUInt16BE(groupId);
    const name=Buffer.alloc(4);name.writeInt32BE(hash);
    const crc=Buffer.alloc(4);
    const revision=Buffer.alloc(4);
    const fileCount=Buffer.from([0,1]);
    const fileId=Buffer.from([0,0]);
    const fileName=Buffer.alloc(4);
    return Buffer.concat([header,group,name,crc,revision,fileCount,fileId,fileName]);
}
function terrainBytes(){
    const bytes=[];
    for(let plane=0;plane<4;plane++)for(let x=0;x<64;x++)for(let y=0;y<64;y++){
        if(plane===0&&x===0&&y===0){
            bytes.push(0,82); // underlay 1
        }
        bytes.push(0,1,10); // explicitly fixed terrain height
    }
    return Buffer.from(bytes);
}

test("map index 5 resolves named m50_50 from actual TSPS DJB2 hash",()=>{
    const hash=djb2("m50_50");
    let expected=0;
    for(const c of "m50_50")expected=(Math.imul(expected,31)+c.charCodeAt(0))|0;
    assert.equal(hash,expected);
    const catalog=mapRegionCatalog(refTable(97,hash));
    assert.equal(catalog.revision,90871);
    assert.equal(catalog.format,7);
    assert.equal(getTerrainGroup(catalog,50,50),97);
    assert.throws(()=>getTerrainGroup(catalog,51,50),/No single-file/);
    assert.throws(()=>getTerrainGroup(catalog,-1,50),/0..255/);
    assert.equal(getTerrainGroup({names:new Map(),fileIdForGroup:new Map([[12850,0]])},50,50),12850);
});

test("reference-map parser rejects invalid file totals and trailing metadata",()=>{
    const b=refTable(97,djb2("m50_50"));
    assert.throws(()=>mapRegionCatalog(Buffer.concat([b,Buffer.from([0])])),/trailing/);
    const dup=Buffer.from(b);dup[8]=255;dup[9]=255;
    assert.throws(()=>getTerrainGroup(mapRegionCatalog(dup),50,50),/No single-file/);
});

test("terrain u16 tile decoder reads all four levels and real floor data",()=>{
    const bytes=terrainBytes();
    const region=decodeTerrainRegion(bytes,50,50);
    assert.equal(region.sourceBytes,bytes.length);
    assert.equal(region.heights.length,4096);
    assert.equal(region.heights[0],-80);
    assert.equal(region.heights[1],-80);
    assert.equal(region.underlays[0],1);
    assert.equal(region.heights.length,region.overlays.length);
    const min=Math.min(...region.heights),max=Math.max(...region.heights);
    assert.equal(min,-80);
    assert.equal(max,-80);
    assert.throws(()=>decodeTerrainRegion(bytes.subarray(0,-2),50,50),/Truncated/);
    assert.throws(()=>decodeTerrainRegion(Buffer.concat([bytes,Buffer.from([2])]),50,50),/trailing/);
});

test("OSRS base height noise is bounded and depends on world coordinates",()=>{
    const h=[baseTileHeight(100,100),baseTileHeight(123456,654321),baseTileHeight(100000,200000)];
    for(const n of h)assert.ok(Number.isInteger(n)&&n>=10&&n<=60);
    assert.ok(new Set(h).size>=2);
});

test("real height field produces correct bounded WebGL triangle geometry",()=>{
    const region=decodeTerrainRegion(terrainBytes(),50,50);
    const mesh=buildTerrainMesh(region);
    assert.equal(mesh.length,63*63*6*6);
    assert.ok(mesh.every(Number.isFinite));
    assert.deepEqual(Array.from(mesh.subarray(0,3)),[-31.5,2.5,-31.5]);
    assert.throws(()=>buildTerrainMesh({side:64,heights:new Int32Array(40)}),/Invalid/);
});

test("native client loads CRC-checked m50_50 map terrain through cache API",async()=>{
    const terrain=cacheContainer(terrainBytes());
    const groupId=97;
    const ref=refTable(groupId,djb2("m50_50"));
    ref.writeUInt32BE(crc32(terrain),14); // offset: format/rev/flags/count (8) + id(2) + name(4) = 14
    const index=cacheContainer(ref);
    const master=Buffer.alloc(6*8);
    master.writeUInt32BE(crc32(index),5*8);
    master.writeUInt32BE(90871,5*8+4);
    const masterGroup=cacheContainer(master,0);
    const native=new NativeJs5Cache({WebSocketClass:class Mock {}});
    const requests=[];
    native.fetchRawGroup=async(a,g)=>{
        requests.push(`${a}:${g}`);
        if(a===255&&g===255)return result(a,g,masterGroup);
        if(a===255&&g===5)return result(a,g,index);
        if(a===5&&g===groupId)return result(a,g,terrain);
        throw new Error("Unexpected group fetch");
    };
    const world=await loadNativeTerrain(native,50,50);
    assert.equal(world.group,97);
    assert.equal(world.heights[0],-80);
    assert.equal(world.sourceBytes,terrainBytes().length);
    assert.deepEqual(requests,["255:255","255:5","5:97"]);
    await loadNativeTerrain(native,50,50);
    assert.deepEqual(requests,["255:255","255:5","5:97"]);
});
