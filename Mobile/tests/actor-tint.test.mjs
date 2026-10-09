import test from "node:test";
import assert from "node:assert/strict";
import {activeActorTint,tintActorMesh,actorTintKey} from "../browser/actor-tint.mjs";
import {buildPlayerMesh} from "../browser/player-models.mjs";
import {NativeNpcModels} from "../browser/npc-models.mjs";

const tint={start:2,end:4,hue:-1,saturation:6,lightness:80,weight:64};
const triangle=()=>Float32Array.of(0,0,0,12000.09375,0,0,1,0,0,12020.09375,0,0,0,1,0,12040.09375,0,0);
const model=()=>({verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,64,0),verticesY:Int32Array.of(0,0,-64),verticesZ:Int32Array.of(0,0,0),
    indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),faceColors:Uint16Array.of(12000)});
const terrain=()=>({mapX:0,mapY:0,plane:0,side:64,heights:new Int32Array(4096),renderFlags:new Uint8Array(4096)});

test("actor tint client-cycle interval includes start and excludes end",()=>{
    assert.equal(activeActorTint(tint,39),null);assert.equal(activeActorTint(tint,80),null);
    assert.equal(activeActorTint({...tint,weight:0},50),null);
    assert.equal(activeActorTint(tint,NaN),null);
    assert.deepEqual(activeActorTint(tint,40),{target:0xff0650,amount:64});
    assert.notEqual(actorTintKey(activeActorTint(tint,40)),actorTintKey(null));
});
test("untextured tint snapshots preserve lit HSL and priority without tinting UVs",()=>{
    const opaque=triangle(),alpha=triangle(),textured=triangle();textured[4]=0.25;textured[5]=0.75;
    const original={vertices:opaque,texturedBatches:[{texture:5,vertices:textured}],transparentBatches:[
        {texture:-1,alpha:100,vertices:alpha},{texture:5,alpha:100,vertices:textured}]};
    const tinted=tintActorMesh(original,activeActorTint(tint,40));
    assert.equal(tinted.vertices[3],opaque[3]);assert.equal(tinted.vertices[4],0xff0650);assert.equal(tinted.vertices[5],64);
    assert.equal(tinted.transparentBatches[0].vertices[4],0xff0650);
    assert.equal(tinted.texturedBatches,original.texturedBatches);
    assert.equal(tinted.transparentBatches[1],original.transparentBatches[1]);
    assert.equal(opaque[4],0);assert.equal(alpha[4],0);assert.equal(textured[4],0.25);
});
test("cached actor lighting remains untinted for other actors and after expiry",()=>{
    const base=model(),region=terrain(),actor={x:10,y:10,plane:0,orientation:0,tinting:tint,tintStartedAt:1000};
    const tinted=buildPlayerMesh(base,region,actor,{renderTime:1040});
    const expired=buildPlayerMesh(base,region,actor,{renderTime:1080});
    const other=buildPlayerMesh(base,region,{...actor,tinting:null},{renderTime:1040});
    assert.equal(tinted.vertices[4],0xff0650);assert.equal(expired.vertices[4],0);
    assert.deepEqual(expired.vertices,other.vertices);assert.equal(base.faceColors[0],12000);
});
test("stationary NPC cached meshes refresh at tint start and expiry",async()=>{
    const models=new NativeNpcModels({textures:{textures:new Map()},animations:{}}),base=model(),region=terrain();
    models.composition=async()=>({model:base,definition:{size:1,ambient:0,contrast:0,idleSeqId:-1}});
    const npc={index:0,type:1,x:10,y:10,plane:0,orientation:0,tint,tintStartedAt:1000};
    const before=await models.mesh(npc,region,{renderTime:1039}),during=await models.mesh(npc,region,{renderTime:1040});
    assert.notEqual(before,during);assert.equal(during.vertices[4],0xff0650);
    assert.equal(await models.mesh(npc,region,{renderTime:1060}),during);
    const expired=await models.mesh(npc,region,{renderTime:1080});assert.notEqual(expired,during);assert.equal(expired.vertices[4],0);
});
