import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeTitleScreen,titleLayout,titleFieldLayout,OSRS_TITLE_COPY,OSRS_TITLE_FONT_IDS} from "../browser/title-screen.mjs";
import {paintWorldSelect,WORLD_SELECT_LAYOUT} from "../browser/world-select-screen.mjs";
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

test("fixed 765 by 503 title aligns reference panel top and mute bottom-right",()=>{
    const l=titleLayout(765,503);
    assert.equal(l.scale,1);assert.equal(l.y,0);assert.equal(l.x,0);
    assert.equal(l.backgroundScale,1);assert.equal(l.bx,-162);assert.equal(l.by,0);
    assert.equal(170+l.panelOffset,170,"RuneScape titlebox top follows the OpenOSRS reference");
    assert.ok(Math.abs(l.x+202+360/2-765/2)<=.5);
    assert.equal(l.muteX,725);assert.equal(l.muteY,463);
    const desktop=titleLayout(1920,1080);
    assert.equal(desktop.scale,1);assert.equal(desktop.y,(1080-503)/2);
});

test("window title covers background while preserving the centred UI aspect ratio",()=>{
    for(const [width,height] of [[390,844],[844,390],[1920,1080]]){
        const layout=titleLayout(width,height,true);
        assert.ok(1089*layout.backgroundScale>=width);
        assert.ok(671*layout.backgroundScale>=height);
        assert.ok(layout.bx<=0&&layout.by<=0);
        assert.ok(layout.x>=0&&layout.y>=0);
        assert.ok(765*layout.scale<=width&&503*layout.scale<=height);
        assert.equal(layout.x+765*layout.scale/2,width/2);
        assert.equal(layout.y+503*layout.scale/2,height/2);
    }
    assert.ok(titleLayout(1920,1080,true).scale>1,"desktop UI expands with its title window");
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
    const stored=new Map(),drawn=[],smallDrawn=[],circles=[],elements=new Map();
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
        "title-remember","title-hide-username","title-login-help",
        "title-world-switch","title-world-current","title-world-back",
        "title-world-sort-0","title-world-sort-1","title-world-sort-2","title-world-sort-3",
        "login-username",
        "login-password","login-submit"];
    for(const id of ids)el(id);
    const ctx={setTransform(){},fillRect(){},strokeRect(){},drawImage(){},
        beginPath(){},closePath(){},arc(...args){circles.push(args);},stroke(){},fill(){},moveTo(){},lineTo(){},
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
        title.assets.font=font;
        title.assets.small={measure:s=>s.length*5,draw:(_ctx,str)=>{drawn.push(str);smallDrawn.push(str);}};
        title.showWelcome();
        assert.ok(drawn.includes(OSRS_TITLE_COPY.welcome));
        assert.ok(drawn.includes("World 255"));
        assert.ok(drawn.includes("Click to switch"));
        assert.equal(elements.get("title-world-switch").hidden,false);
        elements.get("title-world-switch").click();
        assert.equal(title.mode,"world-select");
        assert.ok(drawn.includes("Select a world"));
        assert.ok(drawn.includes("Members only world"));
        assert.ok(drawn.includes("Free world"));
        assert.ok(drawn.includes("Location"));
        assert.ok(drawn.includes("Players"));
        assert.ok(drawn.includes("Type"));
        assert.ok(drawn.includes("Cancel"));
        assert.equal(elements.get("title-world-sort-1").hidden,false);
        elements.get("title-world-sort-1").click();
        assert.equal(title.worldSortOption,1);
        assert.equal(title.worldSortDirection,0);
        elements.get("title-world-sort-1").click();
        assert.equal(title.worldSortDirection,1);
        assert.equal(elements.get("title-world-switch").hidden,true);
        assert.equal(elements.get("title-world-current").hidden,false);
        elements.get("title-world-current").click();
        assert.equal(title.mode,"welcome");
        assert.equal(elements.get("title-world-current").hidden,true);
        drawn.length=0;
        elements.get("title-login").click();
        assert.equal(status.textContent,OSRS_TITLE_COPY.loginPrompt);
        assert.deepEqual(circles.slice(-2).map(args=>args.slice(0,3)),
            [[273,284,6],[414,284,6]],"checkboxes must be left-side circles");
        assert.ok(smallDrawn.includes("Remember username"));
        assert.ok(smallDrawn.includes("Hide username"));
        assert.ok(smallDrawn.includes("Can't login? Click here."));
        for(const str of ["Login:","Password:","Remember username","Hide username",
            "Can't login? Click here.","Login","Cancel"])
            assert.ok(drawn.includes(str),"missing authentic title text "+str);
        const user=elements.get("login-username"),pass=elements.get("login-password");
        // An empty password caret and masked text must start after the colon,
        // with the same one-space gap as the username field.
        assert.equal(user.style.left,`${272+font.measure("Login:")+font.measure(" ")}px`);
        assert.equal(pass.style.left,`${272+font.measure("Password:")+font.measure(" ")}px`);
        assert.ok(parseFloat(pass.style.left)>272+font.measure("Password:"),
            "empty password caret must not overlap the label colon");
        user.value="PlayerOne";user.selectionEnd=9;pass.value="sensitive password";
        elements.get("title-world-switch").click();
        assert.equal(title.mode,"world-select");
        elements.get("title-world-back").click();
        assert.equal(title.mode,"login");
        assert.equal(user.value,"PlayerOne");
        assert.equal(pass.value,"sensitive password","switcher must not discard entered credentials");
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
        title.beginConnecting();
        for(const phase of ["Authenticating…","Authenticated - waiting for player",
            "Loading map terrain and scenery"]){
            drawn.length=0;
            status.textContent=phase;
            title.paint();
            assert.equal(drawn.filter(text=>text==="Connecting... please wait.").length,1,
                "the title must display the same message during every phase");
            assert.equal(drawn.includes(phase),false,"internal progress must not appear on the title");
            assert.equal(status.textContent,phase,"the real progress signal must be preserved");
        }
        drawn.length=0;
        title.showLogin("Login unsuccessful");
        assert.ok(drawn.includes("Login unsuccessful"),
            "returning to login still allows a visible failure message");
        title.dispose();
    }finally{
        for(const [key,value] of Object.entries(saved)){
            if(value===undefined)delete globalThis[key];
            else globalThis[key]=value;
        }
    }
});

test("OpenOSRS world selector renders its own black canvas and exact 765px header/grid coordinates",()=>{
    assert.deepEqual([WORLD_SELECT_LAYOUT.rowX,WORLD_SELECT_LAYOUT.rowY,
        WORLD_SELECT_LAYOUT.rowWidth,WORLD_SELECT_LAYOUT.rowHeight],[338,253,88,19]);
    assert.deepEqual([WORLD_SELECT_LAYOUT.cancelX,WORLD_SELECT_LAYOUT.cancelY],[708,4]);
    const texts=[],images=[],fills=[],gradients=[];
    const ctx={
        fillStyle:"",lineWidth:1,
        fillRect:(...args)=>fills.push(args),
        strokeRect(){},beginPath(){},closePath(){},stroke(){},fill(){},
        moveTo(){},lineTo(){},save(){},restore(){},
        createLinearGradient:(...args)=>{
            gradients.push(args);
            return {addColorStop(){}};
        },drawImage:(...args)=>images.push(args),
    };
    const font={measure:s=>s.length*6,
        draw:(_ctx,text,x,y,color)=>texts.push({text,x,y,color})};
    const small={measure:s=>s.length*5,
        draw:(_ctx,text,x,y,color)=>texts.push({text,x,y,color})};
    const spriteNames=["sl_back","sl_flags","sl_stars","sl_arrows"];
    const sprites=new Map(spriteNames.map(name=>
        [name,Array.from({length:name==="sl_flags"?2:4},(_,i)=>({name,i}))]));
    paintWorldSelect(ctx,{font,small,sprites,worldId:255,sortOption:0});
    assert.deepEqual(fills[0],[0,0,765,503],"reference uses full black background");
    assert.deepEqual(gradients.map(v=>v.slice(0,4)),[[0,0,0,23],[125,0,125,23]]);
    for(const label of ["Select a world","Members only world","Free world",
        "World","Players","Location","Type","Cancel","255","0"]){
        assert.ok(texts.find(t=>t.text===label),"missing reference header/row "+label);
    }
    assert.deepEqual([texts.find(t=>t.text==="255").x,
        texts.find(t=>t.text==="255").y],[344,267.5]);
    assert.deepEqual(images.find(v=>v[0].name==="sl_back").slice(1),[338,253]);
    assert.deepEqual(images.find(v=>v[0].name==="sl_flags").slice(1),[367,253]);
    assert.deepEqual(images.filter(v=>v[0].name==="sl_arrows").map(v=>v[1]),
        [280,295,390,405,500,515,610,625]);
    assert.ok(images.some(v=>v[0].name==="sl_stars"&&v[0].i===1));
    assert.ok(images.some(v=>v[0].name==="sl_stars"&&v[0].i===0));
});
test("OpenOSRS world selector gracefully draws fallback art when sprite groups are missing",()=>{
    let black=0,circles=0;
    const ctx={fillRect(){black++;},strokeRect(){},beginPath(){},closePath(){},
        moveTo(){},lineTo(){},fill(){},stroke(){},save(){},restore(){},
        createLinearGradient(){return {addColorStop(){}}}};
    const font={draw(){},measure:s=>s.length*6};
    assert.doesNotThrow(()=>paintWorldSelect(ctx,{font,small:font,sprites:new Map()}));
    assert.ok(black>=5);
});
