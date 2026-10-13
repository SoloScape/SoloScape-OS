// ClientState.mouseCrossState-compatible 100ms yellow click feedback.
// The current pinned TSPS MouseCross.ts draws a shrinking 24->8px X.
export const CLICK_CROSS_DURATION_MS=100;
export function clickCrossAppearance(elapsedMs){
    const t=Math.min(1,Math.max(0,elapsedMs/CLICK_CROSS_DURATION_MS));
    return {size:24-16*t,alpha:1-t*.5,visible:elapsedMs>=0&&elapsedMs<CLICK_CROSS_DURATION_MS};
}
export class NativeClickCross {
    constructor(canvas,{now=()=>performance.now(),schedule=fn=>requestAnimationFrame(fn),
            unschedule=id=>cancelAnimationFrame(id)}={}){
        this.canvas=canvas;this.ctx=canvas.getContext("2d");if(!this.ctx)throw new Error("Click feedback canvas unavailable");
        this.now=now;this.schedule=schedule;this.unschedule=unschedule;this.active=null;this.frame=null;
    }
    show(x,y,color="#ffff00"){
        if(!Number.isFinite(x)||!Number.isFinite(y))return;
        this.active={x,y,color,started:this.now()};
        this.render();
    }
    render(){
        if(this.frame!==null){this.unschedule(this.frame);this.frame=null;}
        const parent=this.canvas.parentElement,ratio=Math.min(3,window.devicePixelRatio||1),
            width=parent.clientWidth,height=parent.clientHeight;
        const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
        if(this.canvas.width!==w)this.canvas.width=w;
        if(this.canvas.height!==h)this.canvas.height=h;
        const ctx=this.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
        if(!this.active)return;
        const {x,y,color,started}=this.active;
        const style=clickCrossAppearance(this.now()-started);
        if(!style.visible){this.active=null;return;}
        const half=style.size/2;
        ctx.save();ctx.globalAlpha=style.alpha;ctx.strokeStyle=color;ctx.fillStyle=color;
        ctx.lineWidth=2;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(x-half,y-half);ctx.lineTo(x+half,y+half);
        ctx.moveTo(x+half,y-half);ctx.lineTo(x-half,y+half);ctx.stroke();
        ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.restore();
        this.frame=this.schedule(()=>{this.frame=null;this.render();});
    }
    clear(){
        this.active=null;
        if(this.frame!==null){this.unschedule(this.frame);this.frame=null;}
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    dispose(){this.clear();}
}
