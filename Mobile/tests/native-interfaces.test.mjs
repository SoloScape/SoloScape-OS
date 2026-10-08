import assert from "node:assert/strict";
import {test} from "node:test";
import {decodeWidget,linkInterfaceWidgets,NativeInterfaces} from "../browser/native-interfaces.mjs";
import {widgetLayout,flattenInterface,NativeInterfaceCanvas,NativeInterfaceAssets} from "../browser/interface-canvas.mjs";

class Writer{
    constructor(){this.b=[];}
    u8(n){this.b.push(n&255);return this;}
    u16(n){return this.u8(n>>8).u8(n);}
    i16(n){return this.u16(n&65535);}
    i32(n){return this.u8(n>>24).u8(n>>16).u8(n>>8).u8(n);}
    medium(n){return this.u8(n>>16).u8(n>>8).u8(n);}
    string(s=""){for(const c of s)this.u8(c.charCodeAt(0));return this.u8(0);}
    finish(){return Uint8Array.from(this.b);}
}
function if3({type=3,parent=-1,x=12,y=16,w=150,h=40,text="cache",font=496,sprite=16,color=0x4f28cc}={}){
    const p=new Writer().u8(255).u8(type).u16(0).i16(x).i16(y).u16(w).u16(h)
        .u8(0).u8(0).u8(0).u8(0).u16(parent<0?65535:parent).u8(0);
    if(type===0)p.u16(w).u16(h).u8(0);
    if(type===3)p.i32(color).u8(1).u8(0);
    if(type===4)p.u16(font).string(text).u8(12).u8(0).u8(0).u8(1).i32(color);
    if(type===5)p.i32(sprite).u16(0).u8(0).u8(0).u8(0).i32(0).u8(0).u8(0);
    if(type===9)p.u8(1).i32(color).u8(0);
    p.medium(0).string("").u8(0).u8(0).u8(0).u8(0).string("");
    for(let i=0;i<18;i++)p.u8(0);
    for(let i=0;i<3;i++)p.u8(0);
    return p.finish();
}
function if1Container(){
    return new Writer().u8(0).u8(0).u16(0).i16(4).i16(8).u16(180).u16(110)
        .u8(0).u16(65535).u16(65535).u8(0).u8(0).u16(200).u8(0)
        .u16(1).u16(1).i16(7).i16(13).finish();
}
test("revision-240 IF3 rectangle, text, image, line, container decode from bytes",()=>{
    const group=312,base=group<<16;
    const rect=decodeWidget(base|1,if3({type:3}));
    assert.equal(rect.groupId,group);assert.equal(rect.parentUid,-1);
    assert.equal(rect.type,3);assert.equal(rect.color,0x4f28cc);
    assert.equal(rect.filled,true);
    const text=decodeWidget(base|2,if3({type:4,parent:1,text:"Hello, cache!",font:496}));
    assert.equal(text.parentUid,base|1);assert.equal(text.text,"Hello, cache!");
    assert.equal(text.fontId,496);assert.equal(text.textShadowed,true);
    const image=decodeWidget(base|3,if3({type:5,parent:1,sprite:654}));
    assert.equal(image.spriteId,654);
    const line=decodeWidget(base|4,if3({type:9}));
    assert.equal(line.lineWidth,1);
    const container=decodeWidget(base|5,if3({type:0}));
    assert.equal(container.scrollWidth,150);
    assert.equal(container.listenerCount,0);
    assert.throws(()=>decodeWidget(base|3,if3({type:5}).subarray(0,22)),/Truncated/);
    assert.throws(()=>decodeWidget(base|3,Uint8Array.of(255,250)),/Unknown widget type/);
});
test("legacy IF1 container links children using cached coordinates, without synthetic roots",()=>{
    const base=210<<16;
    const parent=decodeWidget(base,if1Container());
    const child=decodeWidget(base|1,if3({type:4,parent:-1}));
    const {roots,children}=linkInterfaceWidgets(new Map([[base,parent],[base|1,child]]));
    assert.deepEqual(roots.map(w=>w.uid),[base]);
    assert.equal(children.get(base)[0].uid,base|1);
    assert.deepEqual([child.legacyX,child.legacyY],[7,13]);
    assert.equal(child.parentUid,base);
});
test("IF3 cache widget alignment matches pinned client pixel/percentage modes",()=>{
    assert.deepEqual(widgetLayout({rawX:5,rawY:9,rawWidth:100,rawHeight:20,widthMode:0,heightMode:0,xPositionMode:1,yPositionMode:2},800,600),
        {x:355,y:571,width:100,height:20});
    assert.deepEqual(widgetLayout({rawX:8192,rawY:8192,rawWidth:8192,rawHeight:8192,widthMode:2,heightMode:2,xPositionMode:3,yPositionMode:3},400,200),
        {x:200,y:100,width:200,height:100});
});
test("cache hierarchy flattening respects hidden widgets and inherited clipping",()=>{
    const base=118<<16;
    const root=decodeWidget(base,if3({type:0,x:10,y:10,w:100,h:70}));
    const child=decodeWidget(base|1,if3({type:3,parent:0,x:80,y:40,w:60,h:50}));
    const hidden=decodeWidget(base|2,if3({type:4,parent:0}));hidden.hidden=true;
    const group={roots:[root],children:new Map([[base,[child,hidden]]])};
    const result=flattenInterface(group,400,300);
    assert.equal(result.nodes.length,2);
    assert.equal(result.nodes[1].clip.r,110);
    assert.equal(result.nodes[1].clip.b,80);
    assert.equal(result.skipped.length,0);
});
test("interface renderer paints cache-derived rectangle and font text only",async()=>{
    const calls=[],ctx={setTransform(){},clearRect(){},save(){},beginPath(){},rect(){},clip(){},restore(){},
        fillRect(...x){calls.push(["fill",...x]);},strokeRect(){},};
    const canvas={parentElement:{clientWidth:500,clientHeight:400},hidden:true,width:0,height:0,
        getContext:()=>ctx};
    const group=301,base=group<<16;
    const root=decodeWidget(base,if3({type:0,x:0,y:0,w:200,h:100}));
    const rect=decodeWidget(base|1,if3({type:3,parent:0,x:3,y:4,w:50,h:20}));
    const label=decodeWidget(base|2,if3({type:4,parent:0,x:3,y:25,w:180,h:20,text:"Real widget"}));
    const widgetGroup={groupId:group,widgets:new Map([[base,root],[base|1,rect],[base|2,label]]),
        roots:[root],children:new Map([[base,[rect,label]]])};
    const preview=new NativeInterfaceCanvas(canvas,{});
    preview.interfaces.load=async()=>widgetGroup;
    const cacheFont={ascent:12,measure:s=>s.length*6,draw:(...x)=>calls.push(["text",...x])};
    preview.assets.fonts.set(496,{value:cacheFont,promise:Promise.resolve(cacheFont)});
    const oldWindow=globalThis.window;globalThis.window={devicePixelRatio:1};
    try{
        const info=await preview.show(group);
        assert.deepEqual(info,{groupId:group,components:3,rendered:3,unsupported:0,missingAssets:0});
        assert.equal(canvas.hidden,false);
        assert.ok(calls.some(x=>x[0]==="fill"&&x[3]===50&&x[4]===20));
        assert.ok(calls.some(x=>x[0]==="text"&&x[2]==="Real widget"));
        preview.close();assert.equal(canvas.hidden,true);
    }finally{
        if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
    }
});
test("interface load rejects invalid or unavailable cache groups, without inventing widgets",async()=>{
    const loader=new NativeInterfaces({loadIndex:async()=>{throw new Error("Offline verified cache");}});
    await assert.rejects(loader.load(-1),/Invalid interface/);
    await assert.rejects(loader.load(12),/Offline verified cache/);
    assert.equal(loader.groups.size,0);
});
