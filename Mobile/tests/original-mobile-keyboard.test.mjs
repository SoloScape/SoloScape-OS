import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalKeyboard,categorizeOriginalClientError} from "../teavm-poc/site/original-mobile-keyboard.mjs";

function fixture(){
    const handlers=new Map();
    const events=[];
    let state="LOGIN_SCREEN",focusedKeyboard=0,focusedCanvas=0;
    const keyboard={value:"",focus(){focusedKeyboard++;},
        blur(){this.value="";},addEventListener(type,fn){handlers.set("keyboard:"+type,fn);}};
    const canvas={
        addEventListener(type,fn){handlers.set("canvas:"+type,fn);},
        dispatchEvent(event){events.push({type:event.type,key:event.key});return true;},
        focus(){focusedCanvas++;}
    };
    const clickTarget={addEventListener(type,fn){handlers.set("document:"+type,fn);}};
    attachOriginalKeyboard({canvas,keyboard,getGameState:()=>state,
        clickTarget,createKeyEvent:(type,key)=>({type,key})});
    const fire=(target,type,event={})=>{
        const fn=handlers.get(target+":"+type);
        assert.ok(fn,"Missing "+target+" "+type+" handler");
        fn(event);
    };
    return {canvas,keyboard,events,handlers,fire,setState:value=>state=value,
        counts:()=>({focusedKeyboard,focusedCanvas})};
}
test("iPhone Existing User tap waits for Java click and opens keyboard on next tap",()=>{
    const f=fixture();
    const order=[];
    const gameClick=()=>{order.push("game-click");};
    const documentClick=()=>{f.fire("document","click",{target:f.canvas});order.push("document-click");};
    f.handlers.set("canvas:click",gameClick);
    const tap=()=>{
        f.fire("canvas","touchstart",{});
        f.fire("canvas","pointerdown",{pointerType:"touch"});
        f.fire("canvas","pointerup",{pointerType:"touch"});
        const before=f.counts().focusedKeyboard;
        f.fire("canvas","click",{target:f.canvas});
        assert.equal(f.counts().focusedKeyboard,before,"Java canvas click executes first");
        documentClick();
    };
    tap();
    assert.equal(f.counts().focusedKeyboard,0,
        "the title's Existing User click must not open the keyboard");
    tap();
    assert.equal(f.counts().focusedKeyboard,1,
        "the next field tap must focus the native input after the Java click");
    // Do not count a second synthetic click for the same physical tap.
    documentClick();
    assert.equal(f.counts().focusedKeyboard,1);
    // The user can retry even if Safari kept focus but never displayed the OS keyboard.
    tap();
    assert.equal(f.counts().focusedKeyboard,2);
    assert.deepEqual(order.slice(0,4),
        ["game-click","document-click","game-click","document-click"]);
    f.setState("LOGGED_IN");
    tap();
    assert.equal(f.counts().focusedKeyboard,2,"gameplay taps must not pop up the keyboard");
    f.fire("canvas","pointerup",{pointerType:"mouse"});
    assert.equal(f.counts().focusedCanvas,1,"mouse still focuses the original canvas");
});

test("touch-only Safari uses touchstart and the same final native click",()=>{
    const f=fixture();
    assert.ok(f.handlers.has("canvas:touchstart"));
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas});
    assert.equal(f.counts().focusedKeyboard,0);
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas});
    assert.equal(f.counts().focusedKeyboard,1);
    f.fire("document","click",{target:f.canvas});
    assert.equal(f.counts().focusedKeyboard,1,"only one focus per physical tap");
});

test("mouse clicks and unrelated document clicks do not summon the mobile keyboard",()=>{
    const f=fixture();
    f.fire("canvas","pointerdown",{pointerType:"mouse"});
    f.fire("document","click",{target:f.canvas});
    assert.equal(f.counts().focusedKeyboard,0);
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:{}});
    assert.equal(f.counts().focusedKeyboard,0);
    f.fire("canvas","pointerdown",{pointerType:"mouse"});
    f.fire("document","click",{target:f.canvas});
    assert.equal(f.counts().focusedKeyboard,0);
});
test("native keyboard passes individual committed text to original AWT canvas and clears it",()=>{
    const f=fixture();
    f.keyboard.value="ab";
    f.fire("keyboard","input",{inputType:"insertText",isComposing:false});
    assert.deepEqual(f.events,[
        {type:"keydown",key:"a"},{type:"keyup",key:"a"},
        {type:"keydown",key:"b"},{type:"keyup",key:"b"}
    ]);
    assert.equal(f.keyboard.value,"","no text is retained in the native keyboard");
});
test("mobile deletion and Enter reach original Java keyboard without form submission",()=>{
    const f=fixture();
    const down={key:"Backspace",preventDefault(){this.prevented=true;}};
    f.fire("keyboard","keydown",down);
    assert.equal(down.prevented,true);
    const enter={key:"Enter",preventDefault(){this.prevented=true;}};
    f.fire("keyboard","keydown",enter);
    assert.equal(enter.prevented,true);
    assert.deepEqual(f.events,[
        {type:"keydown",key:"Backspace"},{type:"keyup",key:"Backspace"},
        {type:"keydown",key:"Enter"},{type:"keyup",key:"Enter"}
    ]);
    f.fire("keyboard","input",{inputType:"deleteContentBackward",isComposing:false});
    assert.equal(f.events.at(-1).key,"Backspace");
});
test("composition text is forwarded only after commitment, not during intermediate composition",()=>{
    const f=fixture();
    f.keyboard.value="x";
    f.fire("keyboard","input",{inputType:"insertCompositionText",isComposing:true});
    assert.deepEqual(f.events,[]);
    f.fire("keyboard","compositionend",{});
    assert.deepEqual(f.events,[{type:"keydown",key:"x"},{type:"keyup",key:"x"}]);
    assert.equal(f.keyboard.value,"");
    f.fire("keyboard","input",{inputType:"insertText",isComposing:false});
    assert.equal(f.events.length,2,"composition must not be duplicated");
});
test("mobile original page retains native keyboard without startup overlay",async()=>{
    const [html,script,style]=await Promise.all([
        readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8")
    ]);
    assert.match(html,/id="original-engine-canvas"/);
    assert.match(html,/id="original-soft-keyboard" type="password"/);
    assert.match(html,/autocomplete="off"/);
    assert.match(style,/#original-soft-keyboard/);
    assert.match(style,/opacity:\s*\.01/);
    assert.match(style,/width:24px;height:24px/);
    assert.doesNotMatch(html,/id="loading-status"/);
    assert.doesNotMatch(html,/<form\b/i);
    assert.doesNotMatch(script,/loading-status|Loading original game data/);
    assert.match(script,/loadOriginalCache\(manifest\)/);
    assert.match(script,/engine\.initializeAsync\(/);
    assert.match(script,/attachOriginalKeyboard\(/);
    assert.doesNotMatch(script,/loginPassword|autoLogin|fetch\(.*password/);
});

test("original callback error descriptions use only fixed non-sensitive codes",()=>{
    const examples=[
        ["user@example.com password123 java.lang.NullPointerException","NULL_REFERENCE"],
        ["TypeError: Cannot read properties of null (reading 'bsH')","NULL_REFERENCE"],
        ["java.lang.ArrayIndexOutOfBoundsException: private location","BOUNDS"],
        ["java.lang.IllegalStateException: abc@example.net","JAVA_STATE"],
        ["ReferenceError: password123 is not defined","JAVASCRIPT"],
        ["java.net.SocketException: private login","NETWORK"],
        ["java.lang.OutOfMemoryError: Java heap space","MEMORY"],
        ["RangeError: Array buffer allocation failed","MEMORY"],
        ["Out of memory","MEMORY"],
        ["Array buffer out of bounds","BOUNDS"],
        ["account=johndoe&password=privateSECRET","UNKNOWN"]
    ];
    for(const [raw,expected] of examples){
        const safe=categorizeOriginalClientError(raw);
        assert.equal(safe,expected);
        assert.match(safe,/^[A-Z_]{3,24}$/);
        assert.doesNotMatch(safe,/@|password|private|SECRET|johndoe|bsH/i);
    }
});
