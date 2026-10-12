import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalResizableLayout,originalViewportSize} from "../teavm-poc/site/original-resizable-layout.mjs";
function fixture(){
    const classes=new Set(),calls=[],listeners=new Set();
    let state="LOGIN_SCREEN",mode=false,stamp=0,portraitTouch=false,viewport={width:956,height:440};
    const engine={
        isResizableMode:()=>mode,
        resizeOriginalViewport:(w,h)=>{calls.push([w,h]);return true;}
    };
    const body={classList:{
        add:name=>classes.add(name),remove:name=>classes.delete(name),
        contains:name=>classes.has(name)
    }};
    const view=attachOriginalResizableLayout({canvas:{},body,engine,
        getGameState:()=>state,viewport:()=>viewport,now:()=>stamp,
        isPortraitTouch:()=>portraitTouch,
        addResize:fn=>listeners.add(fn),removeResize:fn=>listeners.delete(fn)});
    return {view,classes,calls,listeners,
        state:s=>state=s,mode:m=>mode=m,viewport:v=>viewport=v,
        portrait:value=>portraitTouch=value,advance:ms=>stamp+=ms};
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
    assert.equal(f.classes.has("original-resizable"),true,
        "FPS-like transient mode switch must not collapse modern layout");
    f.advance(1500);f.view.update();
    assert.deepEqual(f.calls.at(-1),[765,503]);
    assert.equal(f.classes.has("original-resizable"),false);
    f.view.update();
    assert.equal(f.calls.length,2);
});
test("original title/login screen uses the same native fullscreen canvas as the game",()=>{
    const f=fixture();
    f.mode(true);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]],"title fills landscape viewport");
    assert.equal(f.classes.has("original-resizable"),true);
    f.state("LOGGED_IN");f.view.update();
    assert.equal(f.calls.length,1,"entering the game keeps the existing fullscreen framebuffer");
    f.state("LOGIN_SCREEN");f.viewport({width:390,height:844});f.view.update();
    assert.deepEqual(f.calls.at(-1),[765,1656],"title fills portrait viewport");
    assert.equal(f.classes.has("original-resizable"),true);
    f.state("LOGGED_IN");f.view.update();
    assert.equal(f.calls.length,2,"portrait login-to-game transition keeps the canvas");
    f.state("CONNECTION_LOST");f.view.update();
    assert.equal(f.calls.length,2,"logging out never resets the viewport to Fixed");
    assert.equal(f.classes.has("original-resizable"),true);
});
test("connecting to server preserves the title's fullscreen aspect ratio",()=>{
    const f=fixture();
    f.mode(true);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
    assert.equal(f.classes.has("original-resizable"),true);
    for(const state of ["LOGGING_IN","LOGIN_SCREEN_AUTHENTICATOR","LOADING","HOPPING"]){
        f.state(state);
        // A login transition may temporarily clear isResized while native
        // networking proceeds; neither CSS nor Java resize may snap to Fixed.
        f.mode(false);f.view.update();f.advance(2000);f.view.update();
        assert.equal(f.classes.has("original-resizable"),true,state);
        assert.deepEqual(f.calls,[[1093,503]],state+" must not resize the canvas");
    }
    f.state("LOGIN_SCREEN");f.mode(true);f.view.update();
    assert.equal(f.classes.has("original-resizable"),true,
        "failed login returns to the original fullscreen title");
    assert.equal(f.calls.length,1);
    f.state("LOGGING_IN");f.view.update();
    f.state("LOGGED_IN");f.mode(true);f.view.update();
    assert.equal(f.classes.has("original-resizable"),true,
        "successful login retains the title's aspect ratio");
    assert.equal(f.calls.length,1);
    f.state("CONNECTION_LOST");f.view.update();
    assert.equal(f.classes.has("original-resizable"),true,
        "disconnect keeps the original fullscreen gameframe for logout");
    assert.equal(f.calls.length,1);
    f.state("LOGIN_SCREEN");f.mode(false);f.advance(5000);f.view.update();
    assert.equal(f.classes.has("original-resizable"),true,
        "logout title must not change aspect ratio even if the original window flag is briefly false");
    assert.equal(f.calls.length,1);
    f.mode(true);f.view.update();
    assert.equal(f.calls.length,1,"restored login/title window mode reuses the previous dimensions");
});
test("logout through loading, connection loss and title keeps the same native landscape aspect",()=>{
    const f=fixture();
    f.mode(true);f.state("LOGGED_IN");f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
    for(const state of ["LOADING","CONNECTION_LOST","UNKNOWN","STARTING","LOGIN_SCREEN"]){
        f.state(state);f.mode(false);f.advance(3000);f.view.update();
        assert.equal(f.classes.has("original-resizable"),true,state);
        assert.equal(f.calls.length,1,state+" must not request Fixed mode");
    }
    f.mode(true);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
});
test("portrait touch devices show rotate overlay and never request portrait Java canvas dimensions",()=>{
    const f=fixture();
    f.state("LOGIN_SCREEN");f.mode(true);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
    f.portrait(true);f.viewport({width:390,height:844});
    for(const fn of f.listeners)fn();
    f.state("LOGGED_IN");f.view.update();f.advance(3000);f.view.update();
    assert.deepEqual(f.calls,[[1093,503]],
        "portrait never expands the software framebuffer to 765x1656");
    assert.equal(f.classes.has("original-resizable"),true,
        "preserve canvas state until returning to landscape");
    f.portrait(false);f.viewport({width:844,height:390});
    for(const fn of f.listeners)fn();
    assert.deepEqual(f.calls.at(-1),[1089,503],
        "native canvas resumes at the landscape viewport after rotation");
    f.viewport({width:1024,height:600});f.view.update();
    assert.deepEqual(f.calls.at(-1),[1024,600]);
});
test("starting in portrait defers native canvas resizing until landscape",()=>{
    const f=fixture();
    f.mode(true);f.portrait(true);f.viewport({width:390,height:844});
    f.view.update();assert.equal(f.calls.length,0);
    assert.equal(f.classes.has("original-resizable"),false);
    f.portrait(false);f.viewport({width:956,height:440});
    f.view.update();assert.deepEqual(f.calls,[[1093,503]]);
    assert.equal(f.classes.has("original-resizable"),true);
});
test("landscape-only overlay exists before JS boots and prevents canvas touches in portrait",async()=>{
    const html=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    const css=await readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8");
    assert.match(html,/id="landscape-required"/);
    assert.match(html,/Rotate to landscape/);
    assert.match(css,/@media \(pointer:coarse\) and \(orientation:portrait\)/);
    assert.match(css,/#landscape-required\{display:flex\}/);
    assert.match(css,/#original-engine-canvas\{pointer-events:none\}/);
    assert.match(css,/#landscape-required\{display:none;position:fixed;inset:0;z-index:50/);
});
test("connecting before first full title resize never triggers an unsafe Java resize",()=>{
    const f=fixture();
    f.state("LOGGING_IN");f.mode(true);f.view.update();
    assert.equal(f.calls.length,0);
    assert.equal(f.classes.has("original-resizable"),false);
    f.state("LOGIN_SCREEN");f.view.update();
    assert.deepEqual(f.calls,[[1093,503]]);
    assert.equal(f.classes.has("original-resizable"),true);
});
test("before login initialization and invalid viewports never force an unsafe resize",()=>{
    const f=fixture();
    f.state("UNAVAILABLE");f.mode(true);f.view.update();
    assert.equal(f.calls.length,0);
    f.state("LOGIN_SCREEN");f.viewport({width:NaN,height:503});f.view.update();
    assert.equal(f.calls.length,0);
    assert.equal(f.classes.has("original-resizable"),false);
    f.viewport({width:390,height:844});f.view.update();
    assert.deepEqual(f.calls,[[765,1656]]);
});
test("FPS mode transition retains fullscreen until the original game reasserts mobile mode",()=>{
    let state="LOGGED_IN",mode=true,time=100;
    const classes=new Set(),calls=[];
    const canvas={width:765,height:503,
        getBoundingClientRect:()=>({width:956,height:440})};
    const body={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}};
    const view=attachOriginalResizableLayout({
        canvas,body,getGameState:()=>state,now:()=>time,
        engine:{
            isResizableMode:()=>mode,
            resizeOriginalViewport:(w,h)=>{
                calls.push([w,h]);canvas.width=w;canvas.height=h;return true;
            }
        },
        addResize:()=>{},removeResize:()=>{}
    });
    view.update();assert.deepEqual(calls,[[1093,503]]);
    assert.equal(classes.has("original-resizable"),true);
    mode=false;time+=500;view.update();
    assert.equal(classes.has("original-resizable"),true,
        "transient fixed-mode flag must not collapse mobile canvas");
    assert.equal(calls.length,1);
    // Original FPS setting resets native framebuffer despite constant CSS bounds.
    canvas.width=765;canvas.height=503;
    mode=true;time+=200;view.update();
    assert.deepEqual(calls,[[1093,503],[1093,503]],
        "repair physical framebuffer after original engine window-mode reset");
    assert.equal(classes.has("original-resizable"),true);
    view.update();assert.equal(calls.length,2,"stable dimensions stay unchanged");
    view.dispose();
});
test("a persistent intentional Fixed switch still restores the native 765x503 view",()=>{
    let time=0,mode=true;
    const classes=new Set(),calls=[];
    const view=attachOriginalResizableLayout({
        canvas:{},body:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}},
        engine:{isResizableMode:()=>mode,resizeOriginalViewport:(w,h)=>{calls.push([w,h]);return true;}},
        getGameState:()=>"LOGGED_IN",viewport:()=>({width:956,height:440}),
        now:()=>time,addResize:()=>{},removeResize:()=>{}
    });
    view.update();mode=false;
    time=100;view.update();assert.equal(calls.length,1);
    time=1599;view.update();assert.equal(calls.length,1);
    time=1600;view.update();assert.deepEqual(calls.at(-1),[765,503]);
    assert.equal(classes.has("original-resizable"),false);
    view.dispose();
});
test("browser layout uses original injected Java game mode and native resize, not a renderer substitute",async()=>{
    const bridge=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    assert.match(bridge,/isResizableMode\(\)/);
    const resizeMethod=bridge.match(/@JSExport public static boolean resizeOriginalViewport\(int width,int height\) \{[\s\S]*?\n    \}/)?.[0];
    assert.ok(resizeMethod,"original bridge resize must remain available");
    assert.match(resizeMethod,/state!=net\.runelite\.api\.GameState\.LOGIN_SCREEN/);
    assert.match(resizeMethod,/state!=net\.runelite\.api\.GameState\.LOGGED_IN/);
    assert.match(resizeMethod,/\.resizeCanvas\(\)/);
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
