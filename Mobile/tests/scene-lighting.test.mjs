import {test} from "node:test";
import assert from "node:assert/strict";
import {addObjectShadow,joinSceneNormals} from "../browser/scene-lighting.mjs";
import {calculateVertexLights} from "../browser/floor-lighting.mjs";
import {terrainPlane} from "../browser/scene-planes.mjs";

const terrain=(mapX=0)=>({mapX,mapY:0,side:64,heights:new Int32Array(4096).fill(-128),
    underlays:new Uint16Array(4096),lightOcclusions:new Uint8Array(4096)});
test("scenery shadow strengths, rotations, clipping and cross-map footprint feed terrain lights",()=>{
    const a=terrain(),b=terrain(1);a.neighbours=new Map([["1,0",b]]);b.neighbours=new Map([["-1,0",a]]);
    const d={sizeX:1,sizeY:1,clipped:true,seqId:-1};
    const before=calculateVertexLights(a);
    addObjectShadow(a,{x:10,y:10,rotation:0,shape:0},d);
    assert.equal(a.lightOcclusions[10*64+10],50);assert.equal(a.lightOcclusions[10*64+11],50);
    assert.ok(calculateVertexLights(a)[10*64+10]<before[10*64+10]);
    addObjectShadow(a,{x:63,y:20,rotation:0,shape:10},d,{vertices:[[128,0,0]]});
    assert.equal(a.lightOcclusions[63*64+20],30);assert.equal(b.lightOcclusions[20],30);
    addObjectShadow(a,{x:30,y:30,rotation:2,shape:1},{...d,clipped:false});
    assert.equal(a.lightOcclusions[31*64+30],0);
    addObjectShadow(a,{x:30,y:30,rotation:2,shape:1},d);
    assert.equal(a.lightOcclusions[31*64+30],50);
    addObjectShadow(a,{x:40,y:40,rotation:0,shape:10},{...d,seqId:1});
    assert.equal(a.lightOcclusions[40*64+40],15);
});

function entry(mapX,x,offset=0,plane=0){
    return {terrain:terrain(mapX),loc:{x,y:10,shape:10,rotation:0,plane},
        d:{sizeX:1,sizeY:1,mergeNormals:true,seqId:-1},part:{dx:0,dy:0},
        geometry:{vertices:[[offset,0,0],[offset,128,0],[offset,0,128]],faces:[{indices:[0,1,2]}],
            normals:[[256,0,0,1],[256,0,0,1],[256,0,0,1]]}};
}
test("joined normals use original contributions across map boundaries and hide shared faces",()=>{
    const a=entry(0,63,64),b=entry(1,0,-64),c=entry(1,1,-192);
    a.terrain.neighbours=new Map([["1,0",b.terrain]]);
    b.terrain.neighbours=new Map([["-1,0",a.terrain]]);
    c.terrain.neighbours=b.terrain.neighbours;
    joinSceneNormals([a,b,c]);
    assert.deepEqual(a.geometry.normals[0],[256,0,0,1],"bind normals are immutable");
    assert.deepEqual(b.geometry.joinedNormals[0],[768,0,0,3]);
    assert.equal(a.geometry.hiddenFaces.size,1);assert.equal(b.geometry.hiddenFaces.size,1);
    joinSceneNormals([a,b,c]);assert.deepEqual(b.geometry.joinedNormals[0],[768,0,0,3],"relighting never accumulates");
});

test("shadows persist through fresh plane views, including neighbouring regions",()=>{
    const a=terrain(),b=terrain(1);
    a.planes=[{heights:a.heights},{heights:a.heights}];b.planes=[{heights:b.heights},{heights:b.heights}];
    a.neighbours=new Map([["1,0",b]]);b.neighbours=new Map([["-1,0",a]]);
    const view=terrainPlane(a,1),d={sizeX:1,sizeY:1,clipped:true,seqId:-1};
    addObjectShadow(view,{x:63,y:20,rotation:0,shape:10},d,{vertices:[[128,0,0]]});
    assert.equal(a.planes[1].lightOcclusions[63*64+20],30);
    assert.equal(b.planes[1].lightOcclusions[20],30);
    assert.equal(a.planes[0].lightOcclusions,undefined,"physical planes retain separate shadows");
    const fresh=terrainPlane(a,1);
    assert.equal(fresh.lightOcclusions[63*64+20],30);
    assert.equal(fresh.neighbours.get("1,0").lightOcclusions[20],30);
});

test("joining rejects missing footprint heights instead of inventing zero elevation",()=>{
    const a=entry(0,63,64);
    assert.throws(()=>joinSceneNormals([a]),/footprint lacks terrain heights/);
});
test("next-plane normals join without hiding triangles and nonmerge models retain their own lighting",()=>{
    const a=entry(0,10),b=entry(0,10,0,1),c=entry(0,11,-128);c.d.mergeNormals=false;
    joinSceneNormals([a,b,c]);assert.equal(a.geometry.hiddenFaces.size,0);
    assert.deepEqual(a.geometry.joinedNormals[0],[512,0,0,2]);assert.equal(c.geometry.joinedNormals,undefined);
});

test("upper-plane large locations join across bucket boundaries away from their anchor",()=>{
    const lower=entry(0,16),upper=entry(0,0,832,1);upper.d.sizeX=20;
    // lower centre = 16*128+64; upper centre = 20*64 plus 832.
    joinSceneNormals([lower,upper]);
    assert.deepEqual(lower.geometry.joinedNormals[0],[512,0,0,2]);
    assert.equal(lower.geometry.hiddenFaces.size,0);
});
