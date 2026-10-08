import assert from "node:assert/strict";
import {test} from "node:test";
import {NPC_OPCODES,encodeNpcInteraction,npcActionOptions} from "../browser/npc-interactions.mjs";
import {pickNpcTriangles} from "../browser/world-webgl.mjs";
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
