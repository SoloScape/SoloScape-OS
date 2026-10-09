// Low-overhead diagnostics for the cache-backed mobile world.
// FPS and frame ms are measured from the WebGL requestAnimationFrame loop;
// draw ms is synchronous CPU/WebGL submission time, not GPU completion time.
// NET measures an HTTPS round trip to this client's LAN preview server,
// not the RuneScape game server's ping. Safari hides JS heap usage.
const keep=(values,value,limit)=>{values.push(value);if(values.length>limit)values.shift();};
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export async function measurePreviewLatency({fetcher=globalThis.fetch,now=()=>globalThis.performance.now()}={}){
    const start=now();
    const result=await fetcher("/ping",{cache:"no-store",credentials:"omit"});
    if(result.status!==204)throw new Error("SoloScape latency endpoint unavailable");
    return Math.max(0,now()-start);
}
export class GamePerformanceMetrics {
    constructor({memory=()=>globalThis.performance?.memory?.usedJSHeapSize,hidden=()=>Boolean(globalThis.document?.hidden)}={}){
        this.memory=memory;this.hidden=hidden;this.reset();
    }
    reset(){
        this.previousFrame=null;this.previousTick=null;
        this.frameIntervals=[];this.drawIntervals=[];this.tickIntervals=[];this.ticks=0;
    }
    recordFrame(timestamp){
        if(!Number.isFinite(timestamp))return;
        if(this.hidden()){
            this.previousFrame=null;this.frameIntervals.length=0;return;
        }
        if(this.previousFrame!==null){
            const delta=timestamp-this.previousFrame;
            // Only discard a true suspension (>5 seconds), not actual 1-4fps
            // rendering. The previous 250ms cutoff hid severely laggy frames.
            if(delta>5000)this.frameIntervals.length=0;
            else if(delta>0)keep(this.frameIntervals,delta,45);
        }
        this.previousFrame=timestamp;
    }
    recordDraw(duration){
        if(Number.isFinite(duration)&&duration>=0)keep(this.drawIntervals,duration,30);
    }
    recordTick(timestamp){
        if(!Number.isFinite(timestamp))return;
        this.ticks++;
        if(this.previousTick!==null){
            const delta=timestamp-this.previousTick;
            if(delta>3000)this.tickIntervals.length=0;
            else if(delta>0)keep(this.tickIntervals,delta,10);
        }
        this.previousTick=timestamp;
    }
    snapshot(){
        const frameMs=average(this.frameIntervals);
        let heapBytes=null;
        try{
            const raw=this.memory?.();
            if(Number.isFinite(raw)&&raw>=0)heapBytes=raw;
        }catch{/* Memory use may be unavailable in Safari. */}
        return {fps:frameMs===null?null:1000/frameMs,frameMs,
            heapBytes,ticks:this.ticks,tickMs:average(this.tickIntervals),drawMs:average(this.drawIntervals)};
    }
}
export class GamePerformanceOverlay {
    constructor(root,{metrics=new GamePerformanceMetrics(),timers=globalThis,
        interval=(callback,delay)=>timers.setInterval(callback,delay),
        clear=id=>timers.clearInterval(id),now=()=>globalThis.performance.now(),
        networkProbe=null}={}){
        if(!root)throw new Error("Performance overlay root required");
        this.root=root;this.metrics=metrics;this.interval=interval;this.clear=clear;
        this.now=now;this.networkProbe=networkProbe;
        this.button=root.querySelector("#world-performance-toggle");
        this.details=root.querySelector("#world-performance-stats");
        this.fields=Object.fromEntries(["fps","ram","tick","ms","draw","net","gl"].map(name=>
            [name,root.querySelector('[data-perf="'+name+'"]')]));
        if(!this.button||!this.details||Object.values(this.fields).some(value=>!value))
            throw new Error("Performance overlay elements unavailable");
        this.toggle=()=>{
            this.details.hidden=!this.details.hidden;
            this.button.setAttribute("aria-expanded",String(!this.details.hidden));
        };
        this.running=false;this.timer=null;this.runId=0;
        this.net=null;this.netFailed=false;this.probing=false;this.refreshCount=0;this.calls=null;
    }
    start(){
        if(this.running)return;
        this.metrics.reset();this.running=true;this.runId++;
        this.startedAt=this.now();this.net=null;this.netFailed=false;this.refreshCount=0;this.calls=null;
        this.details.hidden=false;this.root.hidden=false;
        this.button.setAttribute("aria-expanded","true");
        this.button.addEventListener("click",this.toggle);
        this.refresh();
        this.timer=this.interval(()=>this.refresh(),1000);
    }
    frame(timestamp){if(this.running)this.metrics.recordFrame(timestamp);}
    draw(duration){if(this.running)this.metrics.recordDraw(duration);}
    drawCalls(count){if(this.running&&Number.isInteger(count)&&count>=0)this.calls=count;}
    tick(timestamp){if(this.running)this.metrics.recordTick(timestamp);}
    async sampleNetwork(){
        if(!this.running||this.probing||!this.networkProbe)return;
        const id=this.runId;this.probing=true;
        try{
            const ms=await this.networkProbe();
            if(this.running&&id===this.runId){
                this.net=Number.isFinite(ms)&&ms>=0?ms:null;this.netFailed=this.net===null;
            }
        }catch{
            if(this.running&&id===this.runId){this.net=null;this.netFailed=true;}
        }finally{if(id===this.runId)this.probing=false;}
    }
    refresh(){
        if(!this.running)return;
        const {fps,frameMs,heapBytes,ticks,tickMs,drawMs}=this.metrics.snapshot();
        const lastFrame=this.metrics.previousFrame;
        const stopped=(this.now()-(lastFrame??this.startedAt))>2500;
        this.fields.fps.textContent=stopped?"STOP":fps===null?"—":fps.toFixed(1);
        this.fields.ram.textContent=heapBytes===null?"N/A":(heapBytes/1048576).toFixed(1)+" MB";
        this.fields.tick.textContent=tickMs===null?String(ticks):ticks+" / "+tickMs.toFixed(0)+" ms";
        this.fields.ms.textContent=stopped?"—":frameMs===null?"—":frameMs.toFixed(1);
        this.fields.draw.textContent=drawMs===null?"—":drawMs.toFixed(1);
        this.fields.gl.textContent=this.calls===null?"—":String(this.calls);
        this.fields.net.textContent=this.net===null?(this.netFailed?"ERR":"—"):this.net.toFixed(0)+" ms";
        // Never send a probe per frame. One same-origin HTTPS request every 5s.
        if(this.networkProbe&&this.refreshCount++%5===0)void this.sampleNetwork();
    }
    dispose(){
        if(!this.running)return;
        this.running=false;this.runId++;this.probing=false;
        this.clear(this.timer);this.timer=null;
        this.button.removeEventListener("click",this.toggle);
        this.root.hidden=true;this.metrics.reset();
    }
}
