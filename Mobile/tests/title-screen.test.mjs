import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeTitleScreen,titleLayout,titleFieldLayout,OSRS_TITLE_COPY,OSRS_TITLE_FONT_IDS} from "../browser/title-screen.mjs";
import {NativeAudioCache,retryOnMissingGroup} from "../browser/title-audio-cache.mjs";
import {NativeTitleMusic} from "../browser/title-music.mjs";
import {RealtimeMidiSynth} from "../browser/title-audio-realtime-midi-synth.mjs";
import {MusicTrack} from "../browser/title-audio-music-track.mjs";

test("title controls fit desktop, portrait and landscape without resizing the game viewport",()=>{
    for(const [w,h] of [[1366,768],[390,844],[844,390]]){
        const l=titleLayout(w,h);
        for(const x of [202,562])assert.ok(l.x+x*l.scale>=0&&l.x+x*l.scale<=w);
        for(const y of [18,370])assert.ok(l.y+y*l.scale>=0&&l.y+y*l.scale<=h);
        assert.equal(l.backgroundScale,l.scale);
        assert.ok(765*l.scale<=w&&503*l.scale<=h);
    }
});

test("fixed 765 by 503 title centres the panel and anchors mute bottom-right",()=>{
    const l=titleLayout(765,503);
    assert.equal(l.scale,1);assert.equal(l.y,0);assert.equal(l.x,0);
    assert.equal(l.backgroundScale,1);assert.equal(l.bx,-162);assert.equal(l.by,0);
    assert.ok(Math.abs(170+l.panelOffset+200/2-503/2)<=.5);
    assert.ok(Math.abs(l.x+202+360/2-765/2)<=.5);
    assert.equal(l.muteX,725);assert.equal(l.muteY,463);
    const desktop=titleLayout(1920,1080);
    assert.equal(desktop.scale,1);assert.equal(desktop.y,(1080-503)/2);
});

test("cache-font caret follows native offsets without selectable highlights",()=>{
    const font={measure:text=>text.length*5};
    const field=titleFieldLayout(font,"Alice",1,4,true);
    assert.equal(field.selection,null);assert.equal(field.caret,20);
    assert.equal(field.indexAt(6),1);assert.equal(field.indexAt(9),2);
    assert.equal(titleFieldLayout(font,"Alice",2,2,true).caret,10);
    assert.equal(titleFieldLayout(font,"Alice",1,4,false).selection,null);
    const scrolled=titleFieldLayout(font,"abcdefghij",8,10,true,20);
    assert.equal(scrolled.text,"ghij");assert.equal(scrolled.selection,null);
    assert.equal(scrolled.indexAt(0),6);assert.equal(scrolled.indexAt(100),10);
    assert.equal(titleFieldLayout(font,"*****",1,4,true).selection,null);
});

test("music cache bridge waits for one verified group and preserves decoded bytes",async()=>{
    let reads=0,release;
    const cache=new NativeAudioCache({loadGroup:async()=>{reads++;await new Promise(r=>release=r);return Uint8Array.of(0,0,0,0,3,1,2,3);}});
    cache.catalogs.set(6,{ids:[7,8],fileIdsForGroup:new Map([[7,[0]],[8,[0]]])});
    const index=cache.getIndex(6),first=retryOnMissingGroup(()=>index.getFileSmart(7)),second=retryOnMissingGroup(()=>index.getFile(7,0));
    release();const files=await Promise.all([first,second]);
    assert.equal(reads,1);assert.deepEqual([...files[0].data],[1,2,3]);assert.equal(index.getFileSmart(99),null);
    await assert.rejects(cache.preload(6,99),/Missing music cache group/);
    assert.equal(cache.pending.size,0);
});

test("cache MIDI conversion rejects malformed data instead of inventing title music",()=>{
    assert.equal(MusicTrack.toMidi(Uint8Array.of(0)),null);
});

test("leaving title while music loads never starts stale playback",async()=>{
    const methods=["loadTrack","dispose","setVolume","setLooping","play","stop"],saved=new Map(methods.map(k=>[k,RealtimeMidiSynth.prototype[k]]));
    let resolve,played=0,disposed=0;
    RealtimeMidiSynth.prototype.loadTrack=()=>new Promise(r=>resolve=r);
    RealtimeMidiSynth.prototype.play=()=>played++;
    RealtimeMidiSynth.prototype.dispose=()=>disposed++;
    for(const name of ["setVolume","setLooping","stop"])RealtimeMidiSynth.prototype[name]=()=>{};
    try{
        const music=new NativeTitleMusic({});music.track=0;
        const pending=music.unlock();music.hide();music.show();resolve(true);await pending;
        assert.equal(played,0);assert.equal(disposed,1);assert.equal(music.loaded,false);assert.equal(music.synth,null);
        music.dispose();
    }finally{for(const [name,fn] of saved)RealtimeMidiSynth.prototype[name]=fn;}
});

test("OpenOSRS rev-240 in-game title uses cache b12_full, p11_full and original strings",()=>{
    assert.deepEqual(OSRS_TITLE_FONT_IDS,{bold12:496,plain11:494});
    assert.deepEqual(OSRS_TITLE_COPY,{
        loading:"RuneScape is loading - please wait...",
        welcome:"Welcome to RuneScape",newUser:"New User",existingUser:"Existing User",
        loginPrompt:"Enter your username/email & password.",
        loginLabel:"Login:",passwordLabel:"Password:",
        remember:"Remember username",hide:"Hide username",
        help:"Can't login? Click here.",login:"Login",cancel:"Cancel",
    });
});
test("title form draws original cache labels and works with optional remembered/hidden username",()=>{
    const saved=Object.fromEntries(["document","window","localStorage","requestAnimationFrame","cancelAnimationFrame"]
        .map(k=>[k,globalThis[k]]));
    const stored=new Map(),drawn=[],elements=new Map();
    const el=id=>{
        const node={id,style:{},hidden:false,value:"",selectionStart:0,selectionEnd:0,
            handlers:{},attributes:new Map(),
            addEventListener(type,fn){this.handlers[type]=fn;},
            removeEventListener(type){delete this.handlers[type];},
            setAttribute(k,v){this.attributes.set(k,v);},
            getBoundingClientRect:()=>({left:0,width:192}),
            setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;},
            focus(){globalThis.document.activeElement=this;},
            click(){this.handlers.click?.();}};
        elements.set(id,node);return node;
    };
    const ids=["title-new-account","title-login","title-cancel","title-mute",
        "title-remember","title-hide-username","title-login-help","login-username",
        "login-password","login-submit"];
    for(const id of ids)el(id);
    const ctx={setTransform(){},fillRect(){},strokeRect(){},drawImage(){},
        save(){},restore(){},translate(){},scale(){},fillText(){}};
    const canvas={width:0,height:0,getContext:()=>ctx,
        parentElement:{hidden:false,getBoundingClientRect:()=>({width:765,height:503})}};
    const stage={style:{}},form={hidden:true},status={textContent:""};
    try{
        globalThis.document={
            activeElement:null,body:{classList:{add(){},remove(){}}},
            getElementById:id=>elements.get(id)??null,
            addEventListener(){},removeEventListener(){},
        };
        globalThis.window={devicePixelRatio:1,addEventListener(){},removeEventListener(){}};
        globalThis.localStorage={
            getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),
            removeItem:k=>stored.delete(k),
        };
        globalThis.requestAnimationFrame=()=>11;
        globalThis.cancelAnimationFrame=()=>{};
        const title=new NativeTitleScreen({canvas,stage,form,status});
        const font={measure:s=>s.length*6,draw:(_ctx,str)=>drawn.push(str)};
        title.assets.font=font;title.assets.small=font;
        title.showWelcome();
        assert.ok(drawn.includes(OSRS_TITLE_COPY.welcome));
        drawn.length=0;
        elements.get("title-login").click();
        assert.equal(status.textContent,OSRS_TITLE_COPY.loginPrompt);
        for(const str of ["Login:","Password:","Remember username","Hide username",
            "Can't login? Click here.","Login","Cancel"])
            assert.ok(drawn.includes(str),"missing authentic title text "+str);
        const user=elements.get("login-username"),pass=elements.get("login-password");
        user.value="PlayerOne";user.selectionEnd=9;pass.value="sensitive password";
        user.handlers.input();
        assert.equal(stored.size,0,"username retention must require opt-in");
        elements.get("title-remember").click();
        assert.equal(stored.get("soloscape:title:username"),"PlayerOne");
        assert.equal(stored.get("soloscape:title:remember"),"true");
        assert.ok(![...stored.values()].some(v=>v.includes("sensitive")));
        drawn.length=0;
        elements.get("title-hide-username").click();
        assert.equal(elements.get("title-hide-username").attributes.get("aria-checked"),"true");
        assert.ok(drawn.includes("*********"),"visual username must be masked");
        elements.get("title-remember").click();
        assert.equal(stored.size,0,"unchecking remember purges stored username");
        elements.get("title-login-help").click();
        assert.match(status.textContent,/SoloScape server/);
        title.dispose();
    }finally{
        for(const [key,value] of Object.entries(saved)){
            if(value===undefined)delete globalThis[key];
            else globalThis[key]=value;
        }
    }
});
