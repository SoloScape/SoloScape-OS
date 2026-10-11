import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";
import {
 attachOriginalTouchCamera,CAMERA_HOLD_MS,CAMERA_DRAG_START_PX,
 CAMERA_YAW_UNITS_PER_PIXEL,CAMERA_PITCH_UNITS_PER_PIXEL,CAMERA_PINCH_SCALE_PER_STEP
} from "../teavm-poc/site/original-touch-camera.mjs";

function fixture({state="LOGGED_IN",resized=false,allowRotation=true}={}){
    const handlers=new Map(),timers=new Map(),turns=[],captures=[],wheels=[];
    let zoomGestures=0;
    let stamp=10000,serial=0,mode=state;
    const r={left:0,top:0,width:resized?920:765,height:resized?720:503};
    const canvas={
        width:r.width,height:r.height,
        getBoundingClientRect:()=>r,
        addEventListener(type,fn){const a=handlers.get("canvas:"+type)??[];a.push(fn);handlers.set("canvas:"+type,a);},
        removeEventListener(type,fn){handlers.set("canvas:"+type,(handlers.get("canvas:"+type)??[]).filter(f=>f!==fn));},
        setPointerCapture:id=>captures.push(["start",id]),
        releasePointerCapture:id=>captures.push(["end",id]),
        dispatchEvent:event=>{
            wheels.push(event);
            for(const fn of handlers.get("canvas:"+event.type)??[])fn(event);
            return true;
        }
    };
    const page={
        addEventListener(type,fn){const a=handlers.get("page:"+type)??[];a.push(fn);handlers.set("page:"+type,a);},
        removeEventListener(type,fn){handlers.set("page:"+type,(handlers.get("page:"+type)??[]).filter(f=>f!==fn));}
    };
    const camera=attachOriginalTouchCamera({
        canvas,page,getGameState:()=>mode,rotateCamera:(yaw,pitch)=>{turns.push([yaw,pitch]);return allowRotation;},
        createWheel:options=>({type:"wheel",button:0,key:"",keyCode:0,preventDefault(){},...options}),
        onZoomGesture:()=>zoomGestures++,
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
    return {camera,canvas,turns,captures,handlers,timers,fire,tick,wheels,get zoomGestures(){return zoomGestures;},
        setState:s=>mode=s,advance:ms=>stamp+=ms};
}
const sum=turns=>turns.reduce((tot,[x,y])=>[tot[0]+x,tot[1]+y],[0,0]);

function startPinch(f){
    f.fire("canvas","pointerdown",{clientX:150,clientY:150});
    f.fire("canvas","pointerdown",{pointerId:2,isPrimary:false,clientX:250,clientY:150});
}

test("spreading fingers zooms in and closing them zooms out through original wheel input",()=>{
    const f=fixture();startPinch(f);
    assert.equal(f.timers.size,0,"pinch cancels pending rotation hold");
    assert.equal(f.zoomGestures,1);
    const spread=f.fire("canvas","pointermove",{pointerId:2,clientX:350,clientY:150});
    assert.equal(spread.prevented,true);
    assert.equal(f.wheels.length,9);
    assert.ok(f.wheels.every(e=>e.type==="wheel"&&e.deltaY===-120&&e.bubbles&&e.clientX===150&&e.clientY===150));
    f.wheels.length=0;
    f.fire("canvas","pointermove",{pointerId:2,clientX:250,clientY:150});
    assert.equal(f.wheels.length,9);
    assert.ok(f.wheels.every(e=>e.deltaY===120));
    assert.deepEqual(f.turns,[],"pinch does not rotate the camera");
});

test("pinch scale is independent of event frequency and preserves sub-step movement",()=>{
    const fast=fixture(),slow=fixture();startPinch(fast);startPinch(slow);
    const factor=CAMERA_PINCH_SCALE_PER_STEP**9.5;
    fast.fire("canvas","pointermove",{pointerId:2,clientX:150+100*factor});
    for(let i=1;i<=50;i++)slow.fire("canvas","pointermove",{
        pointerId:2,clientX:150+100*factor**(i/50)
    });
    assert.equal(fast.wheels.length,9);
    assert.equal(slow.wheels.length,fast.wheels.length);
});

test("lifting either pinch finger blocks rotation and ghost clicks until both fingers lift",()=>{
    for(const lifted of [1,2]){
        const f=fixture();startPinch(f);
        f.fire("page","pointerup",{pointerId:lifted});
        f.advance(1000);
        const other=lifted===1?2:1;
        f.fire("canvas","pointermove",{pointerId:other,clientX:400});
        assert.deepEqual(f.turns,[]);
        assert.equal(f.fire("canvas","click").stopped,true);
        f.fire("page","pointerup",{pointerId:other});
        assert.equal(f.fire("canvas","click").stopped,true);
        f.advance(601);
        assert.equal(f.fire("canvas","click").stopped,false);
        f.fire("canvas","pointerdown");
        f.fire("canvas","pointermove",{clientX:200});
        assert.deepEqual(f.turns,[[-200,0]],"next swipe works normally");
    }
});

test("pinch respects scene boundaries, logout and cancellation",()=>{
    const ui=fixture();ui.fire("canvas","pointerdown");
    ui.fire("canvas","pointerdown",{pointerId:2,isPrimary:false,clientX:700});
    ui.fire("canvas","pointermove",{pointerId:2,clientX:300});
    assert.equal(ui.wheels.length,0);
    for(const action of [f=>{f.setState("LOGIN_SCREEN");f.camera.update();},
        f=>f.fire("page","blur"),f=>f.fire("page","resize"),
        f=>f.fire("page","pointercancel",{pointerId:2}),f=>f.camera.dispose()]){
        const f=fixture();startPinch(f);action(f);
        f.fire("canvas","pointermove",{pointerId:2,clientX:400});
        assert.equal(f.wheels.length,0);
        assert.deepEqual(f.turns,[]);
    }
});

test("pinch reaches the production Java AWT wheel boundary with native zoom direction",async()=>{
    const {runInNewContext}=await import("node:vm");
    const src=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
    const script=/@JSBody\(params=\{"canvas","handler"\},script="([^"]*)"\)/.exec(src)?.[1];
    assert.ok(script);
    const f=fixture(),sent=[];
    const browser={canvas:f.canvas,handler:(...args)=>{sent.push(args);return false;},
        document:{getElementById:()=>null}};
    browser.globalThis=browser;
    runInNewContext(script,browser);
    startPinch(f);
    f.fire("canvas","pointermove",{pointerId:2,clientX:350});
    assert.equal(sent.length,9);
    assert.ok(sent.every(packet=>packet[0]===507&&packet[8]===-1));
    sent.length=0;
    f.fire("canvas","pointermove",{pointerId:2,clientX:250});
    assert.equal(sent.length,9);
    assert.ok(sent.every(packet=>packet[0]===507&&packet[8]===1));
    assert.deepEqual(f.turns,[]);
    f.camera.dispose();
});

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

test("100px right swipe reverses native yaw by 400 units and stops on lift",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    const drag=f.fire("canvas","pointermove",{clientX:250});
    assert.equal(drag.prevented,true);
    assert.deepEqual(f.turns,[[-400,0]]);
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[[-400,0]]);
    assert.equal(f.fire("canvas","click").stopped,true);
    f.advance(601);
    assert.equal(f.fire("canvas","click").stopped,false);
    assert.deepEqual(f.captures,[["start",1],["end",1]]);
});

test("vertical swipes use opposite signs for up and down without horizontal rotation",()=>{
    const down=fixture(),up=fixture();
    down.fire("canvas","pointerdown");
    down.fire("canvas","pointermove",{clientY:190});
    up.fire("canvas","pointerdown");
    up.fire("canvas","pointermove",{clientY:110});
    assert.deepEqual(down.turns,[[0,70]]);
    assert.deepEqual(up.turns,[[0,-70]]);
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
    assert.deepEqual(sum(fast.turns),[-120*CAMERA_YAW_UNITS_PER_PIXEL,
        Math.trunc(65*CAMERA_PITCH_UNITS_PER_PIXEL)]);
});

test("slow subpixel drags accumulate fractional pitch without losing movement",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    for(let i=1;i<=30;i++)
        f.fire("canvas","pointermove",{clientX:150+i,clientY:150+i/3});
    f.fire("page","pointerup");
    const [yaw,pitch]=sum(f.turns);
    assert.equal(yaw,-30*CAMERA_YAW_UNITS_PER_PIXEL);
    assert.equal(pitch,Math.trunc(10*CAMERA_PITCH_UNITS_PER_PIXEL));
});

test("long press followed by drag still controls camera",()=>{
    const f=fixture();f.fire("canvas","pointerdown");
    assert.equal([...f.timers.values()][0].ms,CAMERA_HOLD_MS);
    f.tick(CAMERA_HOLD_MS);
    const drag=f.fire("canvas","pointermove",{clientX:170,clientY:170});
    assert.equal(drag.prevented,true);
    assert.deepEqual(f.turns,[[-80,35]]);
    f.fire("page","pointerup");
    assert.deepEqual(f.turns,[[-80,35]]);
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
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(page,/rotateCamera:\(yaw,pitch\)=>engine\?\.rotateOriginalCamera\?\.\(yaw,pitch\)/);
    assert.doesNotMatch(page,/cameraYaw\s*=|cameraPitch\s*=/);
});

test("Java touch camera retains revision-240 angles through repeated swipes and native pitch limits",async t=>{
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const source=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const method=source.match(/@JSExport (public static boolean rotateOriginalCamera\(int yawDelta,int pitchDelta\) \{[\s\S]*?\n    \})/)?.[1];
    assert.ok(method,"execute the production bridge method");
    const target=mkdtempSync(join(tmpdir(),"soloscape-touch-camera-"));
    t.after(()=>rmSync(target,{recursive:true,force:true}));
    const api=join(target,"net/runelite/api");mkdirSync(api,{recursive:true});
    writeFileSync(join(api,"GameState.java"),"package net.runelite.api; public enum GameState {LOGGED_IN, LOGIN_SCREEN}");
    writeFileSync(join(api,"Client.java"),`package net.runelite.api;
public interface Client {
 GameState getGameState(); int getCameraYawTarget(); int getCameraPitchTarget();
 void setCameraYawTarget(int value); void setCameraPitchTarget(int value);
}`);
    writeFileSync(join(target,"CameraRegression.java"),`public class CameraRegression {
 static Object engine;
 ${method}
 static class Camera implements net.runelite.api.Client {
  int yaw=8000,pitch=2000;
  net.runelite.api.GameState state=net.runelite.api.GameState.LOGGED_IN;
  public net.runelite.api.GameState getGameState(){return state;}
  public int getCameraYawTarget(){return yaw;}
  public int getCameraPitchTarget(){return pitch;}
  public void setCameraYawTarget(int value){yaw=value;}
  public void setCameraPitchTarget(int value){pitch=value;}
 }
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 public static void main(String[] args){
  Camera camera=new Camera();engine=camera;
  check(rotateOriginalCamera(800,0),"first swipe accepted");
  check(camera.yaw==14400,"100px swipe must retain starting yaw and add 6400 native units");
  // A later gesture starts from the camera left by the previous swipe.
  check(rotateOriginalCamera(800,0),"second swipe accepted");
  check(camera.yaw==4416,"wrap only at a full native turn");
  rotateOriginalCamera(-800,0);
  check(camera.yaw==14400,"reverse swipe crosses zero correctly");
  rotateOriginalCamera(0,35);
  check(camera.pitch==2280,"pitch uses the same native scale");
  rotateOriginalCamera(0,8192);check(camera.pitch==3064,"upper pitch limit");
  rotateOriginalCamera(0,-8192);check(camera.pitch==1024,"lower pitch limit");
  camera.yaw=8000;camera.pitch=2000;
  rotateOriginalCamera(0,0);check(camera.yaw==8000&&camera.pitch==2000,"zero delta preserves camera");
  check(!rotateOriginalCamera(8193,0)&&camera.yaw==8000,"oversized delta rejected");
  camera.state=net.runelite.api.GameState.LOGIN_SCREEN;
  check(!rotateOriginalCamera(800,35)&&camera.yaw==8000&&camera.pitch==2000,"login camera unchanged");
 }
}`);
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const compiled=spawnSync(javac,["-d",target,join(api,"GameState.java"),join(api,"Client.java"),join(target,"CameraRegression.java")],{encoding:"utf8"});
    assert.equal(compiled.status,0,compiled.stderr||compiled.error?.message);
    const result=spawnSync(jdk.binary,["-cp",target,"CameraRegression"],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr||result.error?.message);
});
