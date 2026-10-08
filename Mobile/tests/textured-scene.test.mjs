import assert from "node:assert/strict";
import {test} from "node:test";
import {crc32} from "node:zlib";
import {decodeTextureDefinition,texturePixels,SceneTextures} from "../browser/texture-cache.mjs";
import {computeTextureCoords} from "../browser/texture-mapper.mjs";
import {buildObjectMesh} from "../browser/scenery-models.mjs";
import {decodeObjectDefinition} from "../browser/object-definitions.mjs";
import {buildTerrainScene} from "../browser/world-webgl.mjs";
import {decodeTerrainRegion} from "../browser/terrain-world.mjs";
import {sceneLevel,terrainPlane,validateSceneLevel} from "../browser/scene-planes.mjs";
import {NativeJs5Cache} from "../browser/native-js5.mjs";

test("revision 233+ texture definitions use the explicit simplified layout; legacy retains tint/frames",()=>{
    const def=decodeTextureDefinition(Uint8Array.from([1,194,18,28,1,3,2]),3);
    assert.deepEqual(def.spriteIds,[450]);assert.equal(def.averageHsl,4636);assert.equal(def.animationDirection,3);
    const legacy=decodeTextureDefinition(Uint8Array.from([18,28,0,1,1,194,3,128,128,128,0,0]),3,232);
    assert.equal(legacy.transforms[0],0x03808080);assert.equal(legacy.opaque,false);
    assert.throws(()=>decodeTextureDefinition(Uint8Array.from([1,194,18,28,1,3,2,0]),3),/Malformed/);
    assert.throws(()=>decodeTextureDefinition(Uint8Array.from([1,194,18,28,2,0,0]),3),/Malformed/);
});

test("texture pixels normalize sprite offsets, preserve cutouts, apply tint and client brightness",()=>{
    const frame={sheetWidth:64,sheetHeight:64,x:2,y:3,width:2,height:1,rgba:Uint8ClampedArray.from([128,128,128,255,0,0,0,0])};
    const def={id:3,transforms:[0x03ff0000],opaque:false};
    const tex=texturePixels(def,frame,1),i=(3*64+2)*4;
    assert.deepEqual([...tex.pixels.slice(i,i+8)],[127,0,0,255,0,0,0,0]);
    assert.equal(tex.pixels[3],0);assert.equal(frame.rgba[0],128);
    assert.ok(texturePixels({...def,transforms:[0]},frame).pixels[i]>128);
    assert.throws(()=>texturePixels(def,{...frame,sheetWidth:96}),/dimensions/);
});

function model(){return {verticesCount:4,faceCount:1,verticesX:Int32Array.from([0,128,0,64]),verticesY:Int32Array.from([0,0,0,0]),
    verticesZ:Int32Array.from([0,0,128,64]),indices1:Int32Array.from([0]),indices2:Int32Array.from([1]),indices3:Int32Array.from([3]),
    faceColors:Uint16Array.from([2000]),faceTextures:Int16Array.from([3]),textureCoords:Int8Array.from([0]),textureFaceCount:1,
    textureRenderTypes:Int8Array.from([0]),textureMappingP:Uint16Array.from([0]),textureMappingM:Uint16Array.from([1]),textureMappingN:Uint16Array.from([2])};}
function plane(height=0){return {heights:new Int32Array(4096).fill(height),underlays:new Uint16Array(4096),overlays:new Int16Array(4096),
    overlayShapes:new Uint8Array(4096),overlayRotations:new Uint8Array(4096),renderFlags:new Uint8Array(4096)};}
function terrain(){const data=plane();return {side:64,mapX:50,mapY:50,...data,planes:[data,plane(-240),plane(-480),plane(-720)]};}

test("mapping triangles yield non-default UVs that stay attached through mirror, scale, rotation and retexture",()=>{
    const m=model(),uv=computeTextureCoords({isSd:()=>true},m);
    assert.deepEqual([...uv].map(v=>v||0),[0,0,1,0,.5,.5]);
    const d=decodeObjectDefinition(Uint8Array.from([5,1,0,1,41,1,0,3,0,8,62,65,1,0,0]),1);
    const mesh=buildObjectMesh(terrain(),{x:2,y:2,rotation:1},d,{type:10,rotation:1,dx:0,dy:0},[m],{textures:new Map([[8,{}]])});
    assert.equal(mesh.vertices.length,0);assert.equal(mesh.omittedFaces,0);
    const batch=mesh.texturedBatches.get(8);
    assert.deepEqual([batch[4],batch[5],batch[10],batch[11],batch[16],batch[17]].map(v=>v||0),[.5,.5,1,0,0,0]);
    assert.deepEqual([...m.verticesX],[0,128,0,64]);assert.deepEqual([...m.faceTextures],[3]);
    const absent=buildObjectMesh(terrain(),{x:2,y:2,rotation:1},d,{type:10,rotation:1,dx:0,dy:0},[m]);
    assert.equal(absent.omittedFaces,1);
});

test("terrain decoding retains four physical planes, floor topology and bridge flags",()=>{
    const bytes=[];
    for(let p=0;p<4;p++)for(let i=0;i<4096;i++){
        if(i===65)bytes.push(0,82+p,0,2+p,0,1+p,...(p===1?[0,51]:[]));
        bytes.push(0,1,10+p);
    }
    const t=decodeTerrainRegion(Uint8Array.from(bytes),50,50);
    for(let p=0;p<4;p++){assert.equal(t.planes[p].underlays[65],p+1);assert.equal(t.planes[p].overlays[65],p+1);}
    assert.equal(t.planes[1].renderFlags[65],2);assert.equal(t.planes[1].heights[65],-168);
    assert.equal(t.heights,t.planes[0].heights);assert.equal(sceneLevel(t,1,1,1),0);
    assert.equal(sceneLevel(t,2,1,1),1);assert.equal(sceneLevel(t,2,2,2),2);
    assert.throws(()=>validateSceneLevel(4),/Invalid/);
});

test("bridge surfaces stay at plane-one heights above linked ground and upper planes use their own halo",()=>{
    const t=terrain(),neighbour=terrain();t.neighbours=new Map([["1,0",neighbour]]);
    for(let p=0;p<4;p++)t.planes[p].underlays[65]=1;
    t.planes[1].renderFlags[65]=2;t.floorMaterials={underlays:new Map([[0,{rgb:0x808080,textureId:-1}]]),overlays:new Map()};
    neighbour.planes[2].heights.fill(-512);
    const view=terrainPlane(t,2);assert.equal(view.neighbours.get("1,0").heights[0],-512);
    const scene=buildTerrainScene(t);assert.deepEqual(scene.levelCounts,[12,6,6,0]);
    const ys=[];for(let i=1;i<scene.vertices.length;i+=6)ys.push(scene.vertices[i]);
    assert.deepEqual([...new Set(ys)],[0,1.875,3.75,5.625]);
    t.planes[1].overlays[65]=1;t.floorMaterials.overlays.set(0,{textureId:3,rgb:0});t.textures=new Map([[3,{}]]);
    const textured=buildTerrainScene(t);assert.equal(textured.texturedBatches[0].level,0);
    assert.equal(textured.texturedBatches[0].vertices[1],1.875);
});

function container(payload){const h=Buffer.alloc(5);h.writeUInt32BE(payload.length,1);return Buffer.concat([h,payload]);}
function reference(group,payload,files){
    const head=Buffer.alloc(10);head[0]=7;head.writeUInt32BE(240,1);head.writeUInt16BE(1,6);head.writeUInt16BE(group,8);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(payload));const count=Buffer.alloc(2);count.writeUInt16BE(files.length);
    let last=0;return container(Buffer.concat([head,crc,Buffer.alloc(4),count,...files.map(id=>{const b=Buffer.alloc(2);b.writeUInt16BE(id-last);last=id;return b;})]));
}
function sprite(){
    const pixels=Buffer.alloc(4097,1);pixels[0]=0;
    const meta=Buffer.alloc(15);meta.writeUInt16BE(64,0);meta.writeUInt16BE(64,2);meta[4]=1;
    meta.writeUInt16BE(64,9);meta.writeUInt16BE(64,11);meta.writeUInt16BE(1,13);
    return Buffer.concat([pixels,Buffer.from([128,64,32]),meta]);
}
function textureCache(corrupt=false){
    const def=container(Buffer.from([0,10,18,28,1,0,0])),spr=container(sprite());
    const refs=new Map([[9,reference(0,def,[3])],[8,reference(10,spr,[0])]]),master=Buffer.alloc(10*8);
    for(const [i,ref] of refs){master.writeUInt32BE(crc32(ref),i*8);master.writeUInt32BE(240,i*8+4);}
    if(corrupt)spr[10]^=1;
    const requests=[],cache=new NativeJs5Cache({WebSocketClass:class{}});
    cache.fetchRawGroup=async(a,g)=>{requests.push(`${a}:${g}`);const data=a===255?(g===255?container(master):refs.get(g)):a===9?def:spr;
        return {archive:a,group:g,container:data,compression:0,uncompressedBytes:data.length-5};};
    return {cache,requests};
}

test("texture definitions and sprites load through native reference/group CRC checks and memoize",async()=>{
    const {cache,requests}=textureCache(),source=new SceneTextures(cache),texture=await source.load(3);
    assert.equal(texture.size,64);assert.equal(texture.pixels[3],255);assert.equal(source.errors.length,0);
    assert.equal(await source.load(3),texture);assert.equal(requests.filter(r=>r==="8:10").length,1);
    const broken=new SceneTextures(textureCache(true).cache);assert.equal(await broken.load(3),null);
    assert.match(broken.errors[0].reason,/CRC mismatch/);
});

test("Travel during sprite loading discards the texture",async()=>{
    const {cache}=textureCache();let current=true;const load=cache.loadGroup.bind(cache);
    cache.loadGroup=async(a,g)=>{const bytes=await load(a,g);if(a===8)current=false;return bytes;};
    const source=new SceneTextures(cache,{isCurrent:()=>current});assert.equal(await source.load(3),null);assert.equal(source.textures.size,0);
});
