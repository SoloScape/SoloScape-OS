// Anonymous lifecycle breadcrumbs for diagnosing iOS page restarts.
// Never store or transmit text entered into the original Java game.
const key="soloscape-original-title-tap";
export function attachOriginalPageLifecycle({canvas,getGameState,
    page=globalThis,storage,report,now=()=>Date.now()}={}){
    if(!canvas||typeof getGameState!=="function")
        throw new Error("Original page lifecycle requires its canvas");
    const signal=label=>{
        try{
            if(report)report(label);
            else page.navigator?.sendBeacon?.("/original-lifecycle",label);
        }catch{/* Lifecycle reports are nonessential to gameplay. */}
    };
    let previous=null,store=null;
    try{
        store=storage??page.sessionStorage;
        const raw=store?.getItem(key);
        if(raw&&raw.length<128)previous=JSON.parse(raw);
        store?.removeItem(key);
    }catch{/* Private browsing must not block the original engine. */}
    const age=now()-previous?.at;
    const restartedAfterTitleTap=previous?.action==="TITLE_RIGHT_TAP"&&
        Number.isFinite(age)&&age>=0&&age<120000;
    signal(restartedAfterTitleTap?"PAGE_RESTARTED":"PAGE_STARTED");
    let lastTap=-Infinity;
    const tap=e=>{
        if(getGameState()!=="LOGIN_SCREEN")return;
        const touch=e.touches?.[0]??e;
        if(!Number.isFinite(touch.clientX)||!Number.isFinite(touch.clientY))return;
        const rect=canvas.getBoundingClientRect();
        if(!(rect.width>0&&rect.height>0))return;
        const x=(touch.clientX-rect.left)*canvas.width/rect.width;
        const y=(touch.clientY-rect.top)*canvas.height/rect.height;
        // Right-hand title button area (welcome Existing User position).
        // The original Java game still owns all hit-testing and click actions.
        if(x<389||x>546||y<276||y>310){
            // A later field/gameplay tap clears the marker, so a separate
            // login failure is not misreported as an Existing User restart.
            try{store?.removeItem(key);}catch{}
            return;
        }
        const stamp=now();
        if(stamp-lastTap<500)return; // pointerdown and touchstart are one tap.
        lastTap=stamp;
        try{store?.setItem(key,JSON.stringify({action:"TITLE_RIGHT_TAP",at:stamp}));}
        catch{/* Storage is optional. */}
        signal("TITLE_RIGHT_TAP");
    };
    canvas.addEventListener("pointerdown",e=>{
        if(e.pointerType==="touch")tap(e);
    },{passive:true,capture:true});
    canvas.addEventListener("touchstart",tap,{passive:true,capture:true});
    page.addEventListener?.("pagehide",()=>signal("PAGEHIDE"),{once:true});
    return {restartedAfterTitleTap};
}
