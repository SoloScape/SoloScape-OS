import assert from "node:assert/strict";
import {test} from "node:test";
import {decodeClientScript,runWidgetScript} from "../browser/native-scripts.mjs";
import {decodeInterfacePacket,encodeInterfaceButton} from "../browser/interface-protocol.mjs";
import {ServerInterfaces} from "../browser/server-interfaces.mjs";
import {flattenInterface,wrapCacheText} from "../browser/interface-canvas.mjs";
import {NativeDialogueModels,rasterizeChathead} from "../browser/dialogue-models.mjs";

const be=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255];
const short=n=>[n>>>8&255,n&255];
const script=(instructions,extra={})=>({instructions:instructions.map(([op,value=0])=>({op,value})),
    localInts:0,localStrings:0,intArgs:0,stringArgs:0,longArgs:0,switches:[],...extra});
const uid=219*65536+1;
function scene(){
    const root={uid,groupId:219,type:0,isIf3:true,rawX:0,rawY:0,rawWidth:200,rawHeight:100};
    return {groupId:219,widgets:new Map([[uid,root]]),roots:[root],children:new Map()};
}
const choiceScript=script([[0,uid],[102],...[1,2].flatMap(index=>[
    [0,uid],[0,4],[0,index],[0,0],[100],
    [0,0],[0,index*25],[0,0],[0,0],[1000],
    [0,180],[0,20],[0,0],[0,0],[1001],[3,"Choice "+index],[1112]
]),[21]]);

test("revision-240 CS2 footer decodes instructions and rejects bad counts/footer",()=>{
    const bytes=Uint8Array.from([0,...short(3),...Buffer.from("test"),0,...short(39),0,...short(21),0,
        ...be(3),...new Array(12).fill(0),0,0,1]);
    const result=decodeClientScript(bytes,58);
    assert.deepEqual(result.instructions,[{op:3,value:"test"},{op:39,value:0},{op:21,value:0}]);
    const count=bytes.slice();count[count.length-19]=4;
    assert.throws(()=>decodeClientScript(count,58),/count|bounds/);
    assert.throws(()=>decodeClientScript(bytes.slice(0,-3),58),/footer|script|Truncated/);
});

test("dialogue VM bounds loops, unsupported operations, nested calls and stale loads",async()=>{
    const s=scene();
    await runWidgetScript({load:async()=>choiceScript},58,[],s);
    const nodes=flattenInterface(s,300,200).nodes;
    assert.deepEqual(nodes.map(n=>n.widget.childIndex),[undefined,1,2]);
    assert.deepEqual(nodes.slice(1).map(n=>n.widget.text),["Choice 1","Choice 2"]);
    await assert.rejects(runWidgetScript({load:async()=>script([[6,-1]])},58,[],scene(),{maxSteps:20}),/budget/);
    await assert.rejects(runWidgetScript({load:async()=>script([[9999]])},58,[],scene()),/Unsupported/);
    await assert.rejects(runWidgetScript({load:async()=>script([[40,58]])},58,[],scene()),/call depth/);
    const stale=scene();
    assert.equal(await runWidgetScript({load:async()=>choiceScript},58,[],stale,{isCurrent:()=>false}),false);
    assert.equal(stale.roots[0].dynamicChildren,undefined);
});

test("script alignment obeys newer server patches and cache text wraps by glyph metrics",async()=>{
    const s=scene(),align=script([[33,0],[33,1],[33,2],[33,3],[2114],[21]],{localInts:4,intArgs:4});
    await runWidgetScript({load:async()=>align},600,[1,1,16,uid],s,{canWrite:(_,key)=>key!=="lineHeight"});
    assert.equal(s.roots[0].xTextAlignment,1);assert.equal(s.roots[0].lineHeight,undefined);
    assert.deepEqual(wrapCacheText({measure:s=>s.length*5},"one two<br>three",20),["one","two","three"]);
});

test("server choice permissions preserve child IDs and prevent duplicate resume packets",async()=>{
    const cached=scene(),sent=[],listeners=new Map(),document={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
    const view={interfaces:{load:async()=>cached},active:null,canvas:{getBoundingClientRect:()=>({left:0,top:0})},
        close(){this.active=null;},async showGroup(s){this.active={group:s,layout:flattenInterface(s,300,200)};}};
    const r=new ServerInterfaces({view,session:{sendGame:(...p)=>sent.push(p)},scripts:{load:async()=>choiceScript}});
    const packet=(name,bytes)=>r.handle({name,payload:Uint8Array.from(bytes)});
    packet("IF_OPENTOP",[219+128&255,0]);
    packet("RUNCLIENTSCRIPT",[0,...be(58)]);
    packet("IF_SETEVENTS_V2",[...be(uid),0,0,1,0,0,129,0,0,0,0,2,0]);
    await r.pending;
    assert.equal(cached.roots[0].dynamicChildren,undefined);
    assert.equal(r.click(10,30),true);assert.equal(r.click(10,55),true);assert.equal(sent.length,1);
    assert.deepEqual([...sent[0][1]],[0,219,0,1,129,0]);
    packet("RUNCLIENTSCRIPT",[0,...be(58)]);await r.pending;
    r.bindInput({ownerDocument:document,addEventListener(){},removeEventListener(){}});
    const key={key:"2",target:{tagName:"CANVAS"},preventDefault(){},stopImmediatePropagation(){}};
    listeners.get("keydown")(key);
    assert.deepEqual([...sent[1][1]],[0,219,0,1,130,0]);
    packet("IF_OPENTOP",[127,255]);await r.pending;r.close();assert.equal(listeners.size,0);
    assert.equal(r.scriptMessages.size,0);assert.equal(r.awaiting,null);
});

test("dialogue packet arguments are reversed on wire and malformed arrays are bounded",()=>{
    assert.deepEqual(decodeInterfacePacket({name:"RUNCLIENTSCRIPT",payload:Uint8Array.from([
        ...Buffer.from("si"),0,...be(7),...Buffer.from("Hello"),0,...be(58)])}),
        {kind:"script",id:58,args:["Hello",7]});
    assert.throws(()=>decodeInterfacePacket({name:"RUNCLIENTSCRIPT",payload:Uint8Array.from([87,0,255,255,255,255,255])}),/varint/);
    assert.equal(encodeInterfaceButton({uid,isIf3:true,flags:0,childIndex:2}),null);
    assert.deepEqual([...encodeInterfaceButton({uid,isIf3:true,flags:1,childIndex:2}).payload],[0,219,0,1,130,0]);
});

test("native chatbox modal branch reveals only dialogue hosts and restores cached visibility on close",()=>{
    const base=162*65536,root={uid:base,groupId:162,type:0,rawWidth:519,rawHeight:165};
    const host={...root,uid:base+567,parentUid:base,rawWidth:479,rawHeight:96,hidden:true};
    const history={...root,uid:base+56,parentUid:base,hidden:false};
    const cached={groupId:162,widgets:new Map([root,host,history].map(w=>[w.uid,w])),roots:[root],children:new Map([[base,[host,history]]])};
    const view={close(){}};
    const r=new ServerInterfaces({view,session:{}});r.top=162;r.loaded.set(162,cached);r.loaded.set(219,scene());
    r.mounts.set(host.uid,{groupId:219,type:0});
    const open=r.compose();
    assert.equal(open.widgets.get(host.uid).hidden,false);assert.equal(open.widgets.get(history.uid).hidden,true);
    assert.ok(flattenInterface(open,800,600).nodes.some(n=>n.widget.groupId===219));
    assert.equal(host.hidden,true);assert.equal(history.hidden,false);
    r.patches.set(host.uid,{hidden:true});assert.equal(r.compose().widgets.get(host.uid).hidden,true);
    r.patches.clear();r.mounts.clear();assert.equal(r.compose().widgets.get(host.uid).hidden,true);
    r.close();
});

const triangle={verticesCount:3,faceCount:1,verticesX:Int32Array.from([-20,20,0]),
    verticesY:Int32Array.from([-20,-20,20]),verticesZ:Int32Array.from([0,0,0]),
    indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),faceColors:Uint16Array.of(2000)};
test("chatheads use head parts and recolours without mutating cached body geometry",async()=>{
    const calls=[],models={model:async id=>{calls.push(id);return triangle;},
        config:async()=>({ifModelIds:[42],models:[99]}),textures:{textures:new Map(),load:async()=>{}},
        animations:{pose:async(m,id,elapsed)=>({...m,elapsed,id})}};
    const head=new NativeDialogueModels(models,{appearance:()=>({equipment:[256,...new Array(11).fill(0)],colours:[0,0,0,0,0],gender:0})});
    const source=await head.load({modelKind:"player"});assert.deepEqual(calls,[42]);
    assert.equal(source.model.faceCount,1);assert.deepEqual([...triangle.verticesY],[-20,-20,20]);
    const posed=await head.pose(source,{sequenceId:554},200);assert.equal(posed.model.id,554);assert.equal(posed.model.elapsed,200);
    await assert.rejects(new NativeDialogueModels(models).load({modelKind:"player"}),/appearance/);
    await assert.rejects(head.load({modelKind:"npc-active",modelId:3}),/synchronized/);
});
test("chathead raster is clipped, depth tested and returns straight alpha pixels",()=>{
    const pixels=rasterizeChathead({model:triangle},{modelZoom:796},64,64,32,32);
    assert.ok(pixels.some((n,i)=>i%4===3&&n===255));
    const translucent={...triangle,faceAlphas:Int32Array.of(128)};
    const faded=rasterizeChathead({model:translucent},{modelZoom:796},64,64,32,32);
    const at=pixels.findIndex((n,i)=>i%4===3&&n===255)-3;
    assert.deepEqual([...faded.slice(at,at+3)],[...pixels.slice(at,at+3)]);
    assert.ok(faded[at+3]>0&&faded[at+3]<255);
    assert.throws(()=>rasterizeChathead({model:triangle},{},1024,1024,0,0),/budget/);
});
