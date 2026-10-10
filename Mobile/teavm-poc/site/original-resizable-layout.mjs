// The original revision-240 client owns Classic and Modern resizable layouts.
// This adapter only passes the browser's CSS-pixel viewport to its existing
// Java AWT resizeCanvas path, and changes the page's presentation bounds.
export function attachOriginalResizableLayout({
    canvas,body,engine,getGameState,
    viewport=()=>({width:globalThis.innerWidth,height:globalThis.innerHeight}),
    addResize=handler=>globalThis.addEventListener("resize",handler),
    removeResize=handler=>globalThis.removeEventListener("resize",handler)
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
        const v=viewport();
        if(!Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<=0||v.height<=0)
            return;
        // OSRS imposes a native minimum canvas size. Avoid HiDPI framebuffer
        // multiplication on Safari; dimensions are CSS pixels, not device pixels.
        const width=Math.max(765,Math.min(2048,Math.round(v.width)));
        const height=Math.max(503,Math.min(1536,Math.round(v.height)));
        if(resized&&width===lastWidth&&height===lastHeight)return;
        if(!engine.resizeOriginalViewport(width,height))return;
        lastWidth=width;lastHeight=height;resized=true;
        body.classList.add("original-resizable");
    };
    addResize(apply);
    return {update:apply,dispose(){
        removeResize(apply);
        body.classList.remove("original-resizable");
    }};
}
