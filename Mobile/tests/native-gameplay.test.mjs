import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeGameplay,interpolatePlayer,rebuildRegions} from "../browser/native-gameplay.mjs";
import {decodeRebuild,encodeMoveDestination,encodeWindowStatus} from "../browser/player-protocol.mjs";
import {NativePlayerSync} from "../browser/player-sync.mjs";

const terrain=(mapX,mapY)=>({mapX,mapY,side:64,heights:new Int32Array(4096),underlays:new Uint8Array(4096),overlays:new Uint8Array(4096),
    overlayShapes:new Uint8Array(4096),overlayRotations:new Uint8Array(4096),planes:Array.from({length:4},()=>({heights:new Int32Array(4096),renderFlags:new Uint8Array(4096)}))});
const viewport=()=>({canvas:{clientWidth:765,clientHeight:503},visibleLevel:0,onDestination:null,setActors(){},setScenery(){},setTerrain(){},setSceneLevel(){},addTextures(){}});

test("movement and window packets use revision-240 payload layouts",()=>{
    assert.deepEqual([...encodeWindowStatus(765,503)],[2,2,253,1,247]);
    assert.deepEqual([...encodeMoveDestination(3201,3199,{run:true})],[255,12,255,1,12]);
});
test("rebuild region selection follows the server's six-zone build area",()=>{
    const regions=rebuildRegions({zoneX:400,zoneY:400},{x:3200,y:3200});
    assert.ok(regions.some(({x,y})=>x===50&&y===50));
    assert.ok(regions.every(({x,y})=>x>=49&&x<=50&&y>=49&&y<=50));
});
test("interpolation moves between authoritative server positions",()=>{
    const motion={from:{x:100,y:200},target:{x:101,y:201},started:1000};
    assert.deepEqual(interpolatePlayer(motion,1000),{x:100,y:200,moving:true});
    assert.deepEqual(interpolatePlayer(motion,1320),{x:100.5,y:200.5,moving:true});
    assert.deepEqual(interpolatePlayer(motion,1640),{x:101,y:201,moving:false});
});

test("running doubles axis speed and idle packets retain locomotion until arrival",()=>{
    const motion={from:{x:100,y:200},target:{x:102,y:201,moveSpeed:2,moving:false},started:1000};
    assert.deepEqual(interpolatePlayer(motion,1320),{x:101,y:201,moveSpeed:2,moving:true});
    assert.equal(interpolatePlayer(motion,1640).moving,false);
    assert.equal(interpolatePlayer({...motion,target:{...motion.target,temporaryMoveSpeed:0}},1320).x,100.25);
});

test("copied action state in PLAYER_INFO does not restart action or locomotion clocks",()=>{
    let now=1000;
    const gameplay=new NativeGameplay({cache:{},viewport:viewport(),session:{},now:()=>now});
    const player={x:100,y:200,plane:0,moving:false,sequence:{id:123,delay:0}};
    gameplay.updateMotion(player);now=1600;
    gameplay.updateMotion({...player,sequence:{...player.sequence}});
    assert.equal(gameplay.sequenceStarted,1000);assert.equal(gameplay.animationStarted,1000);
    gameplay.updateMotion({...player,sequence:{id:124,delay:0}});
    assert.equal(gameplay.sequenceStarted,1600);
});

test("one-tick run override survives a stationary packet until the segment finishes",()=>{
    let now=0;
    const gameplay=new NativeGameplay({cache:{},viewport:viewport(),session:{},now:()=>now});
    const player={x:100,y:200,plane:0,moveSpeed:1,moving:false};
    gameplay.updateMotion(player);
    gameplay.updateMotion({...player,x:102,moving:true,temporaryMoveSpeed:2});
    now=600;gameplay.updateMotion({...player,x:102,temporaryMoveSpeed:null});
    assert.equal(interpolatePlayer(gameplay.motion,now).x,101.875);
    assert.equal(interpolatePlayer(gameplay.motion,640).moving,false);
});

test("continuous 600 ms server walking updates catch up rather than accumulate permanent lag",()=>{
    let now=0;
    const gameplay=new NativeGameplay({cache:{},viewport:viewport(),session:{},now:()=>now});
    const player={x:100,y:200,plane:0,moveSpeed:1,moving:false};
    gameplay.updateMotion(player);
    for(let step=1;step<=100;step++){
        gameplay.updateMotion({...player,x:100+step,moving:true});
        now+=600;
        const shown=interpolatePlayer(gameplay.motion,now);
        assert.ok(100+step-shown.x<1.1);
    }
});
test("normal rebuild loads around the rebuild zone even before teleport PLAYER_INFO",async()=>{
    const loaded=[],vp=viewport(),session={sendGame(op,payload){session.sent=[op,payload];}};
    let ready=false;
    const gameplay=new NativeGameplay({cache:{},viewport:vp,session,now:()=>1000,
        onRegion:()=>assert.equal(ready,false),onReady:()=>{assert.equal(gameplay.loading,false);assert.equal(session.sent[0],27);ready=true;},
        loadTerrain:async(_cache,mapX,mapY)=>{loaded.push([mapX,mapY]);return terrain(mapX,mapY);},
        loadMaterials:async()=>({underlays:new Map(),overlays:new Map()}),loadScenery:async()=>null});
    const sync=new NativePlayerSync(1);sync.initialized=true;sync.players[1]={x:100,y:100,plane:0,appearance:null,moving:false};gameplay.sync=sync;
    await gameplay.loadRebuild({zoneX:400,zoneY:400});
    assert.ok(loaded.some(([x,y])=>x===50&&y===50));
    assert.equal(session.sent[0],27);
    assert.equal(ready,true);
    gameplay.close();
});
