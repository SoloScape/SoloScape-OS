import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalKeyboard,categorizeOriginalClientError,isOriginalLoginFieldTap} from "../teavm-poc/site/original-mobile-keyboard.mjs";

function fixture({getChatKeyboardAction=()=>0}={}){
    const handlers=new Map();
    const events=[];
    let state="LOGIN_SCREEN",focusedKeyboard=0,focusedCanvas=0;
    const fakeDocument={activeElement:null};
    const keyboard={value:"",focus(){focusedKeyboard++;fakeDocument.activeElement=this;},
        blur(){this.value="";fakeDocument.activeElement=null;},
        addEventListener(type,fn){handlers.set("keyboard:"+type,fn);}};
    const canvas={
        width:765,height:503,
        getBoundingClientRect(){return {left:0,top:0,width:765,height:503};},
        addEventListener(type,fn){handlers.set("canvas:"+type,fn);},
        dispatchEvent(event){events.push({type:event.type,key:event.key});return true;},
        focus(){focusedCanvas++;}
    };
    const clickTarget={get activeElement(){return fakeDocument.activeElement;},
        addEventListener(type,fn){handlers.set("document:"+type,fn);}};
    attachOriginalKeyboard({canvas,keyboard,getGameState:()=>state,
        clickTarget,getChatKeyboardAction,createKeyEvent:(type,key)=>({type,key})});
    const fire=(target,type,event={})=>{
        const fn=handlers.get(target+":"+type);
        assert.ok(fn,"Missing "+target+" "+type+" handler");
        fn(event);
    };
    return {canvas,keyboard,events,handlers,fire,
        activeElement:()=>fakeDocument.activeElement,setState:value=>state=value,
        counts:()=>({focusedKeyboard,focusedCanvas})};
}

test("native mobile chat keyboard button synchronously opens, relays text and closes",()=>{
    let action=1;
    const points=[];
    const f=fixture({getChatKeyboardAction:(x,y)=>{points.push([x,y]);return action;}});
    f.setState("LOGGED_IN");
    f.canvas.width=1093;f.canvas.height=503;
    f.canvas.getBoundingClientRect=()=>({left:44,top:0,width:756,height:348});
    const tap=()=>{
        f.fire("canvas","pointerdown",{pointerType:"touch"});
        f.fire("document","click",{target:f.canvas,clientX:64,clientY:100});
    };
    tap();
    assert.equal(f.counts().focusedKeyboard,1,"focus occurs inside the same click gesture");
    assert.deepEqual(points,[[28,144]],"map safe-area CSS pixels to native widget coordinates");
    f.keyboard.value="hi";f.fire("keyboard","input",{inputType:"insertText"});
    assert.deepEqual(f.events.map(e=>e.key),["h","h","i","i"]);
    assert.equal(f.keyboard.value,"");
    action=2;tap();
    assert.equal(f.activeElement(),null,"native toggle closes the system keyboard");
    assert.equal(f.counts().focusedKeyboard,1);
    action=0;tap();
    assert.equal(f.counts().focusedKeyboard,1,"other game widgets do not request focus");
});

test("chat focus uses the button state before Java processes the native click",()=>{
    let action=1;
    const f=fixture({getChatKeyboardAction:()=>action});f.setState("LOGGED_IN");
    f.fire("canvas","pointerdown",{pointerType:"touch",clientX:20,clientY:100});
    action=2;
    f.fire("document","click",{target:f.canvas,clientX:20,clientY:100});
    assert.equal(f.counts().focusedKeyboard,1,"a native toggle before click bubbling must still open keyboard");
});
test("iPhone Existing User tap waits for Java click and opens keyboard on next tap",()=>{
    const f=fixture();
    const order=[];
    const gameClick=()=>{order.push("game-click");};
    const documentClick=(x=462,y=291)=>{f.fire("document","click",{target:f.canvas,clientX:x,clientY:y});order.push("document-click");};
    f.handlers.set("canvas:click",gameClick);
    const tap=(x,y)=>{
        f.fire("canvas","touchstart",{});
        f.fire("canvas","pointerdown",{pointerType:"touch"});
        f.fire("canvas","pointerup",{pointerType:"touch"});
        const before=f.counts().focusedKeyboard;
        f.fire("canvas","click",{target:f.canvas,clientX:x,clientY:y});
        assert.equal(f.counts().focusedKeyboard,before,"Java canvas click executes first");
        documentClick(x,y);
    };
    tap(462,291); // Existing User button on the original RuneScape welcome title.
    assert.equal(f.counts().focusedKeyboard,0,
        "the title's Existing User click must not open the keyboard");
    tap(374,248); // Username field.
    assert.equal(f.counts().focusedKeyboard,1,
        "only the username field tap should focus the native input after the Java click");
    tap(374,263); // Password field.
    assert.equal(f.counts().focusedKeyboard,2,
        "the password field may also request the keyboard");
    assert.equal(f.activeElement(),f.keyboard,"password field should own the keyboard");
    // Non-input login buttons and the rest of the canvas never open the keyboard.
    for(const [x,y] of [[302,321],[462,321],[382,357],[400,200],[700,400]])tap(x,y);
    assert.equal(f.counts().focusedKeyboard,2,"menus and gameplay surfaces must not summon the keyboard");
    assert.equal(f.activeElement(),null,"non-field tap should dismiss an open keyboard");
    // Do not count a second synthetic click for the same physical tap.
    documentClick(374,263);
    assert.equal(f.counts().focusedKeyboard,2);
    // The user can retry even if Safari kept focus but never displayed the OS keyboard.
    tap(374,263);
    assert.equal(f.counts().focusedKeyboard,3);
    assert.deepEqual(order.slice(0,4),
        ["game-click","document-click","game-click","document-click"]);
    f.setState("LOGGED_IN");
    tap(374,263);
    assert.equal(f.counts().focusedKeyboard,3,"gameplay taps must not pop up the keyboard");
    f.fire("canvas","pointerup",{pointerType:"mouse"});
    assert.equal(f.counts().focusedCanvas,1,"mouse still focuses the original canvas");
});

test("touch-only Safari uses touchstart and the same final native click",()=>{
    const f=fixture();
    assert.ok(f.handlers.has("canvas:touchstart"));
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas,clientX:462,clientY:291});
    assert.equal(f.counts().focusedKeyboard,0);
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas,clientX:374,clientY:248});
    assert.equal(f.counts().focusedKeyboard,1);
    f.fire("document","click",{target:f.canvas,clientX:374,clientY:248});
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
test("keyboard focus marks a synchronous AWT-preserving handoff, then clears the mark",()=>{
    const f=fixture();
    let during=null;
    f.keyboard.focus=()=>{during=globalThis.soloscapeOriginalKeyboardFocusing;};
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas,clientX:462,clientY:291});
    f.fire("canvas","touchstart",{});
    f.fire("document","click",{target:f.canvas,clientX:374,clientY:248});
    assert.equal(during,true,"focus event must see the temporary keyboard handoff");
    assert.equal(globalThis.soloscapeOriginalKeyboardFocusing,false,
        "other window blur events must not be suppressed");
    f.keyboard.focus=()=>{throw Error("Blocked focus");};
    f.fire("canvas","touchstart",{});
    assert.throws(()=>f.fire("document","click",{target:f.canvas,clientX:374,clientY:248}),
        /Blocked focus/);
    assert.equal(globalThis.soloscapeOriginalKeyboardFocusing,false,
        "a Safari focus exception must never strand the handoff flag");
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

test("only actual original login field rectangles are keyboard focus targets",()=>{
    const canvas={width:765,height:503,
        getBoundingClientRect:()=>({left:0,top:0,width:765,height:503})};
    for(const [x,y] of [[374,248],[497,250],[374,263],[495,268]])
        assert.equal(isOriginalLoginFieldTap(canvas,x,y),true,"original login text field");
    for(const [x,y] of [[462,291],[302,291],[302,321],[462,321],
        [382,214],[382,357],[267,283],[408,283],[10,10],[750,492],[NaN,248]])
        assert.equal(isOriginalLoginFieldTap(canvas,x,y),false,"non-text title area");
    assert.equal(isOriginalLoginFieldTap({...canvas,getBoundingClientRect:()=>({
        left:0,top:300,width:390,height:390*503/765
    })},374*390/765,300+248*390/765),true,
        "portrait letterboxing should not shift the field hitbox");
    assert.equal(isOriginalLoginFieldTap({...canvas,getBoundingClientRect:()=>({
        left:122,top:0,width:700,height:700*503/765
    })},122+374*700/765,248*700/765),true,
        "landscape letterboxing should not shift the field hitbox");
    assert.equal(isOriginalLoginFieldTap({...canvas,getBoundingClientRect:()=>({
        left:0,top:0,width:0,height:0
    })},374,248),false,"invalid layout must never request keyboard focus");
});
