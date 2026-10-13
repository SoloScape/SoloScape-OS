import assert from "node:assert/strict";
import {test} from "node:test";
import {decodeMenuFontMetrics,decodeMenuFontSprites,CacheMenuFont,buildNativeMenuEntries,menuDimensions,
    menuRectangle,menuIndexAt,NativeChooseOptionMenu,MENU_FONT_ID,MENU_BACKGROUND} from "../browser/native-menu.mjs";

const fakeFont={
    measure:s=>s.length*6,
    draw:(ctx,text,x,y,color,shadow=false)=>{
        ctx.calls.push({text,x,y,color,shadow});
        return x+text.length*6;
    }
};
const actor={name:"Banker",actions:[{slot:0,label:"Talk-to"},{slot:2,label:"Bank"},{slot:4,label:"Attack"}],x:350,y:120,run:false,index:12};

test("menu uses real cache font identity and client-exact row, header and ground semantics",()=>{
    assert.equal(MENU_FONT_ID,496);
    assert.equal(MENU_BACKGROUND,"#5d5447");
    const entries=buildNativeMenuEntries(actor);
    assert.deepEqual(entries.map(e=>e.option),["Bank","Talk-to","Attack","Examine","Cancel"]);
    assert.deepEqual(entries.map(e=>e.opcode),[11,9,13,1003,1006]);
    assert.equal(entries[0].target,"Banker");
    assert.deepEqual(buildNativeMenuEntries({kind:"ground"}).map(e=>e.option),["Walk here","Cancel"]);
    const dim=menuDimensions(entries,fakeFont);
    assert.deepEqual(dim,{width:Math.max("Choose Option".length*6,"Talk-to Banker".length*6,"Examine Banker".length*6)+8,height:5*15+22});
    const rect=menuRectangle({x:350,y:120},entries,fakeFont,800,600);
    assert.equal(rect.x,Math.floor(350-dim.width/2));
    assert.equal(rect.y,120);
    assert.equal(menuIndexAt(rect,rect.x+5,rect.y+19,entries.length),0);
    assert.equal(menuIndexAt(rect,rect.x+5,rect.y+34,entries.length),1);
    assert.equal(menuIndexAt(rect,0,0,entries.length),-1);
    const edge=menuRectangle({x:2,y:590},entries,fakeFont,400,600);
    assert.ok(edge.x>=0&&edge.y>=0&&edge.y+edge.h<=600);
});
test("cache metrics are decoded rather than relying on browser font metrics",()=>{
    const data=new Uint8Array(257).fill(7);data[256]=12;
    const metrics=decodeMenuFontMetrics(data);
    assert.equal(metrics.ascent,12);
    assert.equal(metrics.advances[65],7);
    assert.equal(metrics.kerning,null);
    const frames=Array.from({length:256},()=>({width:4,height:6,x:0,y:1,
        rgba:new Uint8ClampedArray(4*6*4)}));
    const font=new CacheMenuFont(frames,metrics);
    assert.equal(font.measure("ABC"),21);
    assert.throws(()=>new CacheMenuFont(frames.slice(0,30),metrics),/glyphs/);
    assert.throws(()=>decodeMenuFontMetrics(Uint8Array.of(0,1,2)),/Invalid/);
});
test("cache menu renderer draws source-defined geometry and dispatches clicked action",()=>{
    const origDocument=globalThis.document,origWindow=globalThis.window;
    const calls=[],listeners=new Map(),drawCalls=[];
    const ctx={calls:drawCalls,setTransform(){},clearRect(){},save(){},translate(){},scale(){},
        fillRect(...a){drawCalls.push({fill:a});},strokeRect(){},restore(){}};
    const canvas={hidden:true,width:0,height:0,parentElement:{clientWidth:800,clientHeight:600},
        getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0}),
        addEventListener(name,fn){listeners.set(name,fn);},
        removeEventListener(name){listeners.delete(name);}};
    globalThis.document={addEventListener(){},removeEventListener(){}};
    globalThis.window={devicePixelRatio:1,matchMedia:()=>({matches:false})};
    try{
        const menu=new NativeChooseOptionMenu(canvas,{onEntry:(entry,info)=>calls.push({entry,info})});
        menu.font=fakeFont;
        menu.open(actor);
        assert.equal(canvas.hidden,false);
        const r=menu.active.rect;
        assert.equal(drawCalls[0].fill[0],0);
        assert.equal(drawCalls[0].fill[2],r.w);
        assert.equal(drawCalls.find(c=>c.text==="Choose Option")?.y,14);
        assert.equal(drawCalls.find(c=>c.text==="Bank")?.y,31);
        assert.equal(drawCalls.find(c=>c.text==="Talk-to")?.y,46);
        listeners.get("pointerdown")({clientX:r.x+5,clientY:r.y+20,
            preventDefault(){},stopPropagation(){}});
        assert.equal(canvas.hidden,true);
        assert.equal(calls.length,1);
        assert.equal(calls[0].entry.slot,2);
        assert.equal(calls[0].info.index,12);
        menu.open({kind:"ground",x:20,y:100});
        assert.equal(menu.active.entries[0].kind,"walk");
        menu.dispose();assert.equal(listeners.size,0);
    }finally{
        if(origDocument===undefined)delete globalThis.document;
        else globalThis.document=origDocument;
        if(origWindow===undefined)delete globalThis.window;
        else globalThis.window=origWindow;
    }
});

test("font sprite decoder preserves zero-width glyphs and decodes actual indexed pixels",()=>{
    const n=256,raw=new Uint8Array((n+1)+3+(5+n*8)+2);
    for(let i=0;i<n;i++)raw[i+(i>65?1:0)]=0; // row-major pixel flags
    raw[66]=1; // glyph 65 is one visible palette index
    const meta=n+1+3;
    raw[n+1]=255;raw[n+2]=255;raw[n+3]=255;
    raw[meta+1]=1;raw[meta+3]=1;raw[meta+4]=1; // sheet 1x1, two colours
    raw[meta+5+n*4+65*2+1]=1; // width of A
    raw[meta+5+n*6+65*2+1]=1; // height of A
    raw[raw.length-2]=1;raw[raw.length-1]=0;
    const frames=decodeMenuFontSprites(raw);
    assert.equal(frames.length,256);
    assert.equal(frames[32].width,0);
    assert.equal(frames[65].width,1);
    assert.equal(frames[65].rgba[3],255);
    assert.throws(()=>decodeMenuFontSprites(Uint8Array.of(0,1,2)),/Invalid/);
    raw[raw.length-1]=1;
    assert.throws(()=>decodeMenuFontSprites(raw),/Expected 256/);
});
