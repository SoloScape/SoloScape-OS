import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeSceneAnimations,sceneSequenceFrame} from "../browser/scene-animation.mjs";
import {NativeSpotEffects,decodeSpotEffect} from "../browser/spot-effects.mjs";
import {mergePlayerModels,buildPlayerMesh} from "../browser/player-models.mjs";
import {combineRegionMeshes,sortTransparentFaces,sceneCameraMatrix} from "../browser/world-webgl.mjs";
import {decodeObjectDefinition} from "../browser/object-definitions.mjs";

const model=()=>({verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,128,0),verticesY:Int32Array.of(0,0,-128),
    verticesZ:Int32Array.of(0,0,128),indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
    faceColors:Uint16Array.of(2000),vertexSkins:Int32Array.of(0,0,0)});
const terrain=()=>({mapX:50,mapY:50,side:64,heights:new Int32Array(4096),renderFlags:new Uint8Array(4096)});
const seq={frameIds:[10,11,12],frameLengths:[2,3,4],frameStep:2,skeletalId:-1};

test("finite scene sequences end, loops rewind their tail, and long suspensions stay bounded",()=>{
    assert.equal(sceneSequenceFrame(seq,0),0);
    assert.equal(sceneSequenceFrame(seq,40),0);
    assert.equal(sceneSequenceFrame(seq,60),1);
    assert.equal(sceneSequenceFrame(seq,180),2);
    assert.equal(sceneSequenceFrame(seq,200),-1);
    assert.equal(sceneSequenceFrame(seq,200,{loop:true}),0);
    assert.equal(sceneSequenceFrame(seq,200,{location:true}),1);
    assert.equal(sceneSequenceFrame(seq,340,{location:true}),1);
    assert.equal(sceneSequenceFrame(seq,1e12,{location:true})>=0,true);
    assert.throws(()=>sceneSequenceFrame({...seq,skeletalId:3},0),/skeletal/);
});

test("composition preserves per-face priority and animated alpha reaches actor meshes",()=>{
    const m=model();m.priority=9;m.faceAlphas=Int8Array.of(-128);
    const merged=mergePlayerModels([m]);assert.equal(merged.faceRenderPriorities[0],9);
    const mesh=buildPlayerMesh(merged,terrain(),{x:3210.25,y:3210.5,plane:0,orientation:512});
    assert.equal(mesh.vertices.length,0);assert.equal(mesh.transparentBatches[0].alpha,128);
    assert.equal(mesh.transparentBatches[0].vertices.length,18);
    assert.deepEqual([...m.verticesX],[0,128,0]);
    const combined=combineRegionMeshes([{scene:mesh,dx:64,dy:-64}]);
    assert.equal(combined.transparentBatches[0].vertices[0],mesh.transparentBatches[0].vertices[0]+64);
});

test("transparent faces sort across texture groups, reverse with camera and filter roofs",()=>{
    const tri=z=>Float32Array.of(-1,0,z,2000,0,0,1,0,z,2000,0,0,0,1,z,2000,0,0);
    const near={level:0,texture:3,alpha:128,vertices:tri(-2)},far={level:0,texture:-1,alpha:64,vertices:tri(2)};
    const roof={...near,level:1};
    const matrix=yaw=>sceneCameraMatrix([0,0,0],yaw,.5,12,1);
    assert.deepEqual(sortTransparentFaces([near,roof,far],matrix(0),0).map(f=>f.batch),[far,near]);
    assert.deepEqual(sortTransparentFaces([near,far],matrix(Math.PI),0).map(f=>f.batch),[near,far]);
});

test("animated scenery poses once per frame, retains world offsets and picking, and reports unsupported sequences",async()=>{
    let poses=0;
    const animations={sequence:async()=>seq,poseFrame:async(m,_id,index)=>{poses++;return {...m,verticesY:Int32Array.from(m.verticesY,y=>y-index*128)};}};
    const runtime=new NativeSceneAnimations(animations),t=terrain(),d=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    runtime.reset([{terrain:t,loc:{id:5,x:10,y:10,plane:0,rotation:0,shape:10},definition:d,
        part:{type:10,rotation:0,dx:0,dy:0},model:model(),level:0}],1000);
    const origin={mapX:49,mapY:50},player={x:3210,y:3210};
    const a=await runtime.scene(1000,origin,player,new Map());
    assert.equal(a.batches.length,1);assert.equal(a.pickMeshes[0].x,74);
    await runtime.scene(1020,origin,player,new Map());assert.equal(poses,1);
    const b=await runtime.scene(1060,origin,player,new Map());assert.equal(poses,2);
    assert.equal(b.batches[0].vertices[1],a.batches[0].vertices[1]+1);
    animations.sequence=async()=>({...seq,skeletalId:1});
    assert.equal((await runtime.scene(1200,origin,player,new Map())).batches.length,0);
    assert.match(runtime.errors[0].reason,/skeletal/);
    runtime.reset();assert.equal(runtime.entries.length,0);assert.equal(runtime.errors.length,0);
});

test("revision-240 effect definitions retain scaling, rotation, recolours and strict opcode boundaries",()=>{
    const d=decodeSpotEffect(Uint8Array.of(1,0,7,2,0,3,4,1,0,5,0,64,6,0,90,40,1,0,1,0,2,0),8);
    assert.equal(d.modelId,7);assert.equal(d.widthScale,256);assert.equal(d.heightScale,64);
    assert.equal(d.orientation,90);assert.deepEqual(d.recolors,[[1,2]]);
    assert.throws(()=>decodeSpotEffect(Uint8Array.of(1,0,7,10,0),0),/opcode 10/);
    assert.throws(()=>decodeSpotEffect(Uint8Array.of(1,0,7,0,1),0),/Malformed/);
});

test("actor effects delay, end, restart on explicit update and preserve omitted slots",async()=>{
    let loads=0;
    const m=model(),models={model:async()=>m,textures:{textures:new Map(),load:async()=>{}},
        animations:{file:async()=>{loads++;return Uint8Array.of(1,0,7,2,0,3,0);},sequence:async()=>seq,poseFrame:async()=>m}};
    const effects=new NativeSpotEffects(models),actor={x:3210,y:3210,plane:0,orientation:0};
    const update=[{slot:0,id:8,height:128,delay:2,loop:false}];
    effects.update("p",update,1000);
    assert.equal((await effects.meshes("p",actor,terrain(),1020)).length,0);assert.equal(loads,0);
    const mesh=(await effects.meshes("p",actor,terrain(),1040))[0];
    assert.equal(mesh.vertices[1],1,"effect height is above ground");
    effects.update("p",update,1100);assert.equal(effects.actors.get("p").slots.get(0).started,1040);
    assert.equal((await effects.meshes("p",actor,terrain(),1240)).length,0,"finite effect expires");
    effects.update("p",[...update],1300);assert.equal((await effects.meshes("p",actor,terrain(),1340)).length,1);
    effects.update("p",[{slot:1,id:8,height:0,delay:0,loop:true}],1340);
    assert.equal(effects.actors.get("p").slots.size,2);
    effects.update("p",[{slot:0,id:-1}],1340);assert.equal(effects.actors.get("p").slots.size,1);
    assert.equal((await effects.meshes("p",actor,terrain(),1e6)).length,1);
    assert.equal(loads,1,"effect definitions share verified cache promises");
    effects.reset();assert.equal((await effects.meshes("p",actor,terrain(),1e6)).length,0);
});

test("effect cache responses after slot replacement or disconnect cannot return obsolete meshes",async()=>{
    let resolve;
    const models={model:()=>new Promise(r=>{resolve=r;}),animations:{file:async()=>Uint8Array.of(1,0,7,0)},textures:{textures:new Map()}};
    const effects=new NativeSpotEffects(models);
    effects.update("p",[{slot:0,id:8,height:0,delay:0}],0);
    const pending=effects.meshes("p",{x:3210,y:3210,plane:0},terrain(),0);
    await new Promise(r=>setImmediate(r));effects.reset();resolve(model());
    assert.deepEqual(await pending,[]);
});
