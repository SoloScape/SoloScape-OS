// Keep touch-and-hold separate from the renderer so synthetic pointer
// sequences can validate cancellation without a WebGL/browser dependency.
export const NPC_HOLD_DELAY_MS=475;
export class NpcLongPress {
    constructor(onHold,{schedule=setTimeout,unschedule=clearTimeout,delay=NPC_HOLD_DELAY_MS,slop=7}={}){
        this.onHold=onHold;this.schedule=schedule;this.unschedule=unschedule;this.delay=delay;this.slop=slop;
        this.pending=null;this.timer=null;
    }
    start(id,x,y,npc){
        this.cancel();
        if(npc===null||npc===undefined)return;
        const pending={id,x,y,npc,held:false};
        this.pending=pending;
        this.timer=this.schedule(()=>{
            this.timer=null;
            if(this.pending!==pending)return;
            pending.held=true;
            this.onHold(pending.npc);
        },this.delay);
    }
    move(id,x,y){
        const p=this.pending;
        if(p?.id===id&&Math.hypot(x-p.x,y-p.y)>this.slop)this.cancel();
    }
    finish(id){
        const held=this.pending?.id===id&&this.pending.held===true;
        this.cancel();return held;
    }
    cancel(){
        if(this.timer!==null)this.unschedule(this.timer);
        this.timer=null;this.pending=null;
    }
}
