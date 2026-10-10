import test from "node:test";
import assert from "node:assert/strict";
import {attachOriginalPageLifecycle} from "../teavm-poc/site/original-mobile-lifecycle.mjs";
function storage(){
 const entries=new Map();
 return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
}
function fixture(store,{time=1000,state="LOGIN_SCREEN"}={}){
 const listeners=new Map(),signals=[];
 const canvas={width:765,height:503,getBoundingClientRect:()=>({left:0,top:0,width:765,height:503}),
     addEventListener:(name,fn,opts)=>listeners.set(name,{fn,opts})};
 const page={addEventListener:(name,fn)=>listeners.set("page:"+name,{fn})};
 const lifecycle=attachOriginalPageLifecycle({canvas,storage:store,page,now:()=>time,
     getGameState:()=>state,report:name=>signals.push(name)});
 const fire=(name,extra={})=>{
     const listener=listeners.get(name);assert.ok(listener,"Missing "+name);
     listener.fn({clientX:462,clientY:291,pointerType:"touch",...extra});
 };
 return {signals,fire,lifecycle,listeners};
}
test("original iOS title tap and actual page restart are tracked without credentials",()=>{
 const store=storage(),first=fixture(store);
 assert.deepEqual(first.signals,["PAGE_STARTED"]);
 first.fire("pointerdown");
 first.fire("touchstart",{touches:[{clientX:462,clientY:291}]});
 assert.deepEqual(first.signals,["PAGE_STARTED","TITLE_RIGHT_TAP"]);
 assert.equal(first.listeners.get("pointerdown").opts.capture,true);
 first.fire("page:pagehide");
 assert.equal(first.signals.at(-1),"PAGEHIDE");
 const second=fixture(store,{time:3500});
 assert.equal(second.lifecycle.restartedAfterTitleTap,true);
 assert.deepEqual(second.signals,["PAGE_RESTARTED"]);
 assert.deepEqual(fixture(store,{time:3600}).signals,["PAGE_STARTED"]);
});
test("other title controls, gameplay taps and mouse clicks do not signal a title action",()=>{
 const store=storage(),f=fixture(store);
 for(const [x,y] of [[302,291],[462,321],[374,248],[462,263],[0,0],[764,502]])
     f.fire("pointerdown",{clientX:x,clientY:y});
 f.fire("pointerdown",{pointerType:"mouse"});
 assert.deepEqual(f.signals,["PAGE_STARTED"]);
 const game=fixture(store,{state:"LOGGED_IN"});
 game.fire("pointerdown");
 assert.deepEqual(game.signals,["PAGE_STARTED"]);
});
test("subsequent field taps clear the title marker before any unrelated restart",()=>{
 const store=storage(),first=fixture(store);
 first.fire("pointerdown");
 first.fire("pointerdown",{clientX:374,clientY:248});
 assert.deepEqual(fixture(store,{time:3500}).signals,["PAGE_STARTED"]);
});
test("old markers expire and iOS private browsing storage denials do not block input",()=>{
 const s=storage();fixture(s).fire("pointerdown");
 assert.deepEqual(fixture(s,{time:123000}).signals,["PAGE_STARTED"]);
 const denied={getItem(){throw Error("denied");},setItem(){throw Error("denied");}};
 const f=fixture(denied);f.fire("pointerdown");
 assert.deepEqual(f.signals,["PAGE_STARTED","TITLE_RIGHT_TAP"]);
});
test("original engine samples frames only until changed pixels are confirmed",async()=>{
 const {readFile}=await import("node:fs/promises");
 const source=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
 assert.match(source,/attachOriginalPageLifecycle\(/);
 assert.match(source,/if\(!state\.frameChanged\)\{/);
 assert.match(source,/pageRestartedAfterTitleTap/);
});
