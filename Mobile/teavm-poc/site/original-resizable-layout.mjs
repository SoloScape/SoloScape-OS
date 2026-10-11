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

export function attachOriginalResizableLayout({
    canvas,body,engine,getGameState,
    viewport=()=>canvas.getBoundingClientRect(),
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
    let resized=false,lastWidth=0,lastHeight=0;
    const apply=()=>{
        const active=getGameState()==="LOGGED_IN"&&engine.isResizableMode();
        if(!active){
            if(resized){
                resized=false;
                lastWidth=0;lastHeight=0;
                body.classList.remove("original-resizable");
                // Returning to Fixed requests the authentic 765x503 game canvas.
                engine.resizeOriginalViewport(765,503);
            }
            return;
        }
        body.classList.add("original-resizable");
        const v=viewport(),size=originalViewportSize(v.width,v.height);
        if(!size){
            if(!resized)body.classList.remove("original-resizable");
            return;
        }
        const {width,height}=size;
        if(resized&&width===lastWidth&&height===lastHeight)return;
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
