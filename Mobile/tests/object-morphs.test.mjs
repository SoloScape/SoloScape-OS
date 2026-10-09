import {test} from "node:test";
import assert from "node:assert/strict";
import {decodeObjectDefinition} from "../browser/object-definitions.mjs";
import {resolveObjectMorph} from "../browser/object-morphs.mjs";
import {NativeSceneAnimations,sceneSequenceFrame} from "../browser/scene-animation.mjs";

test("location selectors retain varp, varbit, fallback and null transform ids",async()=>{
    const d=decodeObjectDefinition(Uint8Array.from([92,0,4,255,255,0,9,1,0,7,255,255,0]),2);
    assert.equal(d.transformVarbit,4);assert.equal(d.transformVarp,-1);
    assert.deepEqual(d.transforms,[7,65535,9]);
    const varps=new Map([[3,0]]),definitions=new Map([[7,{id:7}],[9,{id:9}]]);
    const state={varps,varbit:async()=>({base:3,start:2,end:3}),definition:async id=>definitions.get(id)};
    assert.equal((await resolveObjectMorph(d,state)).id,7);
    varps.set(3,4);assert.equal(await resolveObjectMorph(d,state),null);
    varps.set(3,12);assert.equal((await resolveObjectMorph(d,state)).id,9);
    const classic=decodeObjectDefinition(Uint8Array.from([77,255,255,0,8,0,0,7,0]),1);
    assert.equal(classic.transformVarp,8);assert.deepEqual(classic.transforms,[7,65535]);
    assert.equal(await resolveObjectMorph(classic,{...state,varps:new Map([[8,-1]])}),null);
    definitions.set(7,classic);await assert.rejects(resolveObjectMorph(classic,state),/Cyclic/);
});

test("morphs refresh geometry, actions and hidden states without losing base interaction id",async()=>{
    const terrain={mapX:50,mapY:50,side:64,heights:new Int32Array(4096).fill(-128),underlays:new Uint16Array(4096)};
    const loc={id:42,x:10,y:10,plane:0,shape:10,rotation:0};
    const definition={id:7,name:"Closed",actions:["Open"],sizeX:1,sizeY:1,seqId:-1,
        isRotated:false,modelSizeX:128,modelSizeY:128,modelSizeHeight:128,offsetX:0,offsetY:0,offsetHeight:0,
        recolors:[],retextures:[],ambient:0,contrast:0,contour:-1};
    const model={verticesCount:3,faceCount:1,verticesX:Int32Array.of(-64,64,0),
        verticesY:Int32Array.of(0,0,-128),verticesZ:Int32Array.of(-64,-64,64),
        indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),faceColors:Int32Array.of(900)};
    const part={type:10,rotation:0,dx:0,dy:0};
    let resolved=[{definition,part,model}];
    const scenes=new NativeSceneAnimations({sequence:()=>{throw new Error("Static morph should not load sequence");}});
    scenes.reset([{terrain,loc,definition,level:0,resolve:async()=>resolved}],0);
    const origin={mapX:50,mapY:50},player={x:3210,y:3210,plane:0},textures=new Map();
    const first=await scenes.scene(0,origin,player,textures);
    assert.equal(first.pickMeshes[0].id,42);assert.equal(first.pickMeshes[0].name,"Closed");
    assert.equal(await scenes.scene(20,origin,player,textures),first);
    resolved=null;assert.equal((await scenes.scene(40,origin,player,textures)).pickMeshes.length,0);
    resolved=[{definition:{...definition,id:8,name:"Open",actions:["Close"],sizeX:2},part,model}];
    const next=await scenes.scene(60,origin,player,textures);
    assert.equal(next.pickMeshes[0].name,"Open");assert.deepEqual(next.pickMeshes[0].actions,["Close"]);
    assert.notDeepEqual(next.batches[0].vertices,first.batches[0].vertices);
    assert.equal(scenes.errors.length,0);
});

test("skeletal scene sequences advance each 20ms and expire or loop their tail",()=>{
    const sequence={skeletalId:1,skeletalStart:10,skeletalEnd:15,frameStep:2};
    assert.equal(sceneSequenceFrame(sequence,80),4);
    assert.equal(sceneSequenceFrame(sequence,100),-1);
    assert.equal(sceneSequenceFrame(sequence,100,{location:true}),3);
    assert.equal(sceneSequenceFrame(sequence,120,{location:true}),4);
    assert.equal(sceneSequenceFrame(sequence,140,{location:true}),3);
    assert.equal(sceneSequenceFrame(sequence,100,{loop:true}),0);
});

test("transient morph failures retry, and reset cancels obsolete cache continuations",async()=>{
    const entry={terrain:{mapX:0,mapY:0},loc:{id:1,x:1,y:1,plane:0},definition:{sizeX:1,sizeY:1},
        resolve:async()=>{throw new Error("Asset unavailable");}};
    const scenes=new NativeSceneAnimations({}),origin={mapX:0,mapY:0},player={x:1,y:1},textures=new Map();
    scenes.reset([entry],0);await scenes.scene(0,origin,player,textures);
    assert.equal(scenes.entries[0].failed,false);
    let retries=0;scenes.entries[0].resolve=async()=>{retries++;return null;};
    await scenes.scene(500,origin,player,textures);assert.equal(retries,0);
    await scenes.scene(1000,origin,player,textures);assert.equal(retries,1);
    let finish;scenes.reset([{...entry,resolve:()=>new Promise(resolve=>{finish=resolve;})}],0);
    const obsolete=scenes.scene(0,origin,player,textures);
    scenes.reset([],0);finish(null);await obsolete;
    assert.equal(scenes.previousScene,null);assert.equal(scenes.entries.length,0);
});
