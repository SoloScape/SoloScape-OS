import assert from "node:assert/strict";
import {test} from "node:test";
import {GamePerformanceMetrics,GamePerformanceOverlay,measurePreviewLatency} from "../browser/game-performance.mjs";

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
    const fields=Object.fromEntries(["fps","ram","tick","ms","draw","net","gl"].map(name=>[name,make()]));
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
    metrics.recordFrame(6200);
    assert.equal(metrics.snapshot().fps,null,"suspended tab must not report stale FPS");
    metrics.recordFrame(6233);
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
    overlay.drawCalls(42);
    refresh();
    assert.equal(fields.gl.textContent,"42");
    assert.equal(fields.fps.textContent,"50.0");
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
    assert.deepEqual(metrics.snapshot(),{fps:25,frameMs:40,heapBytes:null,ticks:1,tickMs:null,drawMs:null});
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

test("Safari Window timer methods are called on their owning object during login and disconnect",()=>{
    const {root}=fixture(),calls=[];
    const timers={
        setInterval(callback,delay){
            assert.strictEqual(this,timers,"WebKit rejects detached Window.setInterval");
            assert.equal(delay,1000);
            assert.equal(typeof callback,"function");
            calls.push("scheduled");
            return 77;
        },
        clearInterval(id){
            assert.strictEqual(this,timers,"WebKit rejects detached Window.clearInterval");
            assert.equal(id,77);
            calls.push("cleared");
        },
    };
    const overlay=new GamePerformanceOverlay(root,{timers});
    overlay.start();
    overlay.frame(100);overlay.frame(120);
    overlay.dispose();
    assert.deepEqual(calls,["scheduled","cleared"]);
    assert.equal(root.hidden,true);
});

test("very slow frames remain visible instead of being discarded as background pauses",()=>{
    const metrics=new GamePerformanceMetrics({hidden:()=>false,memory:()=>null});
    metrics.recordFrame(100);metrics.recordFrame(600);
    assert.equal(metrics.snapshot().fps,2);
    assert.equal(metrics.snapshot().frameMs,500);
    metrics.recordDraw(412.75);
    assert.equal(metrics.snapshot().drawMs,412.75);
    metrics.recordFrame(1000);
    assert.ok(Math.abs(metrics.snapshot().fps-1000/450)<.001);
    metrics.recordFrame(8000);
    assert.equal(metrics.snapshot().fps,null,"genuine 7s suspension resets stale data");
});

test("hidden iOS home-screen view must not count background time as a 1fps frame",()=>{
    let hidden=false;
    const metrics=new GamePerformanceMetrics({hidden:()=>hidden});
    metrics.recordFrame(100);
    metrics.recordFrame(116);
    hidden=true;metrics.recordFrame(3000);
    assert.equal(metrics.snapshot().fps,null);
    hidden=false;metrics.recordFrame(4000);metrics.recordFrame(4033);
    assert.ok(Math.abs(metrics.snapshot().fps-1000/33)<.01);
});

test("overlay flags a stopped WebGL RAF loop instead of displaying a dash forever",()=>{
    const {root,fields}=fixture();
    let current=0,update;
    const overlay=new GamePerformanceOverlay(root,{now:()=>current,
        interval:fn=>{update=fn;return 9;},clear:()=>{}});
    overlay.start();overlay.frame(100);overlay.frame(116);
    current=1000;update();assert.equal(fields.fps.textContent,"62.5");
    current=5000;update();assert.equal(fields.fps.textContent,"STOP");
    overlay.dispose();
});

test("HTTPS network round-trip is labelled NET, measured sparsely, and never called per frame",async()=>{
    let current=1000,requests=0,refresh;
    const roundTrip=await measurePreviewLatency({
        now:()=>{current+=7;return current;},
        fetcher:async(path,options)=>{
            assert.equal(path,"/ping");
            assert.equal(options.credentials,"omit");
            assert.equal(options.cache,"no-store");
            return {status:204};
        }
    });
    assert.equal(roundTrip,7);
    await assert.rejects(measurePreviewLatency({fetcher:async()=>({status:404})}),/unavailable/);
    const {root,fields}=fixture();
    const overlay=new GamePerformanceOverlay(root,{
        now:()=>100,networkProbe:async()=>{requests++;return 8;},
        interval:fn=>{refresh=fn;return 1;},clear:()=>{}
    });
    overlay.start();await Promise.resolve();
    refresh();assert.equal(fields.net.textContent,"8 ms");
    assert.equal(requests,1);
    for(let i=0;i<200;i++)overlay.frame(i*16.67);
    for(let i=0;i<4;i++)refresh();
    await Promise.resolve();
    assert.equal(requests,2,"only one network probe every 5 refreshes");
    overlay.dispose();
    assert.equal(root.hidden,true);
});
