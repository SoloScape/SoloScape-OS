// Safe, fixed labels for the game's fatal callback categories.
// Never interpolate raw Java exception messages: they can contain account data.
export function categorizeOriginalClientError(value){
    const error=typeof value==="string"?value:"";
    if(/\b(?:OutOfMemoryError|allocation failed|Java heap space)\b/i.test(error))return "MEMORY";
    if(/\b(?:NullPointerException|Cannot read properties of (?:null|undefined))\b/i.test(error))return "NULL_REFERENCE";
    if(/\b(?:ArrayIndexOutOfBoundsException|IndexOutOfBoundsException|RangeError)\b/i.test(error))return "BOUNDS";
    if(/\b(?:IllegalStateException|IllegalArgumentException)\b/i.test(error))return "JAVA_STATE";
    if(/\b(?:TypeError|ReferenceError)\b/i.test(error))return "JAVASCRIPT";
    if(/\b(?:IOException|SocketException)\b/i.test(error))return "NETWORK";
    return "UNKNOWN";
}

// Mobile OS keyboard access for the original Java game canvas.
// The native password input is ONLY an ephemeral keyboard surface: characters
// are immediately relayed as ordinary key events to the original AWT adapter.
// No credentials are persisted, logged, submitted by JavaScript, or exposed to
// the development bridge. Original Java handles login and encryption.
export function attachOriginalKeyboard({canvas,keyboard,getGameState,
    supportsPointerEvents=typeof globalThis.PointerEvent==="function",
    createKeyEvent=(type,key)=>new KeyboardEvent(type,{key,bubbles:false,cancelable:true})}){
    if(!canvas||!keyboard||typeof getGameState!=="function")
        throw new Error("Original canvas keyboard needs its own input surface");
    const relay=key=>{
        if(!key)return;
        canvas.dispatchEvent(createKeyEvent("keydown",key));
        canvas.dispatchEvent(createKeyEvent("keyup",key));
    };
    const relayText=text=>{
        // RuneScape text fields consume Java KEY_TYPED characters. Do not
        // collect or return the text; feed each committed OS keyboard character.
        for(const character of text)relay(character);
    };
    const clear=()=>{keyboard.value="";};
    const special=new Set(["Enter","Backspace","Delete","Tab","Escape",
        "ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
    keyboard.addEventListener("keydown",e=>{
        if(!special.has(e.key))return;
        e.preventDefault();
        relay(e.key);
    });
    keyboard.addEventListener("input",e=>{
        // An IME can send provisional characters repeatedly. Only relay its
        // committed input, never the composition's intermediate text.
        if(e.isComposing||e.inputType==="insertCompositionText")return;
        if(e.inputType?.startsWith("delete"))relay("Backspace");
        else if(e.inputType==="insertLineBreak")relay("Enter");
        else if(e.inputType?.startsWith("insert")||!e.inputType)
            relayText(keyboard.value);
        clear();
    });
    keyboard.addEventListener("compositionend",()=>{
        // Some iOS keyboards omit the final input event after composition.
        if(keyboard.value){relayText(keyboard.value);clear();}
    });
    keyboard.addEventListener("blur",clear);
    // The welcome title and username/password entry both report LOGIN_SCREEN.
    // Do not open the system keyboard on the first "Existing User" tap; the
    // original Java title button must get its click before keyboard resizing.
    // A subsequent tap can focus the ephemeral keyboard for manual entry.
    let loginTitleTouched=false;
    const activate=()=>{
        if(getGameState()!=="LOGIN_SCREEN"){
            loginTitleTouched=false;
            return;
        }
        if(!loginTitleTouched){
            loginTitleTouched=true;
            return;
        }
        if(globalThis.document?.activeElement!==keyboard)
            keyboard.focus({preventScroll:true});
    };
    // Modern iOS Safari and Android fire pointerup AND touchend for one tap.
    // Use only one path, or the title touch gets counted twice and opens the
    // keyboard prematurely. Legacy touch browsers without Pointer Events
    // keep the touchend fallback.
    canvas.addEventListener("pointerup",e=>{
        if(e.pointerType==="touch")activate();
        else if(e.pointerType==="mouse")canvas.focus({preventScroll:true});
    },{passive:true});
    if(!supportsPointerEvents)
        canvas.addEventListener("touchend",activate,{passive:true});
    return {dispose(){
        clear();
        keyboard.blur();
    }};
}
