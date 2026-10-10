// Finger-distance camera controls for the AUTHENTIC revision-240 Java client.
// Every drag delta goes through its injected RuneLite Client yaw/pitch targets.
// No canvas frame, game object, protocol packet or credential is replaced.
export const CAMERA_HOLD_MS=320;
export const CAMERA_DRAG_START_PX=12;
export const CAMERA_YAW_UNITS_PER_PIXEL=4;
export const CAMERA_PITCH_UNITS_PER_PIXEL=1.75;
export function attachOriginalTouchCamera({
    canvas,getGameState,rotateCamera,
    page=globalThis,
    schedule=(callback,ms)=>setTimeout(callback,ms),
    cancel=handle=>clearTimeout(handle),
    now=()=>Date.now()
}={}){
    if(!canvas||typeof getGameState!=="function"||typeof rotateCamera!=="function")
        throw new Error("Original camera drag requires the Java client and canvas");
    let finger=null,hold=null,active=false,swallowUntil=0;
    const registered=[];
    const listen=(node,type,fn,options)=>{
        node?.addEventListener?.(type,fn,options);
        registered.push([node,type,fn,options]);
    };
    const clearFinger=()=>{
        if(hold!==null){cancel(hold);hold=null;}
        if(finger){
            try{canvas.releasePointerCapture?.(finger.id);}catch{}
        }
        finger=null;active=false;
    };
    const validScenePoint=e=>{
        const r=canvas.getBoundingClientRect();
        if(!(r.width>0&&r.height>0))return false;
        const x=(e.clientX-r.left)*canvas.width/r.width;
        const y=(e.clientY-r.top)*canvas.height/r.height;
        if(x<0||y<0||x>=canvas.width||y>=canvas.height)return false;
        // Keep minimap, inventory and chat as the original Java UI.
        if(canvas.width<=765&&canvas.height<=503)return x<516&&y<338;
        return x<canvas.width-220&&y<canvas.height-160;
    };
    const down=e=>{
        if(e.pointerType!=="touch"||e.isPrimary===false||
            getGameState()!=="LOGGED_IN"||finger||!validScenePoint(e))return;
        swallowUntil=0;
        finger={id:e.pointerId,startX:e.clientX,startY:e.clientY,
            x:e.clientX,y:e.clientY,yawFraction:0,pitchFraction:0};
        try{canvas.setPointerCapture?.(finger.id);}catch{}
        hold=schedule(()=>{
            hold=null;
            if(finger&&getGameState()==="LOGGED_IN")active=true;
        },CAMERA_HOLD_MS);
        // Quick taps must still reach the original native mouse handler.
    };
    const move=e=>{
        if(!finger||e.pointerId!==finger.id)return;
        if(getGameState()!=="LOGGED_IN"){clearFinger();return;}
        if(!active){
            const totalX=e.clientX-finger.startX;
            const totalY=e.clientY-finger.startY;
            if(Math.hypot(totalX,totalY)<CAMERA_DRAG_START_PX)return;
            active=true;
            if(hold!==null){cancel(hold);hold=null;}
        }
        if(e.cancelable)e.preventDefault();
        const deltaX=e.clientX-finger.x,deltaY=e.clientY-finger.y;
        finger.x=e.clientX;finger.y=e.clientY;
        // Preserve fractions so slow, small drags produce the same angle
        // as one long fast drag. Never scale by touch-event frequency/time.
        const yaw=-deltaX*CAMERA_YAW_UNITS_PER_PIXEL+finger.yawFraction;
        const pitch=-deltaY*CAMERA_PITCH_UNITS_PER_PIXEL+finger.pitchFraction;
        const stepYaw=Math.trunc(yaw),stepPitch=Math.trunc(pitch);
        finger.yawFraction=yaw-stepYaw;
        finger.pitchFraction=pitch-stepPitch;
        if(stepYaw||stepPitch)rotateCamera(stepYaw,stepPitch);
    };
    const end=e=>{
        if(!finger||e.pointerId!==finger.id)return;
        if(active){
            swallowUntil=now()+600;
            if(e.cancelable)e.preventDefault();
        }
        clearFinger();
    };
    const suppressCompatibility=e=>{
        if(active||now()<swallowUntil){
            if(e.cancelable)e.preventDefault();
            e.stopImmediatePropagation?.();
        }
    };
    const context=e=>{
        if(getGameState()!=="LOGGED_IN")return;
        if(e.cancelable)e.preventDefault();
        if(active)e.stopImmediatePropagation?.();
    };
    const selection=e=>{if(e.cancelable)e.preventDefault();};
    listen(canvas,"pointerdown",down,{capture:true,passive:true});
    listen(canvas,"pointermove",move,{capture:true,passive:false});
    listen(page,"pointerup",end,{capture:true,passive:false});
    listen(page,"pointercancel",end,{capture:true,passive:false});
    for(const type of ["mousedown","mouseup","click","dblclick"])
        listen(canvas,type,suppressCompatibility,{capture:true,passive:false});
    listen(canvas,"contextmenu",context,{capture:true,passive:false});
    listen(canvas,"selectstart",selection,{capture:true,passive:false});
    listen(page,"blur",clearFinger);
    listen(page,"pagehide",clearFinger);
    return {
        update:()=>{if(getGameState()!=="LOGGED_IN")clearFinger();},
        dispose:()=>{
            clearFinger();
            for(const [node,type,fn,options] of registered)
                node?.removeEventListener?.(type,fn,options);
        }
    };
}
