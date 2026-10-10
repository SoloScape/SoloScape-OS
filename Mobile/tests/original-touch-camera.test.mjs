import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {attachOriginalTouchCamera,CAMERA_HOLD_MS} from "../teavm-poc/site/original-touch-camera.mjs";

function fixture({state="LOGGED_IN",resized=false}={}){
    const handlers=new Map(),timers=new Map(),dispatched=[];
    let stamp=10000,serial=0,mode=state;
    const rect={left:0,top:0,width:resized?920:765,height:resized?720:503};
    const canvas={
        width:rect.width,height:rect.height,
        getBoundingClientRect:()=>rect,
        addEventListener(type,fn){const list=handlers.get("canvas:"+type)??[];list.push(fn);handlers.set("canvas:"+type,list);},
        removeEventListener(type,fn){handlers.set("canvas:"+type,(handlers.get("canvas:"+type)??[]).filter(f=>f!==fn));},
        dispatchEvent(event){dispatched.push(event);return true;},
        setPointerCapture(){},releasePointerCapture(){}
    };
    const page={
        addEventListener(type,fn){const list=handlers.get("page:"+type)??[];list.push(fn);handlers.set("page:"+type,list);},
        removeEventListener(type,fn){handlers.set("page:"+type,(handlers.get("page:"+type)??[]).filter(f=>f!==fn));}
    };
    const camera=attachOriginalTouchCamera({
        canvas,page,getGameState:()=>mode,
        createKeyEvent:(type,key)=>({type,key}),
        schedule:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},
        cancel:id=>timers.delete(id),now:()=>stamp
    });
    const fire=(where,type,values={})=>{
        const event={
            type,pointerType:"touch",isPrimary:true,pointerId:1,
            clientX:180,clientY:150,cancelable:true,
            prevented:false,stopped:false,
            preventDefault(){this.prevented=true;},
            stopImmediatePropagation(){this.stopped=true;},...values
        };
        for(const fn of handlers.get(where+":"+type)??[])fn(event);
        return event;
    };
    const tick=ms=>{
        stamp+=ms;
        const due=[...timers].filter(([,v])=>v.ms<=ms);
        for(const [id,v] of due){if(!timers.has(id))continue;timers.delete(id);v.fn();}
    };
    return {camera,canvas,page,handlers,timers,dispatched,fire,tick,
        setState:s=>mode=s,advance:ms=>stamp+=ms};
}
test("short iPhone taps leave original canvas mousedown/mouseup/click available",()=>{
    const f=fixture();const down=f.fire("canvas","pointerdown");
    assert.equal(down.prevented,false);
    f.fire("page","pointerup");f.tick(400);
    assert.equal(f.dispatched.length,0);
    const click=f.fire("canvas","click");
    assert.equal(click.stopped,false);
    assert.equal(click.prevented,false);
    assert.equal(f.timers.size,0);
});
test("hold and drag rotates with native Java AWT arrow-key events and releases when idle",()=>{
    const f=fixture(),down=f.fire("canvas","pointerdown");
    assert.equal(down.prevented,false);
    const timer=[...f.timers.values()][0];
    assert.equal(timer.ms,CAMERA_HOLD_MS);
    f.tick(CAMERA_HOLD_MS);
    const drag=f.fire("canvas","pointermove",{clientX:212,clientY:121});
    assert.equal(drag.prevented,true);
    assert.deepEqual(f.dispatched.map(e=>[e.type,e.key]),[
        ["keydown","ArrowRight"],["keydown","ArrowUp"]
    ]);
    f.tick(100);
    assert.deepEqual(f.dispatched.slice(2).map(e=>[e.type,e.key]),[
        ["keyup","ArrowRight"],["keyup","ArrowUp"]
    ]);
    f.fire("page","pointerup");
    const compat=f.fire("canvas","click");
    assert.equal(compat.stopped,true);
    f.advance(701);
    assert.equal(f.fire("canvas","click").stopped,false);
});
test("a normal swipe immediately starts camera rotation without waiting 320 ms",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    f.fire("canvas","pointermove",{clientX:188});
    assert.equal(f.dispatched.length,0,"small drift remains a normal tap");
    const swipe=f.fire("canvas","pointermove",{clientX:205,clientY:150});
    assert.equal(swipe.prevented,true);
    assert.deepEqual(f.dispatched.map(e=>[e.type,e.key]),[["keydown","ArrowRight"]]);
    f.fire("page","pointerup");
    assert.equal(f.dispatched.at(-1).type,"keydown",
        "brief swipes must hold direction until the next Java game tick");
    f.tick(90);
    assert.deepEqual(f.dispatched.at(-1),{type:"keyup",key:"ArrowRight"});
    assert.equal(f.fire("canvas","click").stopped,true,"don't walk after a camera swipe");
    // A new tap immediately after swiping must still click a world destination.
    f.fire("canvas","pointerdown");
    f.fire("page","pointerup");
    assert.equal(f.fire("canvas","click").stopped,false);
});
test("cancel, blur, logout and multitouch release pressed keys",()=>{
    const f=fixture();f.fire("canvas","pointerdown");
    f.tick(320);f.fire("canvas","pointermove",{clientX:204});
    f.fire("page","pointercancel",{pointerId:2});
    assert.equal(f.dispatched.length,1);
    f.fire("page","pointercancel");
    assert.equal(f.dispatched.at(-1).type,"keyup");
    f.fire("canvas","pointerdown");f.tick(320);
    f.fire("canvas","pointermove",{clientY:170});
    f.setState("LOGIN_SCREEN");f.camera.update();
    assert.equal(f.dispatched.at(-1).type,"keyup");
    f.fire("canvas","pointerdown");f.tick(320);
    assert.equal(f.dispatched.filter(e=>e.type==="keydown").length,2);
    f.camera.dispose();
    assert.equal((f.handlers.get("canvas:pointerdown")??[]).length,0);
});
test("login screen, mouse pointers and interface buttons have no camera long press",()=>{
    const f=fixture({state:"LOGIN_SCREEN"});
    f.fire("canvas","pointerdown");f.tick(400);
    assert.equal(f.dispatched.length,0);
    const g=fixture();
    g.fire("canvas","pointerdown",{pointerType:"mouse"});
    g.fire("canvas","pointerdown",{clientX:700,clientY:390});
    g.tick(400);assert.equal(g.dispatched.length,0);
    const h=fixture({resized:true});
    h.fire("canvas","pointerdown",{clientX:850,clientY:600});
    h.tick(400);assert.equal(h.dispatched.length,0);
});
test("Safari context callout and text-selection are suppressed on original game canvas",()=>{
    const f=fixture();
    assert.equal(f.fire("canvas","contextmenu").prevented,true);
    assert.equal(f.fire("canvas","selectstart").prevented,true);
    f.setState("LOGIN_SCREEN");
    assert.equal(f.fire("canvas","contextmenu").prevented,false);
});
test("synthetic camera keyboard keys reach real Java AWT keycode mapping",async()=>{
    const src=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
    const js=src.match(/@JSBody\(params=\{"canvas","handler"\},script="([^"]*)"\)/)?.[1];
    assert.ok(js);
    const listeners=new Map(),received=[];
    const canvas={
        width:765,height:503,tabIndex:-1,
        getBoundingClientRect:()=>({left:0,top:0,width:765,height:503}),
        addEventListener:(name,fn)=>listeners.set(name,fn),
        dispatchEvent:e=>{listeners.get(e.type)?.({clientX:200,clientY:180,
            button:0,deltaY:0,key:e.key,keyCode:0,preventDefault(){}});return true;}
    };
    const scope={canvas,handler:(...args)=>{received.push(args);return false;},
        document:{getElementById:()=>null}};
    scope.globalThis=scope;runInNewContext(js,scope);
    for(const key of ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"])
        canvas.dispatchEvent({type:"keydown",key});
    assert.deepEqual(received.map(r=>r[6]),[37,39,38,40]);
    assert.ok(received.every(r=>r[0]===401));
});
test("original page integrates hold gesture without a gameplay replacement",async()=>{
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    const css=await readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8");
    assert.match(page,/attachOriginalTouchCamera\(/);
    assert.match(page,/touchCamera\.update\(\)/);
    assert.match(css,/-webkit-touch-callout:none/);
    assert.match(css,/-webkit-user-select:none/);
    assert.match(css,/user-select:none/);
    assert.doesNotMatch(page,/replace.*engine|synthetic.*gameplay/i);
});

test("continuous drag holds camera direction across pointer events until finger rests",()=>{
    const f=fixture();f.fire("canvas","pointerdown");f.tick(320);
    f.fire("canvas","pointermove",{clientX:202});
    f.fire("canvas","pointermove",{clientX:232});
    f.fire("canvas","pointermove",{clientX:270});
    assert.deepEqual(f.dispatched.map(e=>[e.type,e.key]),[
        ["keydown","ArrowRight"]
    ],"repeated touchmove must not release camera key before original game tick");
    f.fire("canvas","pointermove",{clientX:240});
    assert.deepEqual(f.dispatched.map(e=>[e.type,e.key]),[
        ["keydown","ArrowRight"],["keyup","ArrowRight"],["keydown","ArrowLeft"]
    ]);
    f.fire("page","pointerup");
    f.tick(90);
    assert.deepEqual(f.dispatched.at(-1),{type:"keyup",key:"ArrowLeft"});
});


test("starting another swipe releases any post-lift camera direction first",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown");
    f.fire("canvas","pointermove",{clientX:200});
    f.fire("page","pointerup");
    assert.deepEqual(f.dispatched.at(-1),{type:"keydown",key:"ArrowRight"});
    f.fire("canvas","pointerdown",{clientX:180});
    assert.deepEqual(f.dispatched.at(-1),{type:"keyup",key:"ArrowRight"});
    f.fire("canvas","pointermove",{clientX:140});
    assert.deepEqual(f.dispatched.at(-1),{type:"keydown",key:"ArrowLeft"});
    f.fire("page","pointercancel");
    assert.deepEqual(f.dispatched.at(-1),{type:"keyup",key:"ArrowLeft"});
});
