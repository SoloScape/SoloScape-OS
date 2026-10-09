import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeNpcSync} from "../browser/npc-sync.mjs";
import {decodeNpcType,recolourNpcPart,NativeNpcModels} from "../browser/npc-models.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";
import {NativePlayerSync} from "../browser/player-sync.mjs";
import {buildPlayerMesh} from "../browser/player-models.mjs";

function bits(...fields){
    const values=[];
    for(const [value,width] of fields){
        if(value<0||value>=2**width)throw new Error("Invalid test bit field");
        for(let i=width-1;i>=0;i--)values.push((value/2**i|0)&1);
    }
    const out=new Uint8Array(Math.ceil(values.length/8));
    for(let i=0;i<values.length;i++)out[i>>3]|=values[i]<<(7-(i&7));
    return out;
}
const concat=(...parts)=>Uint8Array.from(parts.flatMap(x=>Array.from(x)));
function spawn({index=9,id=50,dx=-2,dy=3,large=false,extended=false,spawnCycle=0}={}){
    const distance=large?8:6;
    const typeIndex=id<4096?0:id<16384?1:id<131072?2:3;
    const record=[[0,8],[index,16],[spawnCycle?1:0,1]];
    if(spawnCycle)record.push([0,2],[spawnCycle,18]);
    record.push([typeIndex,2],[id,[12,14,17,24][typeIndex]],[extended?1:0,1],
        [dx&((1<<distance)-1),distance],[6,3],[1,1],[dy&((1<<distance)-1),distance]);
    if(extended)record.push([65535,16]);
    return bits(...record);
}
test("revision-240 NPC V6 spawn, masks, walk, run, removal and atomic failure",()=>{
    const sync=new NativeNpcSync();
    sync.setOrigin(Uint8Array.of(10,12),3190,3180);
    // SAY before SEQUENCE before TRANSFORMATION in rsprot mask-writer order.
    const first=concat(spawn({extended:true}),[0x1c,84,101,115,116,0,123,0,128,0,183]);
    sync.decode(first);
    assert.equal(sync.npcs.get(9).x,3198);
    assert.equal(sync.npcs.get(9).y,3195);
    assert.equal(sync.npcs.get(9).type,55);
    assert.equal(sync.npcs.get(9).overheadText,"Test");
    assert.deepEqual(sync.npcs.get(9).sequence,{id:123,delay:0});
    const walk=bits([1,8],[1,1],[1,2],[4,3],[0,1]);
    sync.decode(walk);
    assert.equal(sync.npcs.get(9).x,3199);
    assert.equal(sync.npcs.get(9).moveSpeed,1);
    sync.decode(bits([1,8],[1,1],[2,2],[1,1],[1,3],[4,3],[0,1]));
    assert.deepEqual([sync.npcs.get(9).x,sync.npcs.get(9).y],[3200,3196]);
    assert.equal(sync.npcs.get(9).moveSpeed,2);
    assert.throws(()=>sync.decode(bits([2,8])),/retained count/);
    assert.equal(sync.npcs.get(9).x,3200);
    sync.decode(bits([1,8],[1,1],[3,2]));
    assert.equal(sync.npcs.size,0);
    assert.deepEqual(sync.high,[]);
});
test("large NPC offsets, extended spawn clock, origin requirements and truncated bitstream",()=>{
    const sync=new NativeNpcSync();
    assert.throws(()=>sync.decode(spawn()),/before update origin/);
    assert.throws(()=>sync.setOrigin(Uint8Array.of(1),0,0),/origin/);
    sync.setOrigin(Uint8Array.of(40,40),3000,3000);
    sync.decode(spawn({index:456,id:50000,dx:-100,dy:100,large:true,spawnCycle:42}),{large:true,plane:2});
    assert.deepEqual([sync.npcs.get(456).x,sync.npcs.get(456).y,sync.npcs.get(456).plane],[2940,3140,2]);
    assert.equal(sync.npcs.get(456).spawnCycle,42);
    assert.throws(()=>sync.decode(bits([1,8],[1,1],[2,2],[1,1],[4,3],[3,3],[1,1]).subarray(0,2)),/Truncated player bits/);
    assert.equal(sync.npcs.get(456).x,2940);
    sync.reset();assert.equal(sync.origin,null);assert.equal(sync.npcs.size,0);
});
test("NPC cache definition decodes model ids, animation, scales and recolours",()=>{
    const bytes=Uint8Array.of(1,1,0,5,2,71,111,98,108,105,110,0,12,2,13,0,7,14,0,8,
        114,0,9,40,1,0,10,0,11,41,1,0,12,0,13,97,1,0,98,1,64,100,5,101,1,0);
    const d=decodeNpcType(bytes,42);
    assert.deepEqual(d.modelIds,[5]);
    assert.equal(d.name,"Goblin");assert.equal(d.size,2);
    assert.deepEqual([d.idleSeqId,d.walkSeqId,d.runSeqId],[7,8,9]);
    assert.deepEqual([d.widthScale,d.heightScale,d.ambient,d.contrast],[256,320,5,5]);
    const model={verticesCount:1,faceCount:1,verticesX:Int32Array.of(64),verticesY:Int32Array.of(128),
        verticesZ:Int32Array.of(64),faceColors:Uint16Array.of(10),faceTextures:Int16Array.of(12)};
    const part=recolourNpcPart(model,d);
    assert.deepEqual([part.verticesX[0],part.verticesY[0],part.verticesZ[0]],[128,320,128]);
    assert.deepEqual([part.faceColors[0],part.faceTextures[0]],[11,13]);
    assert.equal(model.faceColors[0],10);
    assert.throws(()=>decodeNpcType(Uint8Array.of(255,0),42),/Unsupported NPC/);
    assert.equal(decodeNpcType(Uint8Array.of(107,0),42).isInteractable,false);
});
test("authenticated NPCs share actor buffers and clear on despawn",async()=>{
    let presented,clock=1000;
    const viewport={canvas:{clientWidth:800,clientHeight:600},setActors:scene=>{presented=scene;},
        setScenery(){},setSceneLevel(){},setTerrain(){},addTextures(){},onDestination:null};
    const gameplay=new NativeGameplay({cache:{},viewport,session:{sendGame(){}},now:()=>clock});
    gameplay.origin={mapX:50,mapY:50};gameplay.rebuild={baseX:3200,baseY:3200};
    gameplay.sync=new NativePlayerSync(1);gameplay.sync.players[1]={x:3201,y:3201,plane:0,appearance:null};
    gameplay.regions.set("50,50",{mapX:50,mapY:50});
    gameplay.npcModels={mesh:async()=>({vertices:new Float32Array(18),texturedBatches:[]})};
    gameplay.handle({name:"SET_NPC_UPDATE_ORIGIN",payload:Uint8Array.of(1,1)});
    gameplay.handle({name:"NPC_INFO_SMALL_V6",payload:spawn({index:7,dx:1,dy:1})});
    await gameplay.drawActors();assert.equal(gameplay.npcDrawn,1);
    assert.equal(presented.vertices.length,18);
    assert.equal(presented.npcPickMeshes[0].index,7);
    clock+=700;
    gameplay.handle({name:"NPC_INFO_SMALL_V6",payload:bits([1,8],[1,1],[3,2])});
    await gameplay.drawActors();
    assert.equal(presented.vertices.length,0);
    gameplay.close();
});

test("map rebuild preserves retained NPC updates while terrain is loading",async()=>{
    let finishTerrain;
    const pendingTerrain=new Promise(resolve=>{finishTerrain=resolve;});
    const viewport={setActors(){},setScenery(){}};
    const game=new NativeGameplay({cache:{},viewport,session:{sendGame(){}},
        loadTerrain:()=>pendingTerrain});
    game.sync={local:{x:3201,y:3201,plane:0}};
    game.rebuild={zoneX:400,zoneY:400,baseX:3152,baseY:3152};
    game.handle({name:"SET_NPC_UPDATE_ORIGIN",payload:Uint8Array.of(49,49)});
    game.handle({name:"NPC_INFO_SMALL_V6",payload:spawn({index:7,dx:1,dy:1})});
    const retained=game.npcs.npcs.get(7);
    game.npcModels.renderedMeshes.set(7,{oldTerrain:true});
    game.rebuild={zoneX:408,zoneY:400,baseX:3216,baseY:3152};
    const loading=game.loadRebuild(game.rebuild);
    try{
        assert.equal(game.loading,true);
        assert.deepEqual(game.npcs.high,[7]);
        assert.strictEqual(game.npcs.npcs.get(7),retained);
        assert.equal(game.npcModels.renderedMeshes.size,0,"discard old terrain geometry");
        assert.equal(game.npcMotions.size,0,"discard old interpolation snapshots");
        game.handle({name:"SET_NPC_UPDATE_ORIGIN",payload:Uint8Array.of(1,49)});
        game.handle({name:"NPC_INFO_SMALL_V6",payload:bits([1,8],[1,1],[1,2],[4,3],[0,1])});
        assert.equal(game.npcs.npcs.get(7).x,retained.x+1);
        assert.equal(game.npcs.npcs.get(7).y,retained.y);
        assert.equal(game.npcMotions.size,1);
        game.handle({name:"NPC_INFO_SMALL_V6",payload:bits([1,8],[1,1],[3,2])});
        assert.equal(game.npcs.npcs.size,0,"server update still owns NPC removal");
        assert.deepEqual(game.npcs.high,[]);
        const fresh=new NativeGameplay({cache:{},viewport,session:{sendGame(){}}});
        assert.deepEqual(fresh.npcs.high,[],"new sessions never inherit retained NPCs");
        fresh.close();
    }finally{
        game.close();finishTerrain(null);await loading;
    }
});

test("NPC composition selects verified configuration group 9 and actual model IDs",async()=>{
    const reads=[],models={
        config:async(group,id,Type)=>{
            reads.push(["config",group,id]);return new Type().decode(Uint8Array.of(1,1,0,5,40,1,0,10,0,11,0));
        },
        model:async id=>{
            reads.push(["model",id]);
            return {verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,128,0),
                verticesY:Int32Array.of(0,0,128),verticesZ:Int32Array.of(0,0,0),
                indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
                faceColors:Uint16Array.of(10),faceTextures:Int16Array.of(-1)};
        },
        textures:{textures:new Map(),load:async()=>{}},animations:{pose:async m=>m}
    };
    const npcs=new NativeNpcModels(models),first=await npcs.composition(42),second=await npcs.composition(42);
    assert.strictEqual(first,second);
    assert.deepEqual(reads,[["config",9,42],["model",5]]);
    assert.equal(first.model.faceCount,1);
    assert.equal(first.model.faceColors[0],11);
});

test("stationary NPC mesh is reused only while pose, placement, orientation and region are unchanged",async()=>{
    const model={verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,128,0),
        verticesY:Int32Array.of(0,0,128),verticesZ:Int32Array.of(0,0,0),
        indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
        faceColors:Uint16Array.of(2000),faceTextures:Int16Array.of(-1)};
    let pose=model;
    const models={textures:{textures:new Map()},
        animations:{pose:async()=>pose}};
    const npcs=new NativeNpcModels(models);
    npcs.composition=async()=>({model,definition:{size:1,idleSeqId:50,
        walkSeqId:51,runSeqId:-1,ambient:0,contrast:0}});
    const ground={mapX:50,mapY:50,side:64,heights:new Int32Array(4096),
        renderFlags:new Uint8Array(4096)};
    const npc={index:7,type:100,x:3201,y:3201,plane:0,orientation:0,moving:false};
    const first=await npcs.mesh(npc,ground);
    const same=await npcs.mesh({...npc},ground);
    assert.strictEqual(same,first,"same animation and world location skip expensive mesh build");
    assert.notStrictEqual(await npcs.mesh({...npc,x:3201.3},ground),first);
    const revisited=await npcs.mesh({...npc},ground);
    assert.notStrictEqual(revisited,first,"different position invalidates last cached entry");
    const turned=await npcs.mesh({...npc,orientation:512},ground);
    assert.notStrictEqual(turned,revisited,"turning changes the model mesh");
    pose={...model,verticesX:Int32Array.of(0,100,0)};
    const differentPose=await npcs.mesh({...npc,orientation:512},ground);
    assert.notStrictEqual(differentPose,turned,"new animation frame invalidates model cache");
    const changedRegion={...ground,heights:ground.heights.slice()};
    assert.notStrictEqual(await npcs.mesh({...npc,orientation:512},changedRegion),differentPose,
        "region rebuild must not reuse old ground geometry");
});

test("moving NPC base triangulation is reused within a tile while height and position still change",()=>{
    const t={mapX:50,mapY:50,side:64,heights:new Int32Array(4096),
        renderFlags:new Uint8Array(4096)},textures=new Map();
    for(let x=0;x<64;x++)for(let y=0;y<64;y++)t.heights[x*64+y]=x*23+y*11;
    let faceReads=0;
    const m={verticesCount:3,verticesX:Int32Array.of(0,128,0),
        verticesY:Int32Array.of(0,0,-128),verticesZ:Int32Array.of(0,0,128),
        indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
        faceColors:Uint16Array.of(2000),faceTextures:Int16Array.of(-1)};
    Object.defineProperty(m,"faceCount",{enumerable:true,get(){faceReads++;return 1;}});
    const player={x:3210.04,y:3210.14,plane:0,orientation:192};
    const first=buildPlayerMesh(m,t,player,{textures});
    const afterFirst=faceReads;
    assert.ok(afterFirst>0);
    const moved=buildPlayerMesh(m,t,{...player,x:3210.35,y:3210.48},{textures});
    assert.equal(faceReads,afterFirst,
        "same pose, facing and terrain tile reuse expensive normal/face work");
    assert.notStrictEqual(first.vertices,moved.vertices,
        "old and new GPU/pick snapshots must never share mutable vertices");
    assert.notEqual(first.vertices[0],moved.vertices[0]);
    assert.notEqual(first.vertices[1],moved.vertices[1],"ground interpolation follows movement");
    const reference=buildPlayerMesh({...m,faceCount:1},t,{...player,x:3210.35,y:3210.48},{textures});
    assert.deepEqual([...moved.vertices],[...reference.vertices],
        "cached tile geometry must equal an uncached fresh model");
    assert.deepEqual([...first.vertices],[...buildPlayerMesh({...m,faceCount:1},t,player,{textures}).vertices],
        "subsequent movement never corrupts earlier snapshots");
    buildPlayerMesh(m,t,{...player,x:3211.04},{textures});
    assert.ok(faceReads>afterFirst,"moving to another tile rebuilds terrain-dependent geometry");
    const afterTile=faceReads;
    buildPlayerMesh(m,t,{...player,orientation:512},{textures});
    assert.ok(faceReads>afterTile,"facing changes invalidate the mesh template");
});
