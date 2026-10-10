// Mobile OS keyboard access for the original Java game canvas.
// The native password input is ONLY an ephemeral keyboard surface: characters
// are immediately relayed as ordinary key events to the original AWT adapter.
// No credentials are persisted, logged, submitted by JavaScript, or exposed to
// the development bridge. Original Java handles login and encryption.
export function attachOriginalKeyboard({canvas,keyboard,getGameState,
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
    const activate=()=>{
        if(getGameState()==="LOGIN_SCREEN")
            keyboard.focus({preventScroll:true});
    };
    // Must focus synchronously inside a user gesture for iOS/Safari.
    // The original canvas still receives its mouse/touch interaction.
    canvas.addEventListener("pointerup",e=>{
        if(e.pointerType==="touch")activate();
        else if(e.pointerType==="mouse")canvas.focus({preventScroll:true});
    },{passive:true});
    canvas.addEventListener("touchend",activate,{passive:true});
    return {dispose(){
        clear();
        keyboard.blur();
    }};
}
