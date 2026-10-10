// Original RuneScape game owns the camera. On touch-only browser login,
// nudge its EXISTING Java AWT mouse-wheel input path once, after world entry.
// Do not patch the obfuscated camera, draw a replacement view or handle login.
export const INITIAL_TOUCH_CAMERA_WHEEL_STEPS=8;
export function attachOriginalLoginCamera({
    canvas,getGameState,
    isTouchDevice=()=>globalThis.matchMedia?.("(pointer: coarse)")?.matches===true,
    createWheel=options=>new WheelEvent("wheel",options),
    schedule=(callback,ms)=>setTimeout(callback,ms),
    cancel=handle=>clearTimeout(handle)
}={}){
    if(!canvas||typeof getGameState!=="function")
        throw new Error("Original login camera requires the original canvas and state");
    let previous="UNAVAILABLE",pending=null,manualZoom=false,applied=0;
    const onWheel=event=>{
        if(event.isTrusted&&pending!==null){
            manualZoom=true;
            cancel(pending);
            pending=null;
        }
    };
    canvas.addEventListener("wheel",onWheel,{passive:true});
    function observe(state){
        if(state===previous)return;
        const wasLoggedIn=previous==="LOGGED_IN";
        previous=state;
        if(pending!==null){cancel(pending);pending=null;}
        if(state!=="LOGGED_IN"){
            manualZoom=false;
            return;
        }
        if(wasLoggedIn||!isTouchDevice()||manualZoom)return;
        // Allow the original login/region camera initialization to complete.
        // One shot per successful entry; never fight subsequent user input.
        pending=schedule(()=>{
            pending=null;
            if(getGameState()!=="LOGGED_IN"||manualZoom)return;
            const bounds=canvas.getBoundingClientRect();
            if(!(bounds.width>0&&bounds.height>0))return;
            for(let i=0;i<INITIAL_TOUCH_CAMERA_WHEEL_STEPS;i++){
                const event=createWheel({
                    bubbles:true,cancelable:true,deltaY:-120,deltaMode:0,
                    clientX:bounds.left+bounds.width*.5,
                    clientY:bounds.top+bounds.height*.42
                });
                canvas.dispatchEvent(event);
                applied++;
            }
        },450);
    }
    function dispose(){
        if(pending!==null){cancel(pending);pending=null;}
        canvas.removeEventListener("wheel",onWheel);
    }
    return {observe,dispose,get applied(){return applied;}};
}
