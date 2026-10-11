import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeTspsPlayerController,CLIENT_TICK_MS} from "../browser/tsps-game-controller.mjs";
import {PlayerEcs} from "../browser/tsps-runtime/game-ecs-PlayerEcs.mjs";
import {PlayerMovementSync} from "../browser/tsps-runtime/game-movement-PlayerMovementSync.mjs";
import {PlayerAnimController} from "../browser/tsps-runtime/game-PlayerAnimController.mjs";
import {decodePlayerSequence} from "../browser/player-animation.mjs";

const player=(x=3200,y=3200,extra={})=>({x,y,plane:0,orientation:0,moveSpeed:1,...extra});
const animations={sequence:async()=>({
    frameIds:[100,101,102],frameLengths:[2,2,2],frameStep:3,
    maxLoops:99,forcedPriority:5,replyMode:1,looping:true,
})};

test("native controller instantiates the pinned TSPS movement and action engines",()=>{
    const controller=new NativeTspsPlayerController(animations,()=>0);
    assert.ok(controller.ecs instanceof PlayerEcs);
    assert.ok(controller.movement instanceof PlayerMovementSync);
    assert.ok(controller.anim instanceof PlayerAnimController);
    assert.equal(CLIENT_TICK_MS,20);
});

test("20 ms fixed simulation advances independently of render frames",()=>{
    let time=1000;
    const ctrl=new NativeTspsPlayerController(animations,()=>time);
    ctrl.accept(1,player(3200,3200));
    ctrl.accept(1,player(3201,3200));
    const start=ctrl.sample(1).x;
    time=1019;assert.equal(ctrl.advance(time),0);
    assert.equal(ctrl.sample(1).x,start);
    time=1020;assert.equal(ctrl.advance(time),1);
    assert.ok(ctrl.sample(1).x>start);
    time=1059;assert.equal(ctrl.advance(time),1);
    assert.equal(ctrl.ecs.getClientCycle(),2);
    time=1060;assert.equal(ctrl.advance(time),1);
    assert.equal(ctrl.ecs.getClientCycle(),3);
});

test("rotation tracks the TSPS per-tick target, not the immediate packet angle",()=>{
    let time=0;
    const ctrl=new NativeTspsPlayerController(animations,()=>time);
    ctrl.accept(1,player(3200,3200,{orientation:0}));
    ctrl.accept(1,player(3201,3200,{orientation:1536}));
    assert.equal(ctrl.sample(1).orientation,0);
    time=20;ctrl.advance(time);
    assert.notEqual(ctrl.sample(1).orientation,0);
    assert.notEqual(ctrl.sample(1).orientation,1536);
    time=500;ctrl.advance(time);
    assert.equal(ctrl.sample(1).orientation,1536);
});

test("new server steps join active movement without replacing the visual endpoint",()=>{
    let time=0;
    const ctrl=new NativeTspsPlayerController(animations,()=>time);
    ctrl.accept(1,player(3200,3200,{orientation:1536}));
    ctrl.accept(1,player(3201,3200));
    time=300;ctrl.advance(time);
    const atFirst=ctrl.sample(1).x;
    assert.ok(atFirst>3200&&atFirst<3201);
    ctrl.accept(1,player(3202,3200));
    assert.equal(ctrl.sample(1).x,atFirst);
    time=600;ctrl.advance(time);
    const atSecond=ctrl.sample(1).x;
    assert.ok(atSecond>atFirst&&atSecond<3202);
    time=2000;ctrl.advance(time);
    assert.equal(ctrl.sample(1).x,3202);
    assert.equal(ctrl.sample(1).moving,false);
});

test("teleport and plane change clear all queued movement",()=>{
    let time=0;
    const ctrl=new NativeTspsPlayerController(animations,()=>time);
    ctrl.accept(1,player(3200,3200));
    ctrl.accept(1,player(3201,3201));
    time=120;ctrl.advance(time);
    ctrl.accept(1,player(4000,4000,{plane:2,teleported:true}));
    assert.equal(ctrl.sample(1).x,4000);
    assert.equal(ctrl.sample(1).y,4000);
    assert.equal(ctrl.sample(1).plane,2);
    time=400;ctrl.advance(time);
    assert.equal(ctrl.sample(1).x,4000);
    assert.equal(ctrl.sample(1).moving,false);
});

test("the pinned animation controller advances cache-derived action frames per tick",async()=>{
    let time=0;
    const ctrl=new NativeTspsPlayerController(animations,()=>time);
    const p=player(3200,3200,{sequence:{id:100,delay:2},appearance:{
        animations:{idle:10,turn:11,walk:12,walkBack:13,walkLeft:14,walkRight:15,run:16},
    }});
    ctrl.accept(1,p);
    await Promise.all(ctrl.pendingSeqs.values());
    const idx=ctrl.ecs.getIndexForServerId(1);
    assert.ok(idx!==undefined);
    assert.equal(ctrl.ecs.getAnimMovementSeqId(idx),10);
    time=20;ctrl.advance(time);
    assert.equal(ctrl.anim.getSequenceState(1).delay,1);
    time=40;ctrl.advance(time);
    assert.equal(ctrl.anim.getSequenceState(1).delay,0);
    time=60;ctrl.advance(time);
    assert.equal(ctrl.anim.getSequenceState(1).frameCycle,1);
    time=120;ctrl.advance(time);
    assert.ok(ctrl.anim.getSequenceState(1).frame>=1);
    assert.equal(ctrl.sample(1).actionId,100);
});

test("revision-240 sequence flags retain priorities needed by TSPS animations",()=>{
    const seq=decodePlayerSequence(Uint8Array.of(5,8,9,1,10,2,11,1,0));
    assert.equal(seq.forcedPriority,8);
    assert.equal(seq.precedenceAnimating,1);
    assert.equal(seq.priority,2);
    assert.equal(seq.replyMode,1);
});
