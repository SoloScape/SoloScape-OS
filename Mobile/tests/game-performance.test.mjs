import assert from "node:assert/strict";
import {test} from "node:test";
import {GamePerformanceMetrics,GamePerformanceOverlay} from "../browser/game-performance.mjs";

function fixture(){
    const make=()=>({
        hidden:false,textContent:"",attributes:new Map(),listeners:new Map(),
        setAttribute(name,value){this.attributes.set(name,value);},
        addEventListener(name,callback){this.listeners.set(name,callback);},
        removeEventListener(name,callback){
            if(this.listeners.get(name)===callback)this.listeners.delete(name);
        },
        click(){this.listeners.get("click")?.();}
    });
    const root=make(),button=make(),details=make();
    const fields=Object.fromEntries(["fps","ram","tick","ms"].map(name=>[name,make()]));
    root.hidden=true;
    root.querySelector=selector=>selector==="#world-performance-toggle"?button:
        selector==="#world-performance-stats"?details:
        fields[selector.match(/^\[data-perf="(\w+)"\]$/)?.[1]]??null;
    return {root,button,details,fields};
}
test("FPS and MS measure actual RAF intervals; tick counts authoritative PLAYER_INFO updates",()=>{
    const metrics=new GamePerformanceMetrics({memory:()=>70*1048576});
    for(let i=0;i<=60;i++)metrics.recordFrame(i*1000/60);
    for(const timestamp of [0,600,1200,1800])metrics.recordTick(timestamp);
    const snapshot=metrics.snapshot();
    assert.ok(Math.abs(snapshot.fps-60)<.01);
    assert.ok(Math.abs(snapshot.frameMs-1000/60)<.01);
    assert.equal(snapshot.tickMs,600);
    assert.equal(snapshot.ticks,4);
    assert.equal(snapshot.heapBytes,70*1048576);
    metrics.recordFrame(6000);
    assert.equal(metrics.snapshot().fps,null,"suspended tab must not report stale FPS");
    metrics.recordFrame(6033);
    assert.ok(Math.abs(metrics.snapshot().fps-1000/33)<.01);
    metrics.recordTick(6000);
    assert.equal(metrics.snapshot().tickMs,null,"stale server tick interval clears after long gaps");
    assert.equal(metrics.snapshot().ticks,5);
});

test("performance HUD displays N/A for protected memory, samples cheaply and toggles on touch",()=>{
    const {root,button,details,fields}=fixture();
    const metrics=new GamePerformanceMetrics({memory:()=>undefined});
    let refresh,cleared=null;
    const overlay=new GamePerformanceOverlay(root,{metrics,
        interval:(callback,ms)=>{assert.equal(ms,1000);refresh=callback;return 7;},
        clear:id=>{cleared=id;}});
    overlay.start();overlay.start();
    assert.equal(root.hidden,false);
    assert.equal(fields.ram.textContent,"N/A");
    assert.equal(fields.ms.textContent,"—");
    assert.equal(button.attributes.get("aria-expanded"),"true");
    for(let i=0;i<=45;i++)overlay.frame(i*20);
    overlay.tick(0);overlay.tick(600);overlay.tick(1200);
    refresh();
    assert.equal(fields.fps.textContent,"50");
    assert.equal(fields.ram.textContent,"N/A");
    assert.equal(fields.tick.textContent,"3 / 600 ms");
    assert.equal(fields.ms.textContent,"20.0");
    button.click();
    assert.equal(details.hidden,true);
    assert.equal(button.attributes.get("aria-expanded"),"false");
    button.click();
    assert.equal(details.hidden,false);
    overlay.dispose();
    assert.equal(cleared,7);
    assert.equal(root.hidden,true);
    assert.equal(button.listeners.size,0,"disconnect removes click listener");
    overlay.frame(2000);overlay.tick(4000);refresh();
    assert.equal(fields.tick.textContent,"3 / 600 ms","timer and RAF cannot update disposed HUD");
});

test("heap read errors never interrupt frames or world packet processing",()=>{
    const metrics=new GamePerformanceMetrics({memory:()=>{throw new Error("blocked");}});
    metrics.recordFrame(0);metrics.recordFrame(40);metrics.recordTick(100);
    assert.deepEqual(metrics.snapshot(),{fps:25,frameMs:40,heapBytes:null,ticks:1,tickMs:null});
});

test("native gameplay reports server ticks only after successfully decoded PLAYER_INFO",async()=>{
    const {NativeGameplay}=await import("../browser/native-gameplay.mjs");
    const tickTimes=[],viewport={visibleLevel:0,canvas:{clientWidth:765,clientHeight:503},
        setActors(){},setScenery(){}};
    let now=1000;
    const game=new NativeGameplay({cache:{},viewport,session:{},now:()=>now,
        onServerTick:time=>tickTimes.push(time)});
    game.sync={decode:()=>({plane:0})};
    game.updateMotion=()=>{};
    game.report=()=>{};
    game.handle({name:"PLAYER_INFO",payload:new Uint8Array()});
    now=1600;game.handle({name:"PLAYER_INFO",payload:new Uint8Array()});
    assert.deepEqual(tickTimes,[1000,1600]);
    game.sync.decode=()=>{throw new Error("Bad packet");};
    assert.throws(()=>game.handle({name:"PLAYER_INFO",payload:new Uint8Array()}),/Bad packet/);
    assert.deepEqual(tickTimes,[1000,1600]);
    game.closed=true;
});
