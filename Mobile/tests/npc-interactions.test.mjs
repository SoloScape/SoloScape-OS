import assert from "node:assert/strict";
import {test} from "node:test";
import {NPC_OPCODES,encodeNpcInteraction,encodeNpcExamine,npcActionOptions} from "../browser/npc-interactions.mjs";
import {NpcLongPress,NPC_HOLD_DELAY_MS} from "../browser/npc-pointer.mjs";
import {pickNpcTriangles,dispatchWorldContextMenu} from "../browser/world-webgl.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";

test("all five OPNPC_V2 packets agree with rsprot revision-240 decoder permutations",()=>{
    assert.deepEqual(NPC_OPCODES,[59,87,43,35,73]);
    const data=[
        [59,[0x34,0x12,7,129]],
        [87,[0x34,0x12,135,127]],
        [43,[0x34,0x12,127,249]],
        [35,[127,7,0x12,0xb4]],
        [73,[7,255,0x12,0x34]],
    ];
    for(let slot=0;slot<5;slot++){
        const {opcode,payload}=encodeNpcInteraction(0x1234,slot,{subop:7,controlKey:true});
        assert.equal(opcode,data[slot][0]);assert.deepEqual([...payload],data[slot][1]);
        assert.equal(payload.length,4);
    }
    assert.deepEqual([...encodeNpcInteraction(65534,0).payload],[254,255,0,128]);
    assert.throws(()=>encodeNpcInteraction(65535,0),/index/);
    assert.throws(()=>encodeNpcInteraction(-1,0),/index/);
    assert.throws(()=>encodeNpcInteraction(0,5),/slot/);
    assert.throws(()=>encodeNpcInteraction(0,0,{subop:256}),/suboption/);
    assert.throws(()=>encodeNpcInteraction(0,0,{controlKey:1}),/control/);
});
test("NPC action options retain source slots and honour server visibility masks",()=>{
    const def={actions:["Talk-to",null," Trade ","hidden","Attack"]};
    assert.deepEqual(npcActionOptions(def,{type:2}),[
        {slot:0,label:"Talk-to"},{slot:2,label:"Trade"},{slot:4,label:"Attack"}]);
    assert.deepEqual(npcActionOptions(def,{visibleOps:0b00100}),[{slot:2,label:"Trade"}]);
    assert.deepEqual(npcActionOptions(def,{visibleOps:0}),[]);
    assert.deepEqual(npcActionOptions({actions:["",null]},{}),[]);
    assert.deepEqual(npcActionOptions({actions:["Talk-to"],isInteractable:false},{}),[]);
});
const tri=z=>Float32Array.of(
    -.6,-.4,z,25,0,0,
    .6,-.4,z,25,0,0,
    0,.6,z,25,0,0
);
const eye=new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
test("NPC triangle picking hits real geometry and prefers nearest actor including textured meshes",()=>{
    const list=[{index:18,vertices:tri(.6)},{index:19,vertices:tri(-.5)}];
    assert.equal(pickNpcTriangles(list,eye,0,0).index,19);
    assert.equal(pickNpcTriangles(list.reverse(),eye,0,0).index,19);
    assert.equal(pickNpcTriangles(list,eye,.85,.8),null);
    assert.equal(pickNpcTriangles([{index:27,vertices:tri(-.2)}],eye,0,0).index,27);
});
test("menu selection sends the selected cache action slot to the server",async()=>{
    const calls=[],menus=[],viewport={onNpc:null,onNpcCancel:null,onDestination:null,setActors(){}};
    const game=new NativeGameplay({cache:{},viewport,session:{sendGame(...args){calls.push(args);}},
        onNpcMenu:info=>menus.push(info),run:()=>false});
    game.sync={local:{x:3200,y:3200,plane:0}};
    game.npcs.npcs.set(320,{index:320,type:22,x:3202,y:3202,plane:0,visibleOps:0b00101});
    game.npcModels.definition=async()=>({name:"Wizard",actions:["Talk-to","Attack","Trade","",null]});
    await game.selectNpc({index:320,x:48,y:67,run:true});
    assert.equal(menus.at(-1).name,"Wizard");
    assert.deepEqual(menus.at(-1).actions.map(a=>a.slot),[0,2]);
    assert.equal(game.interactNpc(320,1),false);
    assert.deepEqual(calls,[]);
    assert.equal(game.interactNpc(320,2,{run:true}),true);
    assert.deepEqual(calls.map(([op,bytes])=>[op,[...bytes]]),[[43,[64,1,127,0]]]);
    assert.equal(menus.at(-1),null);
    assert.equal(game.interactNpc(320,0),false);
    game.close();
});
test("selection is cancelled after despawn, type change or async definition invalidation",async()=>{
    const menus=[],vp={onNpc:null,onNpcCancel:null,onDestination:null,setActors(){}};
    let resolve;
    const game=new NativeGameplay({cache:{},viewport:vp,session:{sendGame(){}},onNpcMenu:x=>menus.push(x)});
    game.sync={local:{plane:0}};
    game.npcs.npcs.set(4,{index:4,type:52});
    game.npcModels.definition=()=>new Promise(r=>{resolve=r;});
    const pending=game.selectNpc({index:4,x:10,y:10});
    game.clearNpcMenu();
    resolve({name:"Trader",actions:["Trade"]});await pending;
    assert.equal(game.selectedNpc,null);
    game.npcModels.definition=async()=>({name:"Trader",actions:["Trade"]});
    await game.selectNpc({index:4,x:10,y:10});
    game.npcs.npcs.get(4).type=53;
    assert.equal(game.interactNpc(4,0),false);
    game.updateNpcMotions();
    assert.equal(game.selectedNpc,null);
    await game.selectNpc({index:4,x:10,y:10});
    game.npcs.npcs.delete(4);game.updateNpcMotions();
    assert.equal(game.selectedNpc,null);
    game.close();assert.equal(menus.at(-1),null);
});

test("revision-240 Examine uses OPNPC6 and the NPC type ID, not its runtime index",()=>{
    assert.deepEqual(encodeNpcExamine(0x1234),{opcode:101,payload:Uint8Array.of(0x12,0xb4)});
    assert.deepEqual([...encodeNpcExamine(0).payload],[0,128]);
    assert.throws(()=>encodeNpcExamine(-1),/definition/);
    assert.throws(()=>encodeNpcExamine(65536),/definition/);
});
test("short tap or left-click uses first visible cache action; context mode retains all options",async()=>{
    const sent=[],menus=[],view={onNpc:null,onNpcCancel:null,onDestination:null,setActors(){}};
    const game=new NativeGameplay({cache:{},viewport:view,session:{sendGame(...x){sent.push(x);}},
        onNpcMenu:menu=>menus.push(menu)});
    game.sync={local:{plane:0}};
    game.npcs.npcs.set(17,{index:17,type:222,x:3210,y:3200,plane:0,visibleOps:0b00100});
    game.npcModels.definition=async()=>({name:"Merchant",actions:["Talk-to",null,"Trade","Attack"]});
    await game.selectNpc({index:17,x:6,y:8,mode:"default"});
    assert.deepEqual(sent.map(([opcode,payload])=>[opcode,[...payload]]),[[43,[17,0,128,0]]]);
    assert.equal(menus.at(-1),null);
    sent.length=0;
    await game.selectNpc({index:17,x:6,y:8,mode:"menu"});
    assert.deepEqual(menus.at(-1).actions,[{slot:2,label:"Trade"}]);
    assert.equal(sent.length,0);
    game.close();
});
test("Examine sends server packet and exposes cache description; stale selection is blocked",async()=>{
    const sent=[],descriptions=[],view={onNpc:null,onNpcCancel:null,onDestination:null,setActors(){}};
    const game=new NativeGameplay({cache:{},viewport:view,session:{sendGame(...args){sent.push(args);}},
        onExamine:info=>descriptions.push(info)});
    game.sync={local:{plane:0}};
    game.npcs.npcs.set(410,{index:410,type:0x1234,plane:0});
    game.npcModels.definition=async()=>({name:"Knight",examine:"A guard of the realm.",actions:["Talk-to"]});
    await game.selectNpc({index:410,x:18,y:20,mode:"menu"});
    assert.equal(game.examineNpc(410),true);
    assert.deepEqual(sent.map(([opcode,payload])=>[opcode,[...payload]]),[[101,[0x12,0xb4]]]);
    assert.deepEqual(descriptions,[{name:"Knight",description:"A guard of the realm."}]);
    assert.equal(game.examineNpc(410),false);
    await game.selectNpc({index:410,x:18,y:20});
    game.npcs.npcs.delete(410);
    assert.equal(game.examineNpc(410),false);
    assert.equal(sent.length,1);
    game.close();
});
test("long-press opens options only after a stationary hold; release does not click again",()=>{
    let sequence=0;
    const callbacks=new Map(),events=[];
    const schedule=cb=>{const id=++sequence;callbacks.set(id,()=>{callbacks.delete(id);cb();});return id;};
    const unschedule=id=>callbacks.delete(id);
    const press=new NpcLongPress(npc=>events.push(npc),{schedule,unschedule});
    assert.equal(NPC_HOLD_DELAY_MS,475);
    press.start(1,10,20,{index:5});assert.equal(callbacks.size,1);
    assert.equal(press.finish(1),false);assert.equal(callbacks.size,0);
    press.start(1,10,20,{index:5});
    press.move(1,11,21);assert.equal(callbacks.size,1);
    for(const cb of [...callbacks.values()])cb();
    assert.deepEqual(events,[{index:5}]);
    assert.equal(press.finish(1),true);
    assert.equal(press.finish(1),false);
    press.start(2,10,20,{index:6});press.move(2,20,20);
    assert.equal(callbacks.size,0);
    press.start(3,10,20,null);assert.equal(callbacks.size,0);
    press.start(4,10,20,{index:7});press.cancel();
    assert.equal(callbacks.size,0);
    assert.deepEqual(events,[{index:5}]);
});

test("right-click always suppresses the browser image menu and routes NPC, ground, empty hits",()=>{
    const calls=[],options={
        pickNpc:()=>({index:8,x:20,y:25}),
        pickGround:()=>({tile:{x:14,y:15},x:20,y:25}),
        onNpc:hit=>calls.push(["npc",hit]),
        onGround:hit=>calls.push(["ground",hit]),
        onCancel:()=>calls.push(["cancel"])
    };
    const event=()=>({clientX:20,clientY:25,shiftKey:false,prevented:0,
        preventDefault(){this.prevented++;}});
    const npcEvent=event();
    assert.equal(dispatchWorldContextMenu(npcEvent,options),"npc");
    assert.equal(npcEvent.prevented,1);
    assert.deepEqual(calls.at(-1),["npc",{index:8,x:20,y:25,mode:"menu",run:false}]);
    const groundEvent=event();
    assert.equal(dispatchWorldContextMenu(groundEvent,{...options,pickNpc:()=>null}),"ground");
    assert.equal(groundEvent.prevented,1);
    assert.deepEqual(calls.at(-1),["ground",{tile:{x:14,y:15},x:20,y:25,run:false}]);
    const blankEvent=event();
    assert.equal(dispatchWorldContextMenu(blankEvent,{...options,pickNpc:()=>null,pickGround:()=>null}),"empty");
    assert.equal(blankEvent.prevented,1);
    assert.deepEqual(calls.at(-1),["cancel"]);
});
test("ground context menu is authenticated and does not send movement before Walk here",()=>{
    const menu=[],sent=[],vp={onNpc:null,onNpcCancel:null,onDestination:null,onGroundMenu:null,setActors(){}};
    const game=new NativeGameplay({cache:{},viewport:vp,session:{sendGame(...args){sent.push(args);}},
        onNpcMenu:info=>menu.push(info)});
    game.sync={local:{x:3202,y:3202,plane:0}};
    game.origin={mapX:50,mapY:50};game.regions.set("50,50",{mapX:50,mapY:50});
    game.showGroundMenu({tile:{x:10,y:20},x:75,y:105});
    assert.deepEqual(menu.at(-1),{kind:"ground",name:"Ground",tile:{x:10,y:20},x:75,y:105,run:false});
    assert.equal(sent.length,0);
    game.clearNpcMenu();assert.equal(menu.at(-1),null);
    game.showGroundMenu({tile:{x:100,y:20},x:75,y:105});
    assert.equal(menu.at(-1),null); // outside all loaded regions
    game.close();
});
