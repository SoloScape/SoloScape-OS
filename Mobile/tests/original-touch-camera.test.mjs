import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
 attachOriginalTouchCamera,CAMERA_HOLD_MS,CAMERA_DRAG_START_PX,
 CAMERA_YAW_UNITS_PER_PIXEL,CAMERA_PITCH_UNITS_PER_PIXEL
} from "../teavm-poc/site/original-touch-camera.mjs";

function fixture({state="LOGGED_IN",resized=false,allowRotation=true}={}){
    const handlers=new Map(),timers=new Map(),turns=[],captures=[];
    let stamp=10000,serial=0,mode=state;
    const r={left:0,top:0,width:resized?920:765,height:resized?720:503};
    const canvas={
        width:r.width,height:r.height,
        getBoundingClientRect:()=>r,
        addEventListener(type,fn){const a=handlers.get("canvas:"+type)??[];a.push(fn);handlers.set("canvas:"+type,a);},
        removeEventListener(type,fn){handlers.set("canvas:"+type,(handlers.get("canvas:"+type)??[]).filter(f=>f!==fn));},
        setPointerCapture:id=>captures.push(["start",id]),
        releasePointerCapture:id=>captures.push(["end",id])
    };
    const page={
        addEventListener(type,fn){const a=handlers.get("page:"+type)??[];a.push(fn);handlers.set("page:"+type,a);},
        removeEventListener(type,fn){handlers.set("page:"+type,(handlers.get("page:"+type)??[]).filter(f=>f!==fn));}
    };
    const camera=attachOriginalTouchCamera({
        canvas,page,getGameState:()=>mode,rotateCamera:(yaw,pitch)=>{turns.push([yaw,pitch]);return allowRotation;},
        schedule:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},
        cancel:id=>timers.delete(id),now:()=>stamp
    });
    const fire=(where,type,values={})=>{
        const event={
            type,pointerType:"touch",isPrimary:true,pointerId:1,
            clientX:150,clientY:150,cancelable:true,prevented:false,stopped:false,
            preventDefault(){this.prevented=true;},
            stopImmediatePropagation(){this.stopped=true;},
            ...values
        };
        for(const fn of handlers.get(where+":"+type)??[])fn(event);
        return event;
    };
    const tick=ms=>{
        stamp+=ms;
        const batch=[...timers];
        for(const [id,{fn,ms:wait}] of batch)if(wait<=ms&&timers.has(id)){
            timers.delete(id);fn();
        }
    };
    return {camera,turns,captures,handlers,timers,fire,tick,
        setState:s=>mode=s,advance:ms=>stamp+=ms};
}
const sum=turns=>turns.reduce((tot,[x,y])=>[tot[0]+x,tot[1]+y],[0,0]);

test("quick tap and tiny drift preserve original Java walking and menus",()=>{
    const f=fixture();
    const down=f.fire("canvas","pointerdown");
    assert.equal(down.prevented,false);
    f.fire("canvas","pointermove",{clientX:158,clientY:156});
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[]);
    assert.equal(f.fire("canvas","click").stopped,false);
    assert.equal(f.timers.size,0);
});

test("fast 100px swipe turns native yaw by 400 units and stops on lift",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    const drag=f.fire("canvas","pointermove",{clientX:250});
    assert.equal(drag.prevented,true);
    assert.deepEqual(f.turns,[[100*CAMERA_YAW_UNITS_PER_PIXEL,0]]);
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[[400,0]]);
    assert.equal(f.fire("canvas","click").stopped,true);
    f.advance(601);
    assert.equal(f.fire("canvas","click").stopped,false);
    assert.deepEqual(f.captures,[["start",1],["end",1]]);
});

test("distance—not event frequency, duration or swipe velocity—determines angle",()=>{
    const fast=fixture(),slow=fixture();
    fast.fire("canvas","pointerdown");
    fast.fire("canvas","pointermove",{clientX:270,clientY:215});
    fast.fire("page","pointerup");
    slow.fire("canvas","pointerdown");
    for(let i=1;i<=30;i++){
        slow.fire("canvas","pointermove",{clientX:150+i*4,clientY:150+i*65/30});
        slow.advance(25);
    }
    slow.fire("page","pointerup");
    assert.deepEqual(sum(fast.turns),sum(slow.turns));
    assert.deepEqual(sum(fast.turns),[120*CAMERA_YAW_UNITS_PER_PIXEL,
        Math.trunc(65*CAMERA_PITCH_UNITS_PER_PIXEL)]);
});

test("slow subpixel drags accumulate fractional pitch without losing movement",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    for(let i=1;i<=30;i++)
        f.fire("canvas","pointermove",{clientX:150+i,clientY:150+i/3});
    f.fire("page","pointerup");
    const [yaw,pitch]=sum(f.turns);
    assert.equal(yaw,30*CAMERA_YAW_UNITS_PER_PIXEL);
    assert.equal(pitch,Math.trunc(10*CAMERA_PITCH_UNITS_PER_PIXEL));
});

test("long press followed by drag still controls camera",()=>{
    const f=fixture();f.fire("canvas","pointerdown");
    assert.equal([...f.timers.values()][0].ms,CAMERA_HOLD_MS);
    f.tick(CAMERA_HOLD_MS);
    const drag=f.fire("canvas","pointermove",{clientX:170,clientY:170});
    assert.equal(drag.prevented,true);
    assert.deepEqual(f.turns,[[80,35]]);
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[[80,35]]);
});

test("opposite drags cancel, no inertia or post-lift synthetic key states",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    f.fire("canvas","pointermove",{clientX:220,clientY:190});
    f.fire("canvas","pointermove",{clientX:150,clientY:150});
    assert.deepEqual(sum(f.turns),[0,0]);
    f.fire("page","pointerup");
    const before=f.turns.length;
    f.tick(700);
    assert.equal(f.turns.length,before,"no rotation after finger is lifted");
});

test("Safari selection is blocked without capturing menu/UI touch",()=>{
    const f=fixture();
    assert.equal(f.fire("canvas","contextmenu").prevented,true);
    assert.equal(f.fire("canvas","selectstart").prevented,true);
    f.fire("canvas","pointerdown",{clientX:700,clientY:400});
    f.fire("canvas","pointermove",{clientX:770,clientY:400});
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[]);
    const r=fixture({resized:true});
    r.fire("canvas","pointerdown",{clientX:850,clientY:600});
    r.fire("canvas","pointermove",{clientX:700,clientY:600});
    assert.deepEqual(r.turns,[]);
    assert.equal(r.fire("canvas","click").stopped,false);
});

test("login, mouse input, non-primary pointers and game logout cannot rotate",()=>{
    const f=fixture({state:"LOGIN_SCREEN"});
    f.fire("canvas","pointerdown");
    f.fire("canvas","pointermove",{clientX:230});
    assert.deepEqual(f.turns,[]);
    const g=fixture();g.fire("canvas","pointerdown",{pointerType:"mouse"});
    g.fire("canvas","pointerdown",{pointerId:2,isPrimary:false});
    g.fire("canvas","pointermove",{clientX:230});
    assert.deepEqual(g.turns,[]);
    g.fire("canvas","pointerdown");
    g.fire("canvas","pointermove",{clientX:230});
    const count=g.turns.length;
    g.setState("LOGIN_SCREEN");
    g.camera.update();
    g.fire("canvas","pointermove",{clientX:260});
    assert.equal(g.turns.length,count);
    g.camera.dispose();
    assert.equal((g.handlers.get("canvas:pointerdown")??[]).length,0);
});

test("pointercancel and page blur stop drags immediately",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    f.fire("canvas","pointermove",{clientX:200});
    f.fire("page","pointercancel",{pointerId:2});
    f.fire("canvas","pointermove",{clientX:250});
    assert.equal(f.turns.length,2);
    f.fire("page","pointercancel");
    f.fire("canvas","pointermove",{clientX:310});
    assert.equal(f.turns.length,2);
    f.fire("canvas","pointerdown");
    f.fire("page","blur");
    f.fire("canvas","pointermove",{clientX:250});
    assert.equal(f.turns.length,2);
});

test("authentic Java interface implements target wrapping, pitch clamp, and in-game gating",async()=>{
    const java=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    assert.match(java,/rotateOriginalCamera\(int yawDelta,int pitchDelta\)/);
    assert.match(java,/getGameState\(\)!=net\.runelite\.api\.GameState\.LOGGED_IN/);
    assert.match(java,/getCameraYawTarget\(\)/);
    assert.match(java,/setCameraYawTarget\(target\)/);
    assert.match(java,/getCameraPitchTarget\(\)/);
    assert.match(java,/setCameraPitchTarget\(target\)/);
    assert.match(java,/Math\.max\(128,Math\.min\(383,target\)\)/);
    assert.match(java,/&2047/);
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(page,/rotateCamera:\(yaw,pitch\)=>engine\?\.rotateOriginalCamera\?\.\(yaw,pitch\)/);
    assert.doesNotMatch(page,/cameraYaw\s*=|cameraPitch\s*=/);
});
