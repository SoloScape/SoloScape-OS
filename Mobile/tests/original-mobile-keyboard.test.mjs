import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {attachOriginalKeyboard} from "../teavm-poc/site/original-mobile-keyboard.mjs";

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
    attachOriginalKeyboard({canvas,keyboard,getGameState:()=>state,
        createKeyEvent:(type,key)=>({type,key})});
    const fire=(target,type,event={})=>{
        const fn=handlers.get(target+":"+type);
        assert.ok(fn,"Missing "+target+" "+type+" handler");
        fn(event);
    };
    return {canvas,keyboard,events,fire,setState:value=>state=value,
        counts:()=>({focusedKeyboard,focusedCanvas})};
}
test("tapping original Java login title opens OS keyboard without visible login form",()=>{
    const f=fixture();
    f.fire("canvas","pointerup",{pointerType:"touch"});
    assert.equal(f.counts().focusedKeyboard,1);
    f.fire("canvas","touchend",{});
    assert.equal(f.counts().focusedKeyboard,2);
    f.setState("LOGGED_IN");
    f.fire("canvas","pointerup",{pointerType:"touch"});
    assert.equal(f.counts().focusedKeyboard,2,"walking must not open the keyboard");
    f.fire("canvas","pointerup",{pointerType:"mouse"});
    assert.equal(f.counts().focusedCanvas,1,"mouse should focus the original canvas");
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
test("mobile original page retains native keyboard while showing startup progress",async()=>{
    const [html,script,style]=await Promise.all([
        readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8")
    ]);
    assert.match(html,/id="original-engine-canvas"/);
    assert.match(html,/id="original-soft-keyboard" type="password"/);
    assert.match(html,/autocomplete="off"/);
    assert.match(style,/#original-soft-keyboard/);
    assert.match(style,/opacity:\s*0/);
    assert.match(html,/id="loading-status"/);
    assert.doesNotMatch(html,/<form\b/i);
    assert.match(script,/loading\("Loading original game data/);
    assert.match(script,/loadOriginalCache\(manifest,\{onProgress/);
    assert.match(script,/engine\.initializeAsync\(/);
    assert.match(script,/attachOriginalKeyboard\(/);
    assert.doesNotMatch(script,/loginPassword|autoLogin|fetch\(.*password/);
});
