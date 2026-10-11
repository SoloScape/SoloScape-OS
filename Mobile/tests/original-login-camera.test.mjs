import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalLoginCamera,INITIAL_TOUCH_CAMERA_WHEEL_STEPS} from "../teavm-poc/site/original-login-camera.mjs";
function fixture({touch=true}={}){
    const listeners=new Map(),fired=[],timers=new Map();
    let clock=0,state="LOGIN_SCREEN";
    const canvas={
        getBoundingClientRect:()=>({left:50,top:100,width:600,height:400}),
        addEventListener:(type,fn,options)=>listeners.set(type,{fn,options}),
        removeEventListener:(type,fn)=>{if(listeners.get(type)?.fn===fn)listeners.delete(type);},
        dispatchEvent:event=>{fired.push(event);return true;}
    };
    const bridge=attachOriginalLoginCamera({
        canvas,getGameState:()=>state,isTouchDevice:()=>touch,
        createWheel:options=>({...options,type:"wheel",isTrusted:false}),
        schedule:fn=>{const id=++clock;timers.set(id,fn);return id;},
        cancel:id=>timers.delete(id)
    });
    const observe=next=>{state=next;bridge.observe(state);};
    const advance=()=>{const batch=[...timers.values()];timers.clear();batch.forEach(fn=>fn());};
    return {bridge,observe,advance,fired,timers,listeners,canvas};
}
test("mobile enters real game before applying original AWT zoom through eight wheel detents",()=>{
    const f=fixture();f.observe("LOGIN_SCREEN");f.advance();
    assert.equal(f.fired.length,0);
    f.observe("LOGGED_IN");
    assert.equal(f.timers.size,1);
    f.observe("LOGGED_IN");
    assert.equal(f.timers.size,1,"only one login initialization is scheduled");
    f.advance();
    assert.equal(f.fired.length,INITIAL_TOUCH_CAMERA_WHEEL_STEPS);
    for(const e of f.fired){
        assert.equal(e.type,"wheel");
        assert.equal(e.deltaY,-120);
        assert.equal(e.clientX,350);
        assert.equal(e.clientY,268);
        assert.equal(e.bubbles,true);
    }
    f.observe("LOGGED_IN");
    f.advance();
    assert.equal(f.fired.length,INITIAL_TOUCH_CAMERA_WHEEL_STEPS,"do not override user zoom later");
    assert.equal(f.bridge.applied,INITIAL_TOUCH_CAMERA_WHEEL_STEPS);
});
test("desktop login and original title screen never receive camera changes",()=>{
    const f=fixture({touch:false});
    f.observe("LOGGED_IN");f.advance();
    assert.equal(f.fired.length,0);
    const phone=fixture();phone.observe("LOGIN_SCREEN");phone.advance();
    assert.equal(phone.fired.length,0);
    phone.bridge.dispose();
    assert.equal(phone.listeners.size,0);
});
test("login cancellation and genuine manual wheel prevent late synthetic zoom",()=>{
    const f=fixture();f.observe("LOGGED_IN");
    f.observe("LOGIN_SCREEN");f.advance();
    assert.equal(f.fired.length,0);
    f.observe("LOGGED_IN");
    f.listeners.get("wheel").fn({isTrusted:true});
    f.advance();
    assert.equal(f.fired.length,0,"do not override manual zoom in the world");
    f.observe("LOGIN_SCREEN");
    f.observe("LOGGED_IN");f.advance();
    assert.equal(f.fired.length,INITIAL_TOUCH_CAMERA_WHEEL_STEPS,"new login gets a default");
});
test("a stale timer never adjusts camera after logout",()=>{
    const f=fixture();f.observe("LOGGED_IN");
    f.observe("CONNECTION_LOST");f.advance();
    assert.equal(f.fired.length,0);
});

test("manual pinch cancels delayed login zoom so it cannot override the gesture",()=>{
    const f=fixture();f.observe("LOGGED_IN");
    f.bridge.cancelPendingZoom();f.advance();
    assert.equal(f.fired.length,0);
    assert.equal(f.timers.size,0);
});
test("original engine only observes game state and calls the existing canvas input path",async()=>{
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    const module=await readFile(new URL("../teavm-poc/site/original-login-camera.mjs",import.meta.url),"utf8");
    assert.match(page,/attachOriginalLoginCamera\(/);
    assert.match(page,/loginCamera\.observe\(state\.gameState\)/);
    assert.match(module,/canvas\.dispatchEvent\(event\)/);
    assert.doesNotMatch(module,/login\(|sendGame\(|scene|render|credentials|password/i);
});

test("initial mobile camera wheel reaches original Java AWT input 507, not a replacement renderer",async()=>{
    const {runInNewContext}=await import("node:vm");
    const src=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
    const script=/@JSBody\(params=\{"canvas","handler"\},script="([^"]*)"\)/.exec(src)?.[1];
    assert.ok(script);
    const listeners=new Map(),sent=[];
    let state="LOGIN_SCREEN",tick=null;
    const canvas={
        width:765,height:503,tabIndex:-1,
        getBoundingClientRect:()=>({left:0,top:0,width:765,height:503}),
        addEventListener(type,fn){const group=listeners.get(type)??[];group.push(fn);listeners.set(type,group);},
        removeEventListener(type,fn){listeners.set(type,(listeners.get(type)??[]).filter(f=>f!==fn));},
        dispatchEvent(event){for(const fn of listeners.get(event.type)??[])fn({
            button:0,key:"",keyCode:0,preventDefault(){},...event
        });return true;}
    };
    const handler=(...args)=>{sent.push(args);return false;};
    const browser={canvas,handler,document:{getElementById:()=>null}};
    browser.globalThis=browser;
    runInNewContext(script,browser);
    const camera=attachOriginalLoginCamera({
        canvas,getGameState:()=>state,isTouchDevice:()=>true,
        createWheel:options=>({type:"wheel",isTrusted:false,...options}),
        schedule:fn=>(tick=fn,1),cancel:()=>{tick=null;}
    });
    try{
        state="LOGGED_IN";camera.observe(state);
        assert.ok(tick);
        tick();
        assert.equal(sent.length,INITIAL_TOUCH_CAMERA_WHEEL_STEPS);
        assert.deepEqual(sent.map(packet=>packet[0]),Array(INITIAL_TOUCH_CAMERA_WHEEL_STEPS).fill(507));
        assert.deepEqual(sent.map(packet=>packet[8]),Array(INITIAL_TOUCH_CAMERA_WHEEL_STEPS).fill(-1));
        assert.ok(sent.every(packet=>packet[3]>=0&&packet[3]<765));
        assert.ok(sent.every(packet=>packet[4]>=0&&packet[4]<503));
    }finally{camera.dispose();}
});
