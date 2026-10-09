// Low-overhead diagnostics for the cache-backed mobile world.
// RAF timestamps measure visible frame pacing (not GPU time or network ping).
// PLAYER_INFO timestamps measure incoming authoritative server updates.
export class GamePerformanceMetrics {
    constructor({memory=()=>globalThis.performance?.memory?.usedJSHeapSize}={}){
        this.memory=memory;
        this.reset();
    }
    reset(){
        this.previousFrame=null;this.previousTick=null;
        this.frameIntervals=[];this.tickIntervals=[];this.ticks=0;
    }
    recordFrame(timestamp){
        if(!Number.isFinite(timestamp))return;
        if(this.previousFrame!==null){
            const delta=timestamp-this.previousFrame;
            // Ignore suspended/background tabs and reset stale FPS data.
            if(delta>250)this.frameIntervals.length=0;
            else if(delta>0&&delta<=250){
                this.frameIntervals.push(delta);
                if(this.frameIntervals.length>45)this.frameIntervals.shift();
            }
        }
        this.previousFrame=timestamp;
    }
    recordTick(timestamp){
        if(!Number.isFinite(timestamp))return;
        this.ticks++;
        if(this.previousTick!==null){
            const delta=timestamp-this.previousTick;
            if(delta>3000)this.tickIntervals.length=0;
            else if(delta>0){
                this.tickIntervals.push(delta);
                if(this.tickIntervals.length>10)this.tickIntervals.shift();
            }
        }
        this.previousTick=timestamp;
    }
    snapshot(){
        const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
        const frameMs=average(this.frameIntervals);
        let heapBytes=null;
        try{
            const raw=this.memory?.();
            if(Number.isFinite(raw)&&raw>=0)heapBytes=raw;
        }catch{/* Browser memory API can be unavailable or disabled. */}
        return {fps:frameMs===null?null:1000/frameMs,frameMs,
            heapBytes,ticks:this.ticks,tickMs:average(this.tickIntervals)};
    }
}

export class GamePerformanceOverlay {
    constructor(root,{metrics=new GamePerformanceMetrics(),interval=setInterval,clear=clearInterval}={}){
        if(!root)throw new Error("Performance overlay root required");
        this.root=root;this.metrics=metrics;this.interval=interval;this.clear=clear;
        this.button=root.querySelector("#world-performance-toggle");
        this.details=root.querySelector("#world-performance-stats");
        this.fields=Object.fromEntries(["fps","ram","tick","ms"].map(name=>
            [name,root.querySelector('[data-perf="'+name+'"]')]));
        if(!this.button||!this.details||Object.values(this.fields).some(value=>!value))
            throw new Error("Performance overlay elements unavailable");
        this.toggle=()=>{
            this.details.hidden=!this.details.hidden;
            this.button.setAttribute("aria-expanded",String(!this.details.hidden));
        };
        this.running=false;this.timer=null;
    }
    start(){
        if(this.running)return;
        this.metrics.reset();
        this.running=true;this.details.hidden=false;this.root.hidden=false;
        this.button.setAttribute("aria-expanded","true");
        this.button.addEventListener("click",this.toggle);
        this.refresh();
        // DOM and memory are read once a second, never per-render-frame.
        this.timer=this.interval(()=>this.refresh(),1000);
    }
    frame(timestamp){if(this.running)this.metrics.recordFrame(timestamp);}
    tick(timestamp){if(this.running)this.metrics.recordTick(timestamp);}
    refresh(){
        if(!this.running)return;
        const {fps,frameMs,heapBytes,ticks,tickMs}=this.metrics.snapshot();
        this.fields.fps.textContent=fps===null?"—":fps.toFixed(0);
        this.fields.ram.textContent=heapBytes===null?"N/A":(heapBytes/1048576).toFixed(1)+" MB";
        this.fields.tick.textContent=tickMs===null?String(ticks):ticks+" / "+tickMs.toFixed(0)+" ms";
        this.fields.ms.textContent=frameMs===null?"—":frameMs.toFixed(1);
    }
    dispose(){
        if(!this.running)return;
        this.running=false;this.clear(this.timer);this.timer=null;
        this.button.removeEventListener("click",this.toggle);
        this.root.hidden=true;this.metrics.reset();
    }
}
