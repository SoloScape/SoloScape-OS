// The original revision-240 client owns Classic and Modern resizable layouts.
// This adapter only passes the browser's CSS-pixel viewport to its existing
// Java AWT resizeCanvas path, and changes the page's presentation bounds.
export function originalViewportSize(width,height){
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
    // Preserve one scale on both axes, including native minimum-size expansion
    // on phones and bounded framebuffer reduction on large desktop displays.
    const scale=Math.max(765/width,503/height,Math.min(1,2048/width,2048/height));
    const w=Math.round(width*scale),h=Math.round(height*scale);
    return w<=2048&&h<=2048?{width:w,height:h}:null;
}

// Allow a brief original window-mode transition without collapsing a
// touch-screen gameframe. Intentional Fixed mode remains available afterward.
export const ORIGINAL_RESIZE_TRANSITION_MS=1500;
export function attachOriginalResizableLayout({
    canvas,body,engine,getGameState,
    viewport=()=>canvas.getBoundingClientRect(),
    now=()=>Date.now(),
    // Match the CSS landscape-only overlay. On real touch devices, never
    // resize the original Java framebuffer to a portrait aspect ratio.
    isPortraitTouch=()=>globalThis.matchMedia?.("(orientation: portrait) and (pointer: coarse)")?.matches===true,
    addResize=handler=>{
        globalThis.addEventListener("resize",handler);
        globalThis.visualViewport?.addEventListener("resize",handler);
    },
    removeResize=handler=>{
        globalThis.removeEventListener("resize",handler);
        globalThis.visualViewport?.removeEventListener("resize",handler);
    }
}={}){
    if(!canvas||!body||!engine||typeof getGameState!=="function")
        throw new Error("Original resizable layout needs the original engine and canvas");
    let resized=false,lastWidth=0,lastHeight=0,fixedSince=null;
    const apply=()=>{
        // The rotate-device screen intercepts portrait input. Preserve the
        // previous landscape Java framebuffer while the handset is rotated;
        // when it returns to landscape, the resize event recomputes dimensions.
        if(isPortraitTouch()){
            fixedSince=null;
            if(resized)body.classList.add("original-resizable");
            return;
        }
        const gameState=getGameState();
        // Login/challenge, authenticator, region loading and world hopping are
        // not fixed-size screens. Keep the last native viewport and CSS mode
        // while the Java client passes through these temporary states. In
        // particular, LOGGING_IN must not undo the fullscreen LOGIN_SCREEN.
        const transitioning=gameState==="LOGGING_IN"||
            gameState==="LOGIN_SCREEN_AUTHENTICATOR"||
            gameState==="LOADING"||gameState==="HOPPING"||
            gameState==="CONNECTION_LOST"||gameState==="STARTING"||
            gameState==="UNKNOWN";
        if(transitioning){
            fixedSince=null;
            if(resized)body.classList.add("original-resizable");
            return;
        }
        // Use the same native resizable viewport for the authentic Java title
        // and login screen as the logged-in mobile game. Do not scale a fixed
        // 765x503 picture to a different aspect ratio.
        const gameVisible=gameState==="LOGIN_SCREEN"||gameState==="LOGGED_IN";
        const resizable=gameVisible&&engine.isResizableMode();
        // The rev-240 Java window flag can be cleared by logout before the
        // LOGIN_SCREEN renderer reasserts mobile window mode. A returning
        // title must NEVER snap to 765x503 during that handshake. Retain the
        // fullscreen surface until the original client restores its flag.
        if(resized&&gameState==="LOGIN_SCREEN"&&!resizable){
            fixedSince=null;
            body.classList.add("original-resizable");
            return;
        }
        if(!resizable){
            if(resized&&gameVisible){
                if(fixedSince===null)fixedSince=now();
                if(now()-fixedSince<ORIGINAL_RESIZE_TRANSITION_MS)return;
            }
            fixedSince=null;
            if(resized){
                resized=false;
                lastWidth=0;lastHeight=0;
                body.classList.remove("original-resizable");
                // Returning to Fixed requests the authentic 765x503 game canvas.
                engine.resizeOriginalViewport(765,503);
            }
            return;
        }
        fixedSince=null;
        body.classList.add("original-resizable");
        const v=viewport(),size=originalViewportSize(v.width,v.height);
        if(!size){
            if(!resized)body.classList.remove("original-resizable");
            return;
        }
        const {width,height}=size;
        // Settings may recreate/reduce the Java canvas without changing the
        // browser viewport; always repair that mismatch instead of trusting
        // the last dimensions we asked for.
        const physicalCanvasKnown=Number.isInteger(canvas.width)&&Number.isInteger(canvas.height);
        const dimensionsMatch=!physicalCanvasKnown||
            (canvas.width===width&&canvas.height===height);
        if(resized&&width===lastWidth&&height===lastHeight&&dimensionsMatch)return;
        if(!engine.resizeOriginalViewport(width,height)){
            if(!resized)body.classList.remove("original-resizable");
            return;
        }
        lastWidth=width;lastHeight=height;resized=true;
        body.classList.add("original-resizable");
    };
    addResize(apply);
    return {update:apply,dispose(){
        removeResize(apply);
        body.classList.remove("original-resizable");
    }};
}
