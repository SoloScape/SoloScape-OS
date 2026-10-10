import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalResizableLayout} from "../teavm-poc/site/original-resizable-layout.mjs";
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
    assert.deepEqual(f.calls,[[956,503]]);
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
    assert.deepEqual(f.calls,[[765,844]]);
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
    assert.match(css,/width:100vw/);
    assert.match(css,/height:100dvh/);
});
