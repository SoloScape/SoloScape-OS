import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync, crc32 } from "node:zlib";
import { Js5GroupReader, NativeJs5Cache } from "../browser/native-js5.mjs";
import { decryptLocationContainer, decodeLocations, decodeGroup } from "../browser/location-cache.mjs";
import { decodeObjectDefinition } from "../browser/object-definitions.mjs";
import { decodeModel, buildObjectMesh, placementParts, loadStaticScenery } from "../browser/scenery-models.mjs";
import { djb2 } from "../browser/terrain-world.mjs";
import { normalizeRegionKeys } from "../browser/region-keys.mjs";

function triangle(format=0){
    // Three delta-coded vertices (-64,0,-64), (64,0,-64), (0,-128,64).
    const payload=Buffer.from([5,1,7,1,64,65,65,3,0x84,0,0xc0,0x80,0,0xbf,0x80,0,0xc0,0x80]);
    const footer=Buffer.alloc(format===0?18:format===3?26:23);
    footer.writeUInt16BE(3,0);footer.writeUInt16BE(1,2);
    const lengthsAt=format===0?10:format===2?11:format===3?12:11;
    [4,2,3,3].forEach((n,i)=>footer.writeUInt16BE(n,lengthsAt+i*2));
    if(format!==0){footer[footer.length-2]=255;footer[footer.length-1]=256-format;}
    return Buffer.concat([payload,...(format===1||format===3?[Buffer.from([0])]:[]),footer]);
}
function flatTerrain(){return {side:64,heights:new Int32Array(4096).fill(-128),
    underlays:new Uint16Array(4096),overlays:new Int16Array(4096)};}

test("four OSRS model formats decode the same signed vertex deltas and face indices",()=>{
    for(let format=0;format<=3;format++){
        const bytes=triangle(format),model=decodeModel(bytes);
        assert.equal(model.version,format);
        assert.deepEqual([...model.verticesX],[-64,64,0]);
        assert.deepEqual([...model.verticesY],[0,0,-128]);
        assert.deepEqual([...model.verticesZ],[-64,-64,64]);
        assert.deepEqual([model.indices1[0],model.indices2[0],model.indices3[0]],[0,1,2]);
        assert.equal(model.faceColors[0],900);
        assert.throws(()=>decodeModel(bytes.subarray(0,15)),/length/);
    }
    const bad=triangle();bad[6]=127;
    assert.throws(()=>decodeModel(bad),/index out of bounds/);
});

test("location streams retain IDs, all planes, shapes and orientations and reject corrupt data",()=>{
    const locations=decodeLocations(Buffer.from([6,0x80,0x43,40,1,9,0,2,0xc0,0,89,0,0]));
    assert.deepEqual(locations,[{id:5,x:1,y:2,plane:0,shape:10,rotation:0},
        {id:5,x:1,y:2,plane:0,shape:2,rotation:1},
        {id:7,x:63,y:63,plane:3,shape:22,rotation:1}]);
    assert.throws(()=>decodeLocations(Buffer.from([1,1])),/Truncated/);
    assert.throws(()=>decodeLocations(Buffer.from([1,1,255,0,0])),/shape/);
    assert.throws(()=>decodeLocations(Buffer.from([0,1])),/trailing/);
    assert.throws(()=>decodeLocations(Buffer.from([1,0xc0,1,0,0,0])),/four planes/);
});

test("XTEA handles encrypted expansion header, partial tail and strict post-decryption bounds",async()=>{
    const data=Buffer.from([1,1,40,0,0]),gzip=gzipSync(data),plain=Buffer.alloc(9+gzip.length);
    plain[0]=2;plain.writeUInt32BE(gzip.length,1);plain.writeUInt32BE(data.length,5);gzip.copy(plain,9);
    const encrypted=Buffer.from(plain),key=[1,-2,3,-4],delta=0x9e3779b9;
    // Independent forward encryption of complete container blocks.
    for(let at=5;at+8<=encrypted.length;at+=8){
        let a=encrypted.readInt32BE(at),b=encrypted.readInt32BE(at+4),sum=0;
        for(let round=0;round<32;round++){
            a=(a+((((b<<4)^(b>>>5))+b)^(sum+key[sum&3])))|0;sum=(sum+delta)|0;
            b=(b+((((a<<4)^(a>>>5))+a)^(sum+key[(sum>>>11)&3])))|0;
        }
        encrypted.writeInt32BE(a,at);encrypted.writeInt32BE(b,at+4);
    }
    const copy=Buffer.from(encrypted),wire=Buffer.concat([Buffer.from([5,0,1]),encrypted]);
    const parsed=new Js5GroupReader(5,1).push(wire);
    assert.equal(parsed.uncompressedBytes,null,"Encrypted expansion header is not interpreted as plaintext");
    assert.deepEqual(Buffer.from(decryptLocationContainer(parsed.container,key)),plain);
    assert.deepEqual(Buffer.from(await decodeGroup(decryptLocationContainer(parsed.container,key))),data);
    assert.deepEqual(encrypted,copy,"Verified encrypted bytes remain immutable");
    await assert.rejects(()=>decodeGroup(decryptLocationContainer(parsed.container,[5,6,7,8])));
    assert.throws(()=>decryptLocationContainer(encrypted,[1,2]),/128-bit/);
    assert.deepEqual(decryptLocationContainer(encrypted,[0,0,0,0]),encrypted);
});

test("static object definitions decode model selection, footprint, recolour and scale strictly",()=>{
    const d=decodeObjectDefinition(Buffer.from([1,2,0,7,0,0,8,10,2,84,114,101,101,0,
        14,2,15,3,29,255,39,2,40,1,3,0x84,4,0,62,65,1,0,70,255,128,0]),42);
    assert.equal(d.name,"Tree");assert.deepEqual(d.models,[7,8]);assert.deepEqual(d.types,[0,10]);
    assert.equal(d.sizeX,2);assert.equal(d.sizeY,3);assert.equal(d.ambient,-1);assert.equal(d.contrast,50);
    assert.equal(d.isRotated,true);assert.equal(d.modelSizeX,256);assert.equal(d.offsetX,-128);
    assert.deepEqual(d.recolors,[[900,1024]]);
    assert.throws(()=>decodeObjectDefinition(Buffer.from([14]),1),/Truncated/);
    assert.throws(()=>decodeObjectDefinition(Buffer.from([255,0]),1),/opcode/);
    assert.throws(()=>decodeObjectDefinition(Buffer.from([0,0]),1),/Trailing/);
});

test("static placement uses rotated footprint centers, client units, model transforms and terrain contour",()=>{
    const terrain=flatTerrain(),d=decodeObjectDefinition(Buffer.from([5,1,0,1,14,2,15,3,0]),1);
    const model=decodeModel(triangle()),loc={x:10,y:20,shape:10,rotation:0};
    const a=buildObjectMesh(terrain,loc,d,placementParts(loc,d)[0],[model]).vertices;
    assert.deepEqual([...a.subarray(0,3)],[-21,1,-10.5]);
    assert.equal(a[13],2,"128 model units lift the top vertex exactly one tile");
    loc.rotation=1;
    const b=buildObjectMesh(terrain,loc,d,placementParts(loc,d)[0],[model]).vertices;
    assert.deepEqual([...b.subarray(0,3)],[-20.5,1,-10]);
    assert.deepEqual([...model.verticesX],[-64,64,0],"Cached model remains unmodified");
    d.contour=0;
    for(let x=0;x<64;x++)for(let y=0;y<64;y++)terrain.heights[x*64+y]=-x*128;
    const contoured=buildObjectMesh(terrain,loc,d,placementParts(loc,d)[0],[model]).vertices;
    for(let i=0;i<contoured.length;i+=6){const expected=contoured[i]+31.5+(i===12?1:0);assert.equal(contoured[i+1],expected);}
});

test("wall corners and decorations select both models with authentic rotation/displacement",()=>{
    const d=decodeObjectDefinition(Buffer.from([1,3,0,1,2,0,2,4,0,3,10,0]),1);
    const corners=placementParts({shape:2,rotation:3},d);
    assert.deepEqual(corners.map(p=>[p.type,p.rotation,p.modelIds]),[[2,7,[1]],[2,0,[1]]]);
    const decor=placementParts({shape:8,rotation:0},d,32);
    assert.deepEqual(decor.map(p=>[p.rotation,p.dx,p.dy,p.modelIds]),[[4,16,-16,[2]],[6,16,-16,[2]]]);
    assert.equal(placementParts({shape:11,rotation:0},d)[0].diagonal,true);
});

test("textured and alpha faces are explicitly omitted instead of fabricated materials",()=>{
    const terrain=flatTerrain(),d=decodeObjectDefinition(Buffer.from([5,1,0,1,0]),1),loc={x:10,y:10,shape:10,rotation:0};
    const model=decodeModel(triangle());model.faceTextures=new Int16Array([3]);
    let mesh=buildObjectMesh(terrain,loc,d,placementParts(loc,d)[0],[model]);
    assert.equal(mesh.vertices.length,0);assert.equal(mesh.omittedFaces,1);
    model.faceTextures[0]=-1;model.faceAlphas=new Int8Array([127]);
    mesh=buildObjectMesh(terrain,loc,d,placementParts(loc,d)[0],[model]);assert.equal(mesh.omittedFaces,1);
});

test("region-key configuration accepts known map-key layouts and rejects invalid words",()=>{
    assert.deepEqual(normalizeRegionKeys([{mapsquare:12850,key:[1,2,3,4]}]),{12850:[1,2,3,4]});
    assert.deepEqual(normalizeRegionKeys({12850:[0,0,0,0]}),{12850:[0,0,0,0]});
    assert.throws(()=>normalizeRegionKeys({65536:[1,2,3,4]}),/Invalid/);
    assert.throws(()=>normalizeRegionKeys({12850:[1,2,3,2**32]}),/Invalid/);
});

function plainContainer(payload){const header=Buffer.alloc(5);header.writeUInt32BE(payload.length,1);return Buffer.concat([header,payload]);}
function reference(group,bytes,files,name){
    const named=name!==undefined,head=Buffer.alloc(10);head[0]=7;head.writeUInt32BE(240,1);head[5]=named?1:0;
    head.writeUInt16BE(1,6);head.writeUInt16BE(group,8);
    const hash=Buffer.alloc(named?4:0);if(named)hash.writeInt32BE(djb2(name));
    const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(bytes));
    const count=Buffer.alloc(2);count.writeUInt16BE(files.length);
    let last=0;
    const ids=files.map(id=>{const data=Buffer.alloc(2);data.writeUInt16BE(id-last);last=id;return data;});
    return plainContainer(Buffer.concat([head,hash,checksum,Buffer.alloc(4),count,...ids,Buffer.alloc(named?files.length*4:0)]));
}
function sceneCache(corrupt=false){
    const locationBytes=Buffer.from([6,0x80,0x43,40,0,0]);
    const table=Buffer.alloc(8);table.writeInt32BE(1,0);table.writeInt32BE(locationBytes.length-1,4);
    const map=plainContainer(Buffer.concat([Buffer.from([0]),locationBytes,table,Buffer.from([1])]));
    const definition=plainContainer(Buffer.from([5,1,0,1,0])),model=plainContainer(triangle());
    const groups=new Map([["5:97",map],["2:6",definition],["7:1",model]]);
    const refs=new Map([[5,reference(97,map,[0,1],"m50_50")],[2,reference(6,definition,[5])],[7,reference(1,model,[0])]]);
    const master=Buffer.alloc(8*8);
    for(const [index,ref] of refs){master.writeUInt32BE(crc32(ref),index*8);master.writeUInt32BE(240,index*8+4);}
    if(corrupt)model[10]^=1;
    const cache=new NativeJs5Cache({WebSocketClass:class Mock {}}),requests=[];
    cache.fetchRawGroup=async(a,g)=>{
        requests.push(`${a}:${g}`);
        const container=a===255?(g===255?plainContainer(master):refs.get(g)):groups.get(`${a}:${g}`);
        if(!container)throw new Error("Unexpected scene cache request");
        return {archive:a,group:g,container,compression:0,uncompressedBytes:container.length-5};
    };
    return {cache,requests};
}

test("native scene loader renders combined terrain/location archives using verified definitions and models",async()=>{
    const {cache,requests}=sceneCache(),terrain={...flatTerrain(),mapX:50,mapY:50,group:97};
    const result=await loadStaticScenery(cache,terrain);
    assert.equal(result.rendered,1);assert.equal(result.vertices.length,18);assert.equal(result.models,1);
    assert.equal(result.errors.length,0);assert.equal(result.keyUsed,false);assert.equal(result.locationGroup,97);
    assert.deepEqual(result.placements,[{id:5,name:"null",x:1,y:2,shape:10,rotation:0}]);
    assert.equal(requests.filter(r=>r==="7:1").length,1);
    const broken=await loadStaticScenery(sceneCache(true).cache,terrain);
    assert.equal(broken.rendered,0);assert.equal(broken.vertices.length,0);
    assert.ok(broken.errors.some(e=>/CRC mismatch/.test(e.reason)));
});

test("scenery loading after Travel does not return an obsolete scene",async()=>{
    const {cache}=sceneCache();let current=true;
    const original=cache.loadGroup.bind(cache);
    cache.loadGroup=async(a,g)=>{const bytes=await original(a,g);if(a===7)current=false;return bytes;};
    const result=await loadStaticScenery(cache,{...flatTerrain(),mapX:50,mapY:50,group:97},{isCurrent:()=>current});
    assert.equal(result,null);
});
