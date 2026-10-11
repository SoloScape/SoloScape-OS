import assert from "node:assert/strict";
import {test} from "node:test";
import {decodeInterfacePacket,encodeInterfaceButton} from "../browser/interface-protocol.mjs";
import {ServerInterfaces} from "../browser/server-interfaces.mjs";
import {flattenInterface} from "../browser/interface-canvas.mjs";
import {linkInterfaceWidgets} from "../browser/native-interfaces.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";

const packet=(name,bytes)=>({name,payload:Uint8Array.from(bytes)});
const decode=(name,bytes)=>decodeInterfacePacket(packet(name,bytes));
const be=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255];
const le=n=>be(n).reverse();
const me=n=>{const b=be(n);return [b[1],b[0],b[3],b[2]];};
const top=id=>packet("IF_OPENTOP",[id+128&255,id>>>8]);
const open=(uid,id,type=0)=>packet("IF_OPENSUB",[type,id+128&255,id>>>8,...me(uid)]);
const close=uid=>packet("IF_CLOSESUB",be(uid));
const text=(uid,value)=>packet("IF_SETTEXT",[uid>>>8&255,uid&255,uid>>>24&255,uid>>>16&255,...Buffer.from(value),0]);
function group(id){
    const root={uid:id*65536,groupId:id,fileId:0,parentUid:-1,type:0,isIf3:true,rawX:10,rawY:10,
        rawWidth:180,rawHeight:100,scrollHeight:200};
    const label={...root,uid:root.uid+1,fileId:1,parentUid:root.uid,type:4,rawX:5,rawY:8,
        rawWidth:120,rawHeight:20,text:"cached",fontId:-1,flags:2,actions:["Select"]};
    const host={...root,uid:root.uid+2,fileId:2,parentUid:root.uid,rawX:20,rawY:35,rawWidth:120,rawHeight:50};
    const widgets=new Map([root,label,host].map(w=>[w.uid,w]));
    return {groupId:id,widgets,...linkInterfaceWidgets(widgets)};
}
function fixture(load=async id=>group(id)){
    const view={interfaces:{load},active:null,generation:0,canvas:{getBoundingClientRect:()=>({left:0,top:0})},
        close(){this.generation++;this.active=null;},
        async showGroup(scene){this.active={group:scene,layout:flattenInterface(scene,400,300)};}};
    const sent=[],statuses=[];
    const runtime=new ServerInterfaces({view,session:{sendGame:(...p)=>sent.push(p)},onStatus:m=>statuses.push(m)});
    return {runtime,view,sent,statuses};
}

test("popout sidebar stays invisible and click-through while other server interfaces remain usable",async()=>{
    const sources=new Map([161,728,231].map(id=>[id,group(id)]));
    const {runtime,view,sent}=fixture(async id=>sources.get(id));
    const host=161*65536+2;
    runtime.handle(top(161));runtime.handle(open(host,728));await runtime.pending;
    assert.ok(runtime.mounts.has(host),"server mount state is retained");
    assert.equal(sources.get(728).roots[0].hidden,undefined,"cached widgets are not mutated");
    assert.ok(view.active.layout.nodes.every(n=>n.widget.groupId!==728),"sidebar and expand button are omitted");
    assert.equal(runtime.click(46,64),false,"hidden sidebar does not consume world clicks");
    runtime.handle(packet("IF_SETHIDE",[128,...me(728*65536)]));await runtime.pending;
    assert.ok(view.active.layout.nodes.every(n=>n.widget.groupId!==728),"server updates cannot reveal sidebar");
    runtime.handle(open(host,231));await runtime.pending;
    assert.ok(view.active.layout.nodes.some(n=>n.widget.groupId===231),"replacement dialogue is visible");
    assert.equal(runtime.click(46,64),true,"dialogue remains interactive");
    assert.equal(sent.length,1);
    runtime.close();
});

test("revision-240 interface packet vectors preserve field order and transforms",()=>{
    assert.deepEqual(decode("IF_OPENTOP",[0xb4,0x12]),{kind:"top",groupId:0x1234});
    assert.deepEqual(decode("IF_OPENSUB",[0,0xb4,0x12,0x34,0x12,0x78,0x56]),
        {kind:"open",uid:0x12345678,groupId:0x1234,type:0});
    assert.deepEqual(decode("IF_MOVESUB",[0x34,0x12,0x78,0x56,0xcd,0xab,0x12,0xef]),
        {kind:"move",source:0x12345678,destination:0xabcdef12});
    assert.deepEqual(decode("IF_SETTEXT",[0x56,0x78,0x12,0x34,72,105,0]),
        {kind:"patch",uid:0x12345678,patch:{text:"Hi"}});
    assert.equal(decode("IF_SETTEXT",[0x56,0x78,0x12,0x34,128,146,0]).patch.text,"€’");
    assert.deepEqual(decode("IF_SETHIDE",[127,0x56,0x78,0x12,0x34]),
        {kind:"patch",uid:0x12345678,patch:{hidden:true}});
    assert.deepEqual(decode("IF_SETCOLOUR",[0x9f,0x7c,0x78,0x56,0x34,0x12]),
        {kind:"patch",uid:0x12345678,patch:{color:0xf800f8}});
    assert.deepEqual(decode("IF_SETSCROLLPOS",[0x34,0x12,0x78,0x56,1,44]),
        {kind:"patch",uid:0x12345678,patch:{scrollY:300}});
    assert.deepEqual(decode("IF_SETPOSITION",[0xfe,0x54,2,0x3c,0x78,0x56,0x34,0x12]),
        {kind:"patch",uid:0x12345678,patch:{rawX:-300,rawY:700,legacyX:-300,legacyY:700,xPositionMode:0,yPositionMode:0}});
    assert.deepEqual(decode("IF_SETEVENTS_V2",[0x12,0x34,0x56,0x78,2,1,4,3,255,127,8,7,6,5,255,255]),
        {kind:"events",uid:0x12345678,start:-1,end:-1,flags:0x01020304,flags2:0x05060708});
});
test("resync decodes a complete mount/event snapshot and rejects malformed tails atomically",()=>{
    const bytes=[0,10,0,1,...be(10*65536+2),0,11,0,...be(11*65536+1),255,255,255,255,...be(2),...be(0)];
    assert.deepEqual(decode("IF_RESYNC_V2",bytes),{kind:"resync",groupId:10,
        mounts:[{uid:10*65536+2,groupId:11,type:0}],events:[{uid:11*65536+1,start:-1,end:-1,flags:2,flags2:0}]});
    const {runtime}=fixture();runtime.handle(top(12));
    assert.throws(()=>runtime.handle(packet("IF_RESYNC_V2",bytes.slice(0,-1))),/Truncated/);
    assert.equal(runtime.top,12);assert.equal(runtime.mounts.size,0);
    assert.throws(()=>decode("IF_OPENTOP",[1,0,3]),/Trailing/);
    assert.throws(()=>decode("IF_OPENSUB",[99,129,0,0,0,0,0]),/Invalid/);
    assert.throws(()=>decode("IF_SETTEXT",[0,0,0,0,65]),/Truncated/);
    runtime.close();
});
test("server mount, component updates, moves, closes and resync produce a nested cache scene",async()=>{
    const cached=new Map([10,11,12].map(id=>[id,group(id)])),{runtime,view}=fixture(async id=>cached.get(id));
    runtime.handle(top(10));runtime.handle(open(10*65536+2,11));
    runtime.handle(text(11*65536+1,"server text"));await runtime.pending;
    const label=view.active.layout.nodes.find(n=>n.widget.uid===11*65536+1);
    assert.equal(label.widget.text,"server text");assert.equal(label.x,45);assert.equal(label.y,63);
    assert.equal(cached.get(11).widgets.get(11*65536+1).text,"cached");
    runtime.handle(packet("IF_SETHIDE",[127,0,1,0,11]));await runtime.pending;
    assert.ok(!view.active.layout.nodes.some(n=>n.widget.uid===11*65536+1));
    runtime.handle(packet("IF_MOVESUB",[...me(10*65536+2),...me(10*65536)]));await runtime.pending;
    assert.equal(runtime.mounts.has(10*65536+2),false);assert.equal(runtime.mounts.get(10*65536).groupId,11);
    runtime.handle(close(10*65536));await runtime.pending;
    assert.ok(!view.active.layout.nodes.some(n=>n.widget.groupId===11));assert.equal(runtime.patches.size,0);
    runtime.handle(packet("IF_RESYNC_V2",[0,12,0,0]));await runtime.pending;
    assert.equal(view.active.group.groupId,12);assert.equal(runtime.mounts.size,0);runtime.close();
});
test("late cache responses cannot revive a closed or replaced interface",async()=>{
    let resolve;const slow=new Promise(r=>resolve=r);
    const {runtime,view}=fixture(id=>id===10?slow:Promise.resolve(group(id)));
    runtime.handle(top(10));const pending=runtime.pending;await Promise.resolve();
    runtime.handle(top(12));await runtime.pending;
    assert.equal(view.active.group.groupId,12);resolve(group(10));await pending;
    assert.equal(view.active.group.groupId,12);
    runtime.handle(top(10));const last=runtime.pending;runtime.close();await last;assert.equal(view.active,null);
});
test("updates arriving while assets load apply to the eventual scene; missing cache is reported",async()=>{
    let resolve;const slow=new Promise(r=>resolve=r),{runtime,view,statuses}=fixture(()=>slow);
    runtime.handle(top(10));await Promise.resolve();runtime.handle(text(10*65536+1,"queued"));
    resolve(group(10));await runtime.pending;
    assert.equal(view.active.group.widgets.get(10*65536+1).text,"queued");runtime.close();
    const missing=fixture(async()=>{throw new Error("Missing cache group");});
    missing.runtime.handle(top(20));await missing.runtime.pending;
    assert.equal(missing.view.active,null);assert.match(missing.statuses[0],/Missing cache group/);missing.runtime.close();
});
test("buttons use native revision-240 encoding and server event flags gate IF3 actions",async()=>{
    const widget={uid:0x12345678,isIf3:true,actions:["Use"],flags:2};
    assert.deepEqual(encodeInterfaceButton(widget),{opcode:1,payload:Uint8Array.of(0x12,0x34,0x56,0x78,255,255,255,255,1)});
    assert.equal(encodeInterfaceButton({...widget,flags:0}),null);
    assert.deepEqual([...encodeInterfaceButton({...widget,isIf3:false,buttonType:6}).payload],
        [0x12,0x34,0x56,0x78,127,255]);
    assert.equal(encodeInterfaceButton({...widget,isIf3:false,buttonType:1}).opcode,11);
    assert.equal(encodeInterfaceButton({...widget,isIf3:false,buttonType:3}).opcode,98);
    const {runtime,sent}=fixture();runtime.handle(top(10));await runtime.pending;
    assert.equal(runtime.click(16,19),true);assert.equal(sent[0][0],1);
    runtime.handle(packet("IF_SETEVENTS_V2",[...be(10*65536+1),...me(0),255,127,...le(0),255,255]));
    await runtime.pending;assert.equal(runtime.click(16,19),false);assert.equal(sent.length,1);
    runtime.close();assert.equal(runtime.click(16,19),false);
});
test("interface pointer capture consumes widget clicks while leaving world gestures available",async()=>{
    const {runtime,sent}=fixture();runtime.handle(top(10));await runtime.pending;
    const listeners=new Map(),surface={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
    runtime.bindInput(surface);
    const event=(x,y)=>({clientX:x,clientY:y,button:0,pointerId:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
    const world=event(300,200);listeners.get("pointerdown")(world);assert.equal(world.stopped,undefined);
    const down=event(16,19);listeners.get("pointerdown")(down);assert.equal(down.stopped,true);
    listeners.get("pointerup")(event(16,19));assert.equal(sent.length,1);
    listeners.get("pointerdown")(event(16,19));listeners.get("pointerup")(event(50,19));assert.equal(sent.length,1);
    listeners.get("pointerdown")(event(16,19));runtime.handle(close(10*65536));
    listeners.get("pointerup")(event(16,19));assert.equal(sent.length,1);
    runtime.close();assert.equal(listeners.size,0);
});
test("gameplay routes interface packets and disconnect clears ownership",()=>{
    const calls=[],interfaces={handle:p=>{calls.push(p.name);return true;},close:()=>calls.push("closed")};
    const viewport={setActors(){}};
    const game=new NativeGameplay({cache:{},viewport,session:{},interfaces});
    game.handle(top(10));game.close();assert.deepEqual(calls,["IF_OPENTOP","closed"]);
});
