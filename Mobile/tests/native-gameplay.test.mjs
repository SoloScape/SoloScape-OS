import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeGameplay,translateActorMesh,actorMeshInterval,visibleNpcMotions,interpolatePlayer,rebuildRegions} from "../browser/native-gameplay.mjs";
import {decodeRebuild,encodeMoveDestination,encodeWindowStatus,WINDOW_STATUS} from "../browser/player-protocol.mjs";
import {NativePlayerSync} from "../browser/player-sync.mjs";
import {NativeTspsPlayerController} from "../browser/tsps-game-controller.mjs";
import {NativePlayerAnimations} from "../browser/player-animation.mjs";

const terrain=(mapX,mapY)=>({mapX,mapY,side:64,heights:new Int32Array(4096),underlays:new Uint8Array(4096),overlays:new Uint8Array(4096),
    overlayShapes:new Uint8Array(4096),overlayRotations:new Uint8Array(4096),planes:Array.from({length:4},()=>({heights:new Int32Array(4096),renderFlags:new Uint8Array(4096)}))});
const viewport=()=>({canvas:{clientWidth:765,clientHeight:503},visibleLevel:0,onDestination:null,setActors(){},setScenery(){},setTerrain(){},setSceneLevel(){},addTextures(){}});

test("player and loaded NPCs keep drawing during missing walk frames and new NPC downloads",async()=>{
    let clock=1000,resolveFrame,resolveNpc;
    const pendingFrame=new Promise(resolve=>{resolveFrame=resolve;});
    const pendingNpc=new Promise(resolve=>{resolveNpc=resolve;});
    const animations=new NativePlayerAnimations({});
    const sequence=Promise.resolve({frameIds:[1],frameLengths:[2],skeletalId:-1});
    animations.sequence=()=>sequence;animations.frame=()=>pendingFrame;
    const model={verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,128,0),
        verticesY:Int32Array.of(0,0,128),verticesZ:Int32Array.of(0,0,0),
        indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),faceColors:Uint16Array.of(2000)};
    const models={composition:async()=>model,textures:{textures:new Map()},animations};
    const uploads=[],vp={...viewport(),setActors:scene=>{if(scene)uploads.push(scene);}};
    const game=new NativeGameplay({cache:{},viewport:vp,models,session:{sendGame(){}},now:()=>clock});
    try{
        game.authenticated({playerIndex:1});
        game.origin={mapX:50,mapY:50};game.regions.set("50,50",terrain(50,50));
        game.scenePrepared=true;game.loading=false;game.ready=true;
        const local={x:3201,y:3201,plane:0,orientation:0,appearance:{hidden:false,animations:{idle:10,walk:10}}};
        game.sync.players[1]=local;game.updateMotion(local);
        const loaded=Promise.resolve({model,definition:{size:1,ambient:0,contrast:0,idleSeqId:10,walkSeqId:10}});
        game.npcModels.composition=id=>id===1?loaded:pendingNpc;
        for(const [index,type] of [[5,1],[6,2]])game.npcMotions.set(index,{
            from:{x:3202,y:3202},target:{x:3203,y:3202,plane:0,index,type,moveSpeed:1},
            started:1000,animationStarted:1000,sequenceStarted:1000});
        await game.drawActors();await game.drawActors();
        assert.equal(game.drawing,false);assert.equal(game.npcDrawn,1);assert.equal(game.npcMissing,1);
        const before=uploads.at(-1),playerX=before.vertices[0],npcX=before.npcPickMeshes[0].vertices[0];
        game.updateMotion({...local,x:3202,moving:true,moveSpeed:1});
        clock=1320;game.playerController.advance(clock);await game.drawActors();
        const after=uploads.at(-1);
        assert.ok(after.vertices[0]>playerX,"player movement uploads while the walk frame is pending");
        assert.ok(after.npcPickMeshes[0].vertices[0]>npcX,"loaded NPC movement uploads while another NPC is pending");
        assert.equal(game.drawing,false);
        resolveNpc(await loaded);await Promise.resolve();await game.drawActors();
        assert.equal(game.npcDrawn,2,"streamed NPC joins subsequent actor frames");
    }finally{resolveFrame(null);resolveNpc(null);game.close();}
});

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

test("identical server action snapshots do not restart TSPS action frames",async()=>{
    let now=0;
    const cache={sequence:async()=>({frameIds:[0,1,2],frameLengths:[3,3,3],frameStep:3,maxLoops:99})};
    const controller=new NativeTspsPlayerController(cache,()=>now);
    const player={x:100,y:200,plane:0,moveSpeed:1,sequence:{id:123,delay:0}};
    controller.accept(1,player);
    await Promise.all(controller.pendingSeqs.values());
    now=100;controller.advance(now);
    const before={...controller.anim.getSequenceState(1)};
    controller.accept(1,{...player,sequence:{...player.sequence}});
    assert.deepEqual(controller.anim.getSequenceState(1),before);
    controller.accept(1,{...player,sequence:{id:124,delay:0},sequenceUpdated:true});
    assert.equal(controller.anim.getSequenceState(1)?.seqId,124);
    assert.equal(controller.anim.getSequenceState(1)?.frame,0);
});

test("run traversals stay in the TSPS queue after a stationary packet",()=>{
    let now=0;
    const controller=new NativeTspsPlayerController({sequence:async()=>({})},()=>now);
    const player={x:100,y:200,plane:0,moveSpeed:1,orientation:1536};
    controller.accept(1,player);
    controller.accept(1,{...player,x:102,runStep:true,temporaryMoveSpeed:2});
    now=320;controller.advance(now);
    const mid=controller.sample(1);
    assert.ok(mid.x>100&&mid.x<102);
    controller.accept(1,{...player,x:102,temporaryMoveSpeed:null});
    now=640;controller.advance(now);
    assert.ok(controller.sample(1).x>mid.x);
    assert.equal(controller.ecs.isRunVisual(0),true);
});

test("successive 600 ms GPI updates extend the server movement queue",()=>{
    let now=0;
    const controller=new NativeTspsPlayerController({sequence:async()=>({})},()=>now);
    const player={x:100,y:200,plane:0,moveSpeed:1,orientation:1536};
    controller.accept(1,player);
    for(let step=1;step<=35;step++){
        controller.accept(1,{...player,x:100+step,moving:true});
        now+=600;controller.advance(now);
        const visible=controller.sample(1);
        assert.ok(visible.x>100+step-1.5&&visible.x<=100+step,
            "queued step "+step+" visual x="+visible.x);
    }
});
test("normal rebuild loads around the rebuild zone even before teleport PLAYER_INFO",async()=>{
    const loaded=[],vp=viewport(),session={sendGame(op,payload){session.sent=[op,payload];}};
    let ready=false;
    const gameplay=new NativeGameplay({cache:{},viewport:vp,session,now:()=>1000,
        onRegion:()=>assert.equal(ready,false),onReady:()=>{assert.equal(gameplay.loading,false);assert.equal(session.sent[0],27);ready=true;},
        loadTerrain:async(_cache,mapX,mapY)=>{loaded.push([mapX,mapY]);return terrain(mapX,mapY);},
        loadMaterials:async()=>({underlays:new Map(),overlays:new Map()}),loadScenery:async()=>({vertices:new Float32Array(),levelCounts:[0,0,0,0],texturedBatches:[],errors:[]})});
    const sync=new NativePlayerSync(1);sync.initialized=true;sync.players[1]={x:100,y:100,plane:0,appearance:null,moving:false};gameplay.sync=sync;
    await gameplay.loadRebuild({zoneX:400,zoneY:400});
    assert.ok(loaded.some(([x,y])=>x===50&&y===50));
    assert.equal(session.sent[0],27);
    assert.equal(ready,false,"world readiness waits for verified local appearance");
    assert.equal(gameplay.scenePrepared,true);
    assert.equal(gameplay.maybeReady(),false);
    sync.players[1].appearance={};gameplay.modelReady=true;
    assert.equal(gameplay.maybeReady(),true);
    assert.equal(ready,true);
    gameplay.close();
});

test("login acknowledges verified terrain but waits for floor and scenery before scene readiness",async()=>{
    let finishFloor,seenScenery=0,ready=false,ack=false;
    const floorWait=new Promise(resolve=>{finishFloor=resolve;});
    const vp=viewport(),session={sendGame(op){if(op===27)ack=true;}};
    const game=new NativeGameplay({cache:{},viewport:vp,session,now:()=>1000,
        onReady:()=>{ready=true;},loadTerrain:async(_c,x,y)=>terrain(x,y),
        loadMaterials:()=>floorWait,
        loadScenery:async()=>{seenScenery++;return {vertices:new Float32Array(),levelCounts:[0,0,0,0],texturedBatches:[],errors:[]};}});
    const sync=new NativePlayerSync(1);sync.initialized=true;
    sync.players[1]={x:3200,y:3200,plane:0,appearance:null};
    game.sync=sync;
    const pending=game.loadRebuild({zoneX:400,zoneY:400});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(ack,true,"send map-complete when verified terrain is received");
    assert.equal(ready,false,"scene is not ready with floor material still pending");
    assert.equal(game.loading,true);
    assert.equal(seenScenery,0);
    finishFloor({underlays:new Map(),overlays:new Map()});
    await pending;
    assert.ok(seenScenery>0,"verified scenery is attempted before visible readiness");
    assert.equal(game.scenePrepared,true);
    assert.equal(ready,false,"player has no rendered appearance");
    sync.players[1].appearance={};game.modelReady=true;
    assert.equal(game.maybeReady(),true);
    assert.equal(ready,true);
    game.close();
});

test("obsolete optional world loads never paint after disconnect",async()=>{
    let finishFloor,painted=0;
    const floorWait=new Promise(resolve=>{finishFloor=resolve;});
    const vp={...viewport(),setTerrain(){painted++;}};
    const game=new NativeGameplay({cache:{},viewport:vp,session:{sendGame(){}},now:()=>1000,
        loadTerrain:async(_c,x,y)=>terrain(x,y),loadMaterials:()=>floorWait,
        loadScenery:async()=>{throw new Error("stale scenery should not run");}});
    const sync=new NativePlayerSync(1);sync.initialized=true;
    sync.players[1]={x:3200,y:3200,plane:0,appearance:null};game.sync=sync;
    const pending=game.loadRebuild({zoneX:400,zoneY:400});
    await new Promise(resolve=>setImmediate(resolve));
    const before=painted;
    game.close();
    finishFloor({underlays:new Map(),overlays:new Map()});
    await pending;
    assert.equal(painted,before);
});

test("missing verified floor texture fails scene readiness instead of rendering holes",async()=>{
    let ready=false,ack=false,sceneryCalls=0;
    const game=new NativeGameplay({cache:{},viewport:viewport(),
        session:{sendGame(op){if(op===27)ack=true;}},onReady:()=>{ready=true;},
        loadTerrain:async(_c,x,y)=>terrain(x,y),
        loadMaterials:async()=>({underlays:new Map([[0,{textureId:91}]]),overlays:new Map()}),
        loadScenery:async()=>{sceneryCalls++;return null;}});
    const sync=new NativePlayerSync(1);sync.initialized=true;
    sync.players[1]={x:3200,y:3200,plane:0,appearance:null};game.sync=sync;
    try{
        await assert.rejects(game.loadRebuild({zoneX:400,zoneY:400}),
            /Missing required floor textures: 91/);
        assert.equal(ack,true,"terrain acknowledgement is separate from scene readiness");
        assert.equal(ready,false);
        assert.equal(game.scenePrepared,false);
        assert.equal(sceneryCalls,0,"do not publish scenery over incomplete floor textures");
    }finally{game.close();}
});

test("missing spawn-region scenery cannot advertise a playable map",async()=>{
    let ready=false;
    const game=new NativeGameplay({cache:{},viewport:viewport(),
        session:{sendGame(){}},onReady:()=>{ready=true;},
        loadTerrain:async(_c,x,y)=>terrain(x,y),
        loadMaterials:async()=>({underlays:new Map(),overlays:new Map()}),
        loadScenery:async()=>null});
    const sync=new NativePlayerSync(1);sync.initialized=true;
    sync.players[1]={x:3200,y:3200,plane:0,appearance:null};game.sync=sync;
    try{
        await assert.rejects(game.loadRebuild({zoneX:400,zoneY:400}),
            /Spawn-region scenery did not produce a scene/);
        assert.equal(ready,false);
        assert.equal(game.scenePrepared,false);
    }finally{game.close();}
});

test("world readiness requires scene, appearance and a successfully uploaded local player",()=>{
    let called=0;
    const game=new NativeGameplay({cache:{},viewport:viewport(),
        session:{sendGame(){}},onReady:()=>{called++;}});
    const sync=new NativePlayerSync(1);sync.initialized=true;
    sync.players[1]={x:3200,y:3200,plane:0,appearance:{hidden:false}};
    game.sync=sync;
    try{
        assert.equal(game.maybeReady(),false,"scene has not completed");
        game.scenePrepared=true;game.loading=false;
        assert.equal(game.maybeReady(),false,"scene alone is not enough");
        game.renderError="model fetch failed";
        assert.equal(game.maybeReady(),false,"model failure cannot dismiss loading overlay");
        game.renderError=null;game.modelReady=true;
        assert.equal(game.maybeReady(),true);
        assert.equal(game.maybeReady(),false,"onReady must fire only once");
        assert.equal(called,1);
    }finally{game.close();}
});

test("the local character is uploaded and becomes ready even if its idle sequence is unavailable",async()=>{
    let ready=0,uploaded=0;
    const vp={...viewport(),setActors(scene){if(scene?.vertices.length)uploaded++;}};
    const model={verticesCount:3,faceCount:1,
        verticesX:Int32Array.of(0,128,0),verticesY:Int32Array.of(0,0,128),
        verticesZ:Int32Array.of(0,0,0),indices1:Int32Array.of(0),
        indices2:Int32Array.of(1),indices3:Int32Array.of(2),
        faceColors:Uint16Array.of(2000)};
    const models={composition:async()=>model,textures:{textures:new Map()},
        animations:{sequence:async()=>({frameIds:[0],frameLengths:[1]}),
            poseFrame:async()=>{throw new Error("unsupported skeletal sequence");}}};
    const game=new NativeGameplay({cache:{},viewport:vp,models,
        session:{sendGame(){}},now:()=>1000,onReady:()=>{ready++;}});
    try{
        game.authenticated({playerIndex:1});
        game.origin={mapX:50,mapY:50};game.regions.set("50,50",terrain(50,50));
        game.scenePrepared=true;game.loading=false;
        const local={x:3201,y:3201,plane:0,orientation:0,
            appearance:{hidden:false,animations:{idle:10}}};
        game.sync.players[1]=local;game.updateMotion(local);
        await game.drawActors();
        assert.ok(uploaded>=1,JSON.stringify({renderError:game.renderError,modelReady:game.modelReady,player:game.playerController.sample(1)}));
        assert.equal(ready,1);
        assert.equal(game.modelReady,true);
        assert.equal(game.animationRenderError,"unsupported skeletal sequence");
    }finally{game.close();}
});

test("authenticated player becomes playable before optional NPC cache requests complete",async()=>{
    let ready=0,resolveNpc,uploaded=0;
    const npcBarrier=new Promise(resolve=>{resolveNpc=resolve;});
    const vp={...viewport(),setActors(scene){if(scene?.vertices.length)uploaded++;}};
    const model={verticesCount:3,faceCount:1,
        verticesX:Int32Array.of(0,128,0),verticesY:Int32Array.of(0,0,128),
        verticesZ:Int32Array.of(0,0,0),indices1:Int32Array.of(0),
        indices2:Int32Array.of(1),indices3:Int32Array.of(2),
        faceColors:Uint16Array.of(2000)};
    const models={composition:async()=>model,textures:{textures:new Map()},
        animations:{sequence:async()=>({frameIds:[0],frameLengths:[1]}),
            poseFrame:async()=>model}};
    const game=new NativeGameplay({cache:{},viewport:vp,models,
        session:{sendGame(){}},now:()=>1000,onReady:()=>{ready++;}});
    try{
        game.authenticated({playerIndex:1});
        game.origin={mapX:50,mapY:50};game.regions.set("50,50",terrain(50,50));
        game.scenePrepared=true;game.loading=false;
        const local={x:3201,y:3201,plane:0,orientation:0,
            appearance:{hidden:false,animations:{idle:10}}};
        game.sync.players[1]=local;game.updateMotion(local);
        game.npcMotions.set(5,{from:{x:3202,y:3202},
            target:{x:3202,y:3202,plane:0,index:5,type:1},
            started:1000,animationStarted:1000,sequenceStarted:1000});
        let npcStarted=false;
        game.npcModels.mesh=async()=>{
            npcStarted=true;await npcBarrier;
            return {vertices:new Float32Array(18),texturedBatches:[]};
        };
        const pending=game.drawActors();
        await new Promise(resolve=>setImmediate(resolve));
        assert.equal(npcStarted,true,"the NPC fetch has been scheduled");
        assert.equal(ready,1,"the fully rendered player must unlock first-playable without the NPC");
        assert.ok(uploaded>=1,"the local player was uploaded to WebGL before onReady");
        assert.equal(game.drawing,true,"NPCs continue loading asynchronously");
        resolveNpc();
        await pending;
        assert.equal(ready,1,"NPC completion must not fire onReady twice");
        assert.equal(game.npcDrawn,1);
        assert.ok(uploaded>=2,"NPC assets are added to the actor buffer later");
    }finally{resolveNpc();game.close();}
});

test("landscape resize reports true mobile CSS viewport dimensions once per size",()=>{
    const vp=viewport(),sent=[];
    const session={sendGame:(opcode,payload)=>sent.push([opcode,[...payload]])};
    const game=new NativeGameplay({cache:{},viewport:vp,session});
    try{
        game.authenticated({playerIndex:5});
        assert.deepEqual(sent,[[WINDOW_STATUS,[2,2,253,1,247]]]);
        vp.canvas.clientWidth=748;vp.canvas.clientHeight=352;
        game.updateWindowStatus();
        game.updateWindowStatus();
        assert.equal(sent.length,2,"visualViewport and window resize must not duplicate packets");
        assert.deepEqual(sent[1],[WINDOW_STATUS,[2,2,236,1,96]]);
        vp.canvas.clientWidth=0;
        game.updateWindowStatus();
        assert.equal(sent.length,2,"hidden or transient zero-size viewport must not overwrite server size");
        vp.canvas.clientWidth=748;vp.canvas.clientHeight=352;
        game.updateWindowStatus();
        assert.equal(sent.length,2,"unchanged viewport must not transmit again");
        vp.canvas.clientWidth=390;vp.canvas.clientHeight=844;
        game.updateWindowStatus();
        assert.deepEqual(sent.at(-1),[WINDOW_STATUS,[2,1,134,3,76]]);
    }finally{
        game.close();
    }
    game.updateWindowStatus();
    assert.equal(sent.length,3,"closed session cannot send resize packets");
});

test("mobile actor mesh upload schedule is ~20Hz while desktop stays unchanged",()=>{
    assert.equal(actorMeshInterval(true),50);
    assert.equal(actorMeshInterval(false),20);
    assert.equal(actorMeshInterval(undefined),20);
});
test("OpenOSRS-style conservative actor visibility avoids rebuilding distant NPC meshes",()=>{
    const origin={mapX:50,mapY:50};
    const center=50*64+31;
    const m=(index,x,y,plane=0)=>({target:{index,x,y,plane}});
    const actors=[
        m(1,center+3,center+4),
        m(2,center+60,center+60),
        m(3,center+27,center+27),
        m(4,center+1,center+1,1),
        m(5,center+6,center+8),
    ];
    const visible=visibleNpcMotions(actors,{x:center,y:center,plane:0},
        [-25,-25,25,25],origin);
    assert.deepEqual(visible.map(n=>n.target.index),[1,5,3]);
    assert.equal(visibleNpcMotions(actors,{x:center,y:center,plane:0},
        [-25,-25,25,25],origin,1).length,1);
    // Fallback for headless test viewports without real camera geometry.
    assert.equal(visibleNpcMotions(actors,{x:center,y:center,plane:0},null,origin).length,4);
});

test("actor profiler separates player, NPC preparation, VBO upload and scenery",async()=>{
    let time=100,stages=null,total=null;
    const vp={...viewport(),drawBounds:()=>{time+=4;return [-25,-25,25,25];},
        setActors:()=>{time+=7;}};
    const game=new NativeGameplay({cache:{},viewport:vp,session:{},now:()=>time,
        onActorStages:result=>{stages=result;},
        onActorUpdate:ms=>{total=ms;}});
    try{
        game.origin={mapX:50,mapY:50};game.loading=false;
        game.playerController.sample=()=>{time+=3;return null;};
        await game.drawActors();
        assert.deepEqual(stages,{player:3,npc:4,upload:7,scenery:0});
        assert.equal(total,14);
        assert.equal(game.drawing,false);
    }finally{game.close();}
});

test("reusing region-local NPC meshes never applies the world offset twice",()=>{
    const local={vertices:Float32Array.of(1,2,3,4,5,6),
        texturedBatches:[{texture:7,vertices:Float32Array.of(10,11,12,13,14,15)}],
        transparentBatches:[{alpha:100,vertices:Float32Array.of(8,9,10,11,12,13)}]};
    assert.strictEqual(translateActorMesh(local,0,0),local);
    const first=translateActorMesh(local,64,-64);
    const second=translateActorMesh(local,64,-64);
    assert.notStrictEqual(first,local);
    assert.deepEqual([...first.vertices],[65,2,-61,4,5,6]);
    assert.deepEqual([...second.vertices],[65,2,-61,4,5,6]);
    assert.deepEqual([...local.vertices],[1,2,3,4,5,6]);
    assert.equal(first.texturedBatches[0].vertices[0],74);
    assert.equal(first.transparentBatches[0].vertices[2],-54);
    assert.equal(local.texturedBatches[0].vertices[0],10);
});
