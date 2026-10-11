import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalResizableLayout,originalViewportSize} from "../teavm-poc/site/original-resizable-layout.mjs";
function fixture(){
    const classes=new Set(),calls=[],listeners=new Set();
    let state="LOGIN_SCREEN",mode=false,viewport={width:956,height:440};
    const engine={
        isResizableMode:()=>mode,
        resizeOriginalViewport:(w,h)=>{calls.push([w,h]);return true;}
    };
    const body={classList:{
        add:name=>classes.add(name),remove:name=>classes.delete(name),
        contains:name=>classes.has(name)
    }};
    const view=attachOriginalResizableLayout({canvas:{},body,engine,
        getGameState:()=>state,viewport:()=>viewport,
        addResize:fn=>listeners.add(fn),removeResize:fn=>listeners.delete(fn)});
    return {view,classes,calls,listeners,
        state:s=>state=s,mode:m=>mode=m,viewport:v=>viewport=v};
}
test("Resizable Classic fills browser CSS viewport through original resizeCanvas",()=>{
    const f=fixture();f.state("LOGGED_IN");f.mode(true);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
    assert.equal(f.classes.has("original-resizable"),true);
    f.view.update();
    assert.equal(f.calls.length,1,"unchanged viewport does not resize repeatedly");
    f.viewport({width:1024,height:768});
    for(const fn of f.listeners)fn();
    assert.deepEqual(f.calls.at(-1),[1024,768]);
    assert.equal(f.calls.length,2);
    f.view.dispose();
    assert.equal(f.listeners.size,0);
});
test("Resizable Modern remains fullscreen and changing to Fixed restores original dimensions",()=>{
    const f=fixture();f.state("LOGGED_IN");f.mode(true);f.view.update();
    f.view.update(); // Modern also maps to original isResized() true.
    assert.equal(f.calls.length,1);
    f.mode(false);f.view.update();
    assert.deepEqual(f.calls.at(-1),[765,503]);
    assert.equal(f.classes.has("original-resizable"),false);
    f.view.update();
    assert.equal(f.calls.length,2);
});
test("welcome screen, logout, disconnect and invalid viewport remain fixed",()=>{
    const f=fixture();
    f.mode(true);f.view.update();
    assert.equal(f.calls.length,0);
    f.state("LOGGED_IN");f.viewport({width:NaN,height:503});f.view.update();
    assert.equal(f.calls.length,0);
    f.viewport({width:390,height:844});f.view.update();
    assert.deepEqual(f.calls,[[765,1656]]);
    f.state("CONNECTION_LOST");f.view.update();
    assert.deepEqual(f.calls.at(-1),[765,503]);
    assert.equal(f.classes.has("original-resizable"),false);
});
test("browser layout uses original injected Java game mode and native resize, not a renderer substitute",async()=>{
    const bridge=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    assert.match(bridge,/isResizableMode\(\)/);
    assert.match(bridge,/getGameState\(\)!=net\.runelite\.api\.GameState\.LOGGED_IN/);
    assert.match(bridge,/\.isResized\(\)/);
    assert.match(bridge,/\.resizeCanvas\(\)/);
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(page,/attachOriginalResizableLayout\(/);
    assert.match(page,/originalResize\?\.update\(\)/);
    const css=await readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8");
    assert.match(css,/body\.original-resizable #original-engine-canvas/);
    assert.match(css,/width:100%;height:100%/);
    assert.match(css,/body\.original-resizable\{height:100dvh/);
    for(const edge of ["top","right","bottom","left"])
        assert.match(css,new RegExp(`env\\(safe-area-inset-${edge}\\)`));
});

test("phone landscape, portrait, safe areas and large screens keep the same scale on both axes",()=>{
    for(const [width,height] of [[844,390],[956,440],[756,369],[390,844],[393,852],[1024,768],[3840,2160]]){
        const size=originalViewportSize(width,height);
        assert.ok(size,`${width}x${height} supported`);
        assert.ok(size.width>=765&&size.height>=503);
        assert.ok(size.width<=2048&&size.height<=2048);
        assert.ok(Math.abs(size.width/width-size.height/height)<=.5/width+.5/height,
            `${width}x${height} has only integer-pixel rounding, no axis stretching`);
    }
    assert.equal(originalViewportSize(NaN,390),null);
    assert.equal(originalViewportSize(844,0),null);
    assert.equal(originalViewportSize(10000,100),null);
});

test("measures the fullscreen canvas after applying layout and rolls back a rejected resize",()=>{
    const classes=new Set(),calls=[];
    const body={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}};
    const view=attachOriginalResizableLayout({body,
        canvas:{getBoundingClientRect:()=>{
            assert.ok(classes.has("original-resizable"));
            return {width:756,height:369};
        }},
        engine:{isResizableMode:()=>true,resizeOriginalViewport:(w,h)=>{calls.push([w,h]);return false;}},
        getGameState:()=>"LOGGED_IN",addResize:()=>{},removeResize:()=>{}});
    view.update();
    assert.deepEqual(calls,[[1031,503]]);
    assert.equal(classes.has("original-resizable"),false);
    view.dispose();
});
