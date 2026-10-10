import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

// Exercise the actual TeaVM JSBody browser-boundary code. The mocked Java
// handler intentionally does not consume events, matching native AWT wheel
// and right-click callbacks in the original revision-240 client.
const source=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
const inputScript=source.match(/@JSBody\(params=\{"canvas","handler"\},script="([^"]*)"\)/)?.[1];
assert.ok(inputScript,"NativeCanvas must retain a fixed canvas-only input bridge");

function createCanvas(consume=()=>false){
    const handlers=new Map(),sent=[];
    const canvas={
        width:765,height:503,tabIndex:-1,
        getBoundingClientRect:()=>({left:0,top:0,width:765,height:503}),
        addEventListener(type,fn,opts){handlers.set(type,{fn,opts});}
    };
    const handler=(...args)=>{sent.push(args);return consume(...args);};
    runInNewContext(inputScript,{canvas,handler});
    function fire(type,props={}){
        const listener=handlers.get(type);
        assert.ok(listener,"Missing "+type+" canvas listener");
        const e={
            clientX:250,clientY:140,button:0,deltaY:0,
            key:"",keyCode:0,ctrlKey:false,metaKey:false,altKey:false,
            defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},
            ...props
        };
        listener.fn(e);
        return e;
    }
    return {canvas,handlers,sent,fire};
}

test("wheel zoom reaches original Java AWT event 507 without scrolling the page",()=>{
    const input=createCanvas();
    assert.equal(input.handlers.get("wheel").opts.passive,false,
        "wheel must be non-passive to prevent the browser scrolling");
    const zoomIn=input.fire("wheel",{deltaY:-120});
    const zoomOut=input.fire("wheel",{deltaY:120});
    assert.equal(zoomIn.defaultPrevented,true);
    assert.equal(zoomOut.defaultPrevented,true);
    assert.deepEqual(input.sent.map(event=>event[0]),[507,507]);
    assert.deepEqual(input.sent.map(event=>event[8]),[-1,1],
        "original Java AWT must receive the wheel direction unchanged");
});

test("right button remains a Java mouse action but Chrome context menu is blocked",()=>{
    const input=createCanvas();
    input.fire("mousedown",{button:2});
    input.fire("mouseup",{button:2});
    const menu=input.fire("contextmenu",{button:2});
    assert.equal(menu.defaultPrevented,true);
    assert.deepEqual(input.sent.map(event=>event[0]),[501,502],
        "contextmenu must not send an extra fake game click");
    assert.deepEqual(input.sent.map(event=>event[5]),[3,3],
        "right mouse button must still reach original Java handler");
});

test("preventDefault is limited to game canvas and respects consumption for ordinary keys",()=>{
    const input=createCanvas();
    assert.equal(input.handlers.has("wheel"),true);
    assert.equal(input.handlers.has("contextmenu"),true);
    const ordinaryKey=input.fire("keydown",{key:"Escape",keyCode:27});
    assert.equal(ordinaryKey.defaultPrevented,false);
    assert.equal(input.sent.at(-1)[0],401);
    const consumed=createCanvas(id=>id===401);
    const consumedKey=consumed.fire("keydown",{key:"Escape",keyCode:27});
    assert.equal(consumedKey.defaultPrevented,true);
    const enter=input.fire("keydown",{key:"Enter",keyCode:13});
    assert.equal(enter.defaultPrevented,false);
    assert.equal(input.sent.at(-1)[6],10,"original Java AWT Enter mapping stays intact");
});
