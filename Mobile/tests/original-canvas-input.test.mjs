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

function createCanvas(consume=()=>false,rect={left:0,top:0,width:765,height:503}){
    const handlers=new Map(),sent=[];
    const canvas={
        width:765,height:503,tabIndex:-1,
        getBoundingClientRect:()=>rect,
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
    const backspace=input.fire("keydown",{key:"Backspace",keyCode:0});
    assert.equal(backspace.defaultPrevented,false);
    assert.equal(input.sent.at(-1)[6],8,"synthetic mobile Backspace must use original Java keycode");
});

test("letterboxed portrait and landscape canvas input maps to original 765x503 pixels",()=>{
    // Portrait 390x844: fit by width, with equal bars above/below.
    const height=390*503/765;
    const portrait=createCanvas(()=>false,{left:0,top:(844-height)/2,width:390,height});
    portrait.fire("mousedown",{clientX:195,clientY:422});
    assert.equal(portrait.sent[0][3],382);
    assert.equal(portrait.sent[0][4],251);

    // Landscape 932x430: fit by height, centred between two side bars.
    const width=430*765/503;
    const landscape=createCanvas(()=>false,{left:(932-width)/2,top:0,width,height:430});
    landscape.fire("mousedown",{clientX:(932-width)/2+width/4,clientY:430*0.75});
    assert.equal(landscape.sent[0][3],191);
    assert.equal(landscape.sent[0][4],377);
});
