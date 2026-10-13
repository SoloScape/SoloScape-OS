// Finger-distance camera controls for the AUTHENTIC revision-240 Java client.
// Every drag delta goes through its injected RuneLite Client yaw/pitch targets.
// No canvas frame, game object, protocol packet or credential is replaced.
// Stationary touch opens the original Java right-click menu, while a moving
// finger still rotates the camera. Do not let a hold silently claim the camera.
export const TOUCH_CONTEXT_HOLD_MS=500;
export const CAMERA_DRAG_START_PX=12;
export const CAMERA_YAW_UNITS_PER_PIXEL=4;
export const CAMERA_PITCH_UNITS_PER_PIXEL=1.75;
export const CAMERA_PINCH_SCALE_PER_STEP=1.08;
export function attachOriginalTouchCamera({
    canvas,getGameState,rotateCamera,
    createWheel=options=>new WheelEvent("wheel",options),
    createMouse=(type,options)=>new MouseEvent(type,options),
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
    // Synthetic mouse events must reach NativeCanvas.input; all later iOS
    // compatibility left-clicks are still suppressed after a long press.
    const nativeRightEvents=new WeakSet();
    const sendRightMouse=(type,x,y)=>{
        const mouse=createMouse(type,{bubbles:true,cancelable:true,composed:true,
            button:2,buttons:type==="mousedown"?2:0,clientX:x,clientY:y});
        nativeRightEvents.add(mouse);
        canvas.dispatchEvent(mouse);
    };
    const releaseRight=()=>{
        // The Java client already received a complete right-button click at
        // the hold threshold. Finger lift only releases the gesture lock.
        if(finger)finger.rightPressed=false;
    };
    const startContextHold=()=>{
        hold=null;
        if(!finger||pinch||remainingId!==null||active||
            finger.rightPressed||getGameState()!=="LOGGED_IN")return;
        // A still finger can start on any part of the original game canvas,
        // including inventory, minimap or chat.
        finger.rightPressed=true;
        swallowUntil=now()+800;
        try{canvas.setPointerCapture?.(finger.id);}catch{}
        sendRightMouse("mousedown",finger.x,finger.y);
        // Complete the click *now*, not when the finger eventually lifts.
        // The original Java mouse handler consumes last-pressed coordinates
        // on its next game tick; iOS users must see the menu while holding.
        sendRightMouse("mouseup",finger.x,finger.y);
    };
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
            // Use the normal midpoint while it remains over the world;
            // otherwise anchor the synthetic native wheel over the scene,
            // not inventory/chat, regardless of pinch direction.
            const middle={clientX:(finger.x+pinch.x)/2,
                clientY:(finger.y+pinch.y)/2};
            const wheelPoint=validScenePoint(middle)?middle:
                {clientX:pinch.anchorX,clientY:pinch.anchorY};
            for(let i=0;i<Math.abs(steps);i++)canvas.dispatchEvent(createWheel({
                bubbles:true,cancelable:true,deltaY:Math.sign(steps)*120,deltaMode:0,
                clientX:wheelPoint.clientX,clientY:wheelPoint.clientY
            }));
        }
        pinch.distance=distance;
    };
    const queuePinch=()=>{
        if(frame===null)frame=scheduleFrame(flushPinch);
    };
    // A native mouse wheel is location-sensitive: over inventory/chat it can
    // scroll the interface rather than zoom the original camera. Resolve the
    // pinch's wheel anchor to the game scene, independent of finger angle.
    const sceneAnchor=(first,second)=>{
        const rect=canvas.getBoundingClientRect();
        const scene=e=>validScenePoint(e);
        if(scene(first))return {x:first.clientX,y:first.clientY};
        if(scene(second))return {x:second.clientX,y:second.clientY};
        const fixed=canvas.width<=765&&canvas.height<=503;
        const nativeX=fixed?Math.min(258,canvas.width*.5):Math.max(0,(canvas.width-220)*.5);
        const nativeY=fixed?Math.min(169,canvas.height*.35):Math.max(0,(canvas.height-160)*.5);
        return {x:rect.left+nativeX*rect.width/canvas.width,
            y:rect.top+nativeY*rect.height/canvas.height};
    };
    const clearFinger=()=>{
        if(active||pinch||remainingId!==null||finger?.rightPressed)
            swallowUntil=now()+600;
        releaseRight();
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
            if(finger.rightPressed){
                // Context menu is already open. A late extra touch must not
                // turn the held right button into a camera/pinch gesture.
                if(e.cancelable)e.preventDefault();
                return;
            }
            if(hold!==null){cancel(hold);hold=null;}
            active=false;
            const anchor=sceneAnchor(
                {clientX:finger.x,clientY:finger.y},e);
            pinch={id:e.pointerId,x:e.clientX,y:e.clientY,
                distance:Math.hypot(e.clientX-finger.x,e.clientY-finger.y),
                fraction:0,anchorX:anchor.x,anchorY:anchor.y};
            // First touch may have started on inventory/chat. Capture it only
            // after a real second finger confirms a pinch; single UI taps
            // must retain their original game interaction.
            if(!finger.scene){
                try{canvas.setPointerCapture?.(finger.id);}catch{}
            }
            try{canvas.setPointerCapture?.(pinch.id);}catch{}
            onZoomGesture();
            if(e.cancelable)e.preventDefault();
            return;
        }
        if(e.isPrimary===false)return;
        // Track the first touch anywhere *on the original canvas*. A second
        // contact may now start a pinch regardless of orientation or whether
        // the first finger landed over inventory, minimap, or chat. A single
        // touch outside the scene never starts camera rotation.
        const inScene=validScenePoint(e);
        swallowUntil=0;
        finger={id:e.pointerId,startX:e.clientX,startY:e.clientY,
            x:e.clientX,y:e.clientY,scene:inScene,rightPressed:false,
            yawFraction:0,pitchFraction:0};
        if(inScene){
            try{canvas.setPointerCapture?.(finger.id);}catch{}
        }
        hold=schedule(startContextHold,TOUCH_CONTEXT_HOLD_MS);
        // Quick taps must still reach the original native mouse handler.
    };
    const move=e=>{
        // The window capture listener sees the same event before the canvas;
        // handle it once even when pointer capture is working correctly.
        if(e===lastMoveEvent)return;
        lastMoveEvent=e;
        if(!finger||(e.pointerId!==finger.id&&e.pointerId!==pinch?.id))return;
        if(getGameState()!=="LOGGED_IN"){clearFinger();return;}
        if(finger.rightPressed){
            if(e.cancelable)e.preventDefault();
            return;
        }
        if(pinch){
            if(e.cancelable)e.preventDefault();
            const point=e.pointerId===finger.id?finger:pinch;
            point.x=e.clientX;point.y=e.clientY;
            queuePinch();
            return;
        }
        // Any swipe beyond the camera threshold must cancel the pending
        // menu hold, including moves starting over the original UI.
        const totalX=e.clientX-finger.startX;
        const totalY=e.clientY-finger.startY;
        if(Math.hypot(totalX,totalY)>=CAMERA_DRAG_START_PX&&hold!==null){
            cancel(hold);hold=null;
        }
        if(!finger.scene){
            // The first touch was on the original UI. Keep its position
            // current for a later second finger, but do not rotate the camera
            // or suppress ordinary inventory/chat drag/tap behaviour.
            finger.x=e.clientX;finger.y=e.clientY;
            return;
        }
        if(!active){
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
        if(active||finger.rightPressed){
            swallowUntil=now()+600;
            if(e.cancelable)e.preventDefault();
        }
        clearFinger();
    };
    const suppressCompatibility=e=>{
        if(nativeRightEvents.has(e))return;
        if(active||finger?.rightPressed||pinch||remainingId!==null||now()<swallowUntil){
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
