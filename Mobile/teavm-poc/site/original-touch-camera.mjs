// Touch-only adapter: a quick swipe or held drag on the ORIGINAL Java game canvas
// drives the original AWT arrow-key camera controls. Quick taps remain clicks.
// The adapter neither paints, reads credentials nor changes game camera fields.
export const CAMERA_HOLD_MS=320;
export const CAMERA_DRAG_START_PX=12;
export const CAMERA_RELEASE_GRACE_MS=90;
export function attachOriginalTouchCamera({
    canvas,getGameState,
    page=globalThis,
    createKeyEvent=(type,key)=>new KeyboardEvent(type,{key,bubbles:false,cancelable:true}),
    schedule=(callback,ms)=>setTimeout(callback,ms),
    cancel=handle=>clearTimeout(handle),
    now=()=>Date.now()
}={}){
    if(!canvas||typeof getGameState!=="function")
        throw new Error("Original touch camera requires the original canvas");
    let finger=null,hold=null,idle=null,active=false,swallowUntil=0;
    const pressed=new Set(),registered=[];
    const listen=(node,type,fn,options)=>{
        node?.addEventListener?.(type,fn,options);
        registered.push([node,type,fn,options]);
    };
    const releaseKeys=()=>{
        if(idle!==null){cancel(idle);idle=null;}
        for(const key of pressed)canvas.dispatchEvent(createKeyEvent("keyup",key));
        pressed.clear();
    };
    const holdKey=(key)=>{
        if(pressed.has(key))return;
        canvas.dispatchEvent(createKeyEvent("keydown",key));
        pressed.add(key);
    };
    const clearFinger=({allowFinalTick=false}={})=>{
        if(hold!==null){cancel(hold);hold=null;}
        if(allowFinalTick&&pressed.size){
            // A rapid swipe may begin and end between two native 20 ms game
            // ticks. Keep the original key state briefly for the next tick.
            if(idle!==null)cancel(idle);
            idle=schedule(releaseKeys,CAMERA_RELEASE_GRACE_MS);
        }else releaseKeys();
        finger=null;active=false;
    };
    const validScenePoint=(e)=>{
        const r=canvas.getBoundingClientRect();
        if(!(r.width>0&&r.height>0))return false;
        const x=(e.clientX-r.left)*canvas.width/r.width;
        const y=(e.clientY-r.top)*canvas.height/r.height;
        if(x<0||y<0||x>=canvas.width||y>=canvas.height)return false;
        // Keep inventory, minimap and chat long-presses available. In Fixed
        // mode the 3D viewport is approximately 516x338 original pixels.
        if(canvas.width<=765&&canvas.height<=503)return x<516&&y<338;
        return x<canvas.width-220&&y<canvas.height-160;
    };
    const down=e=>{
        if(e.pointerType!=="touch"||e.isPrimary===false||
            getGameState()!=="LOGGED_IN"||finger||!validScenePoint(e))return;
        releaseKeys(); // End any brief previous-swipe hold before a new touch.
        swallowUntil=0; // A new quick tap is never swallowed by an old swipe.
        finger={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};
        // Capture moves that stray outside the visible 3D scene on Safari.
        try{canvas.setPointerCapture?.(finger.id);}catch{}
        hold=schedule(()=>{
            hold=null;
            if(!finger||getGameState()!=="LOGGED_IN")return;
            active=true;
            try{canvas.setPointerCapture?.(finger.id);}catch{}
        },CAMERA_HOLD_MS);
        // Do not prevent pointerdown: Safari must still generate the original
        // game's ordinary click for quick walk, item and interface taps.
    };
    const move=e=>{
        if(!finger||e.pointerId!==finger.id)return;
        const dx=e.clientX-finger.x,dy=e.clientY-finger.y;
        if(!active){
            // An intentional swipe begins camera rotation immediately.
            // Still allow tiny finger drift to end as a native walk tap.
            const totalX=e.clientX-finger.startX,totalY=e.clientY-finger.startY;
            if(Math.hypot(totalX,totalY)<CAMERA_DRAG_START_PX)return;
            active=true;
            if(hold!==null){cancel(hold);hold=null;}
        }
        if(e.cancelable)e.preventDefault();
        finger.x=e.clientX;finger.y=e.clientY;
        if(Math.abs(dx)<5&&Math.abs(dy)<5)return;
        // The original revision-240 game responds to AWT arrow keys for
        // camera yaw/pitch. Never write its private camera coordinates.
        const desired=new Set();
        if(Math.abs(dx)>=5)desired.add(dx>0?"ArrowRight":"ArrowLeft");
        if(Math.abs(dy)>=5)desired.add(dy>0?"ArrowDown":"ArrowUp");
        for(const key of [...pressed]){
            if(!desired.has(key)){
                canvas.dispatchEvent(createKeyEvent("keyup",key));
                pressed.delete(key);
            }
        }
        for(const key of desired)holdKey(key);
        if(idle!==null)cancel(idle);
        idle=schedule(releaseKeys,100);
    };
    const end=e=>{
        if(!finger||e.pointerId!==finger.id)return;
        if(active){
            swallowUntil=now()+700;
            if(e.cancelable)e.preventDefault();
            try{canvas.releasePointerCapture?.(finger.id);}catch{}
        }
        clearFinger({allowFinalTick:active&&e.type==="pointerup"});
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
    const onBlur=()=>clearFinger();
    listen(page,"blur",onBlur);
    listen(page,"pagehide",onBlur);
    return {update:()=>{if(getGameState()!=="LOGGED_IN")clearFinger();},
        dispose:()=>{
            clearFinger();
            for(const [node,type,fn,options] of registered)
                node?.removeEventListener?.(type,fn,options);
        }
    };
}
