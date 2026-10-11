// Finger-distance camera controls for the AUTHENTIC revision-240 Java client.
// Every drag delta goes through its injected RuneLite Client yaw/pitch targets.
// No canvas frame, game object, protocol packet or credential is replaced.
export const CAMERA_HOLD_MS=320;
export const CAMERA_DRAG_START_PX=12;
export const CAMERA_YAW_UNITS_PER_PIXEL=4;
export const CAMERA_PITCH_UNITS_PER_PIXEL=1.75;
export const CAMERA_PINCH_SCALE_PER_STEP=1.08;
export function attachOriginalTouchCamera({
    canvas,getGameState,rotateCamera,
    createWheel=options=>new WheelEvent("wheel",options),
    onZoomGesture=()=>{},
    page=globalThis,
    schedule=(callback,ms)=>setTimeout(callback,ms),
    cancel=handle=>clearTimeout(handle),
    scheduleFrame=callback=>requestAnimationFrame(callback),
    cancelFrame=handle=>cancelAnimationFrame(handle),
    now=()=>Date.now()
}={}){
    if(!canvas||typeof getGameState!=="function"||typeof rotateCamera!=="function")
        throw new Error("Original camera drag requires the Java client and canvas");
    let finger=null,pinch=null,remainingId=null,hold=null,frame=null;
    let active=false,swallowUntil=0,lastMoveEvent=null;
    const registered=[];
    const listen=(node,type,fn,options)=>{
        node?.addEventListener?.(type,fn,options);
        registered.push([node,type,fn,options]);
    };
    // Read both finger positions once per display frame. Sequential pointer
    // events from a two-finger pan must not create alternating zoom detents.
    const flushPinch=()=>{
        if(frame!==null){cancelFrame(frame);frame=null;}
        if(!finger||!pinch||getGameState()!=="LOGGED_IN")return;
        const distance=Math.hypot(pinch.x-finger.x,pinch.y-finger.y);
        if(distance>=8&&pinch.distance>=8){
            const delta=Math.log(pinch.distance/distance)/
                Math.log(CAMERA_PINCH_SCALE_PER_STEP)+pinch.fraction;
            const steps=Math.max(-32,Math.min(32,Math.trunc(delta)));
            pinch.fraction=delta-steps;
            for(let i=0;i<Math.abs(steps);i++)canvas.dispatchEvent(createWheel({
                bubbles:true,cancelable:true,deltaY:Math.sign(steps)*120,deltaMode:0,
                clientX:(finger.x+pinch.x)/2,clientY:(finger.y+pinch.y)/2
            }));
        }
        pinch.distance=distance;
    };
    const queuePinch=()=>{
        if(frame===null)frame=scheduleFrame(flushPinch);
    };
    const clearFinger=()=>{
        if(active||pinch||remainingId!==null)swallowUntil=now()+600;
        if(hold!==null){cancel(hold);hold=null;}
        if(frame!==null){cancelFrame(frame);frame=null;}
        if(finger){
            try{canvas.releasePointerCapture?.(finger.id);}catch{}
        }
        if(pinch){
            try{canvas.releasePointerCapture?.(pinch.id);}catch{}
        }
        finger=null;pinch=null;remainingId=null;active=false;lastMoveEvent=null;
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
        if(e.pointerType!=="touch"||getGameState()!=="LOGGED_IN")return;
        // After an OS pointercancel, the surviving finger's pointerup may
        // never arrive. A new primary touch must not leave controls locked.
        if(remainingId!==null){
            if(e.isPrimary===false)return;
            remainingId=null;
        }
        if(finger){
            if(pinch||e.pointerId===finger.id)return;
            if(hold!==null){cancel(hold);hold=null;}
            active=false;
            pinch={id:e.pointerId,x:e.clientX,y:e.clientY,
                distance:Math.hypot(e.clientX-finger.x,e.clientY-finger.y),fraction:0};
            try{canvas.setPointerCapture?.(pinch.id);}catch{}
            onZoomGesture();
            if(e.cancelable)e.preventDefault();
            return;
        }
        if(e.isPrimary===false||!validScenePoint(e))return;
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
        // The window capture listener sees the same event before the canvas;
        // handle it once even when pointer capture is working correctly.
        if(e===lastMoveEvent)return;
        lastMoveEvent=e;
        if(!finger||(e.pointerId!==finger.id&&e.pointerId!==pinch?.id))return;
        if(getGameState()!=="LOGGED_IN"){clearFinger();return;}
        if(pinch){
            if(e.cancelable)e.preventDefault();
            const point=e.pointerId===finger.id?finger:pinch;
            point.x=e.clientX;point.y=e.clientY;
            queuePinch();
            return;
        }
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
        const pitch=deltaY*CAMERA_PITCH_UNITS_PER_PIXEL+finger.pitchFraction;
        const stepYaw=Math.trunc(yaw),stepPitch=Math.trunc(pitch);
        finger.yawFraction=yaw-stepYaw;
        finger.pitchFraction=pitch-stepPitch;
        if(stepYaw||stepPitch)rotateCamera(stepYaw,stepPitch);
    };
    const end=e=>{
        if(e.pointerId===remainingId){
            remainingId=null;swallowUntil=now()+600;
            if(e.cancelable)e.preventDefault();
            return;
        }
        if(pinch&&(e.pointerId===pinch.id||e.pointerId===finger.id)){
            // A quick pinch can finish before the next animation frame.
            flushPinch();
            const other=e.pointerId===pinch.id?finger.id:pinch.id;
            clearFinger();remainingId=other;swallowUntil=now()+600;
            if(e.cancelable)e.preventDefault();
            return;
        }
        if(!finger||e.pointerId!==finger.id)return;
        if(active){
            swallowUntil=now()+600;
            if(e.cancelable)e.preventDefault();
        }
        clearFinger();
    };
    const suppressCompatibility=e=>{
        if(active||pinch||remainingId!==null||now()<swallowUntil){
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
    // The first contact must originate in the original game viewport.
    // Once it does, accept a second contact elsewhere in the canvas/UI.
    // Window capture recovers moves even when iOS loses pointer capture.
    listen(page,"pointerdown",e=>{if(finger)down(e);},{capture:true,passive:false});
    listen(canvas,"pointerdown",down,{capture:true,passive:false});
    listen(page,"pointermove",move,{capture:true,passive:false});
    listen(canvas,"pointermove",move,{capture:true,passive:false});
    listen(page,"pointerup",end,{capture:true,passive:false});
    listen(page,"pointercancel",end,{capture:true,passive:false});
    for(const type of ["mousedown","mouseup","click","dblclick"])
        listen(canvas,type,suppressCompatibility,{capture:true,passive:false});
    listen(canvas,"contextmenu",context,{capture:true,passive:false});
    listen(canvas,"selectstart",selection,{capture:true,passive:false});
    listen(page,"blur",clearFinger);
    listen(page,"pagehide",clearFinger);
    listen(page,"resize",clearFinger);
    return {
        update:()=>{if(getGameState()!=="LOGGED_IN")clearFinger();},
        dispose:()=>{
            clearFinger();
            for(const [node,type,fn,options] of registered)
                node?.removeEventListener?.(type,fn,options);
        }
    };
}
