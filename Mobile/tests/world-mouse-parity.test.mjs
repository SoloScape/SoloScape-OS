import assert from "node:assert/strict";
import {test} from "node:test";
import {decodeObjectDefinition} from "../browser/object-definitions.mjs";
import {encodeLocInteraction,encodeLocExamine,objectActionOptions} from "../browser/loc-interactions.mjs";
import {dispatchWorldContextMenu,shouldRotateCameraDrag,combineRegionMeshes} from "../browser/world-webgl.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";
import {buildNativeMenuEntries,fallbackMenuFont} from "../browser/native-menu.mjs";
import {NativeClickCross,clickCrossAppearance} from "../browser/mouse-cross.mjs";

test("desktop mouse drag is middle only, while touch orbit stays active",()=>{
    assert.equal(shouldRotateCameraDrag(0,"mouse"),false);
    assert.equal(shouldRotateCameraDrag(1,"mouse"),true);
    assert.equal(shouldRotateCameraDrag(2,"mouse"),false);
    assert.equal(shouldRotateCameraDrag(0,"touch"),true);
});
test("revision-240 cache action strings preserve Open, Close and hidden slots",()=>{
    const def=decodeObjectDefinition(Uint8Array.from([
        2,...Buffer.from("Door"),0,
        30,...Buffer.from("Open"),0,
        31,...Buffer.from("hidden"),0,
        32,...Buffer.from("Close"),0,0
    ]),4321);
    assert.deepEqual(objectActionOptions(def),[{slot:0,label:"Open"},{slot:2,label:"Close"}]);
    assert.deepEqual(buildNativeMenuEntries({kind:"object",name:def.name,actions:objectActionOptions(def)})
        .map(e=>e.option),["Open","Close","Examine","Cancel"]);
});
test("all revision-240 OPLOC actions use the pinned TSPS packet permutations",()=>{
    const id=0x1234,x=0x123,y=0x456;
    const expected=[
        [96,[1,163,86,4,255,180,18]],
        [28,[163,1,214,4,127,18,52]],
        [42,[86,4,52,18,163,1,127]],
        [38,[1,163,52,18,4,214,255]],
        [51,[1,35,129,4,214,18,180]]
    ];
    for(const [slot,[opcode,bytes]] of expected.entries()){
        const packet=encodeLocInteraction(id,x,y,slot,{controlKey:true});
        assert.equal(packet.opcode,opcode);
        assert.deepEqual([...packet.payload],bytes);
    }
    assert.deepEqual([...encodeLocExamine(id).payload],[180,18]);
    assert.equal(encodeLocExamine(id).opcode,85);
    assert.throws(()=>encodeLocInteraction(5,-1,20,0),/world X/);
});
test("right-click picks nearest visible object before ground, without the browser menu",()=>{
    const calls=[],evt={clientX:100,clientY:120,shiftKey:false,
        preventDefault(){calls.push("prevented");}};
    const options={pickNpc:()=>({index:7,depth:.9}),pickObject:()=>({id:5,depth:.2}),
        pickGround:()=>({tile:{x:8,y:9}}),onNpc:()=>calls.push("npc"),
        onObject:hit=>calls.push(["object",hit.mode,hit.id]),
        onGround:()=>calls.push("ground"),onCancel:()=>calls.push("cancel")};
    assert.equal(dispatchWorldContextMenu(evt,options),"object");
    assert.deepEqual(calls,["prevented",["object","menu",5]]);
    calls.length=0;
    assert.equal(dispatchWorldContextMenu(evt,{...options,pickNpc:()=>({index:7,depth:.1})}),"npc");
    assert.deepEqual(calls,["prevented","npc"]);
});
test("object triangles preserve identity and shift correctly between map squares",()=>{
    const vertices=new Float32Array([1,0,2,100,0,0, 2,0,2,100,0,0, 1,0,3,100,0,0]);
    const scene={vertices,levelCounts:[3,0,0,0],texturedBatches:[],
        pickMeshes:[{id:25,x:1,y:2,plane:0,level:0,actions:["Open"],vertices}]};
    const result=combineRegionMeshes([{scene,dx:64,dy:-64}]);
    assert.deepEqual([result.pickMeshes[0].x,result.pickMeshes[0].y],[65,-62]);
    assert.deepEqual([result.pickMeshes[0].vertices[0],result.pickMeshes[0].vertices[2]],[65,-62]);
    assert.deepEqual([...vertices.slice(0,3)],[1,0,2],"source mesh remains untouched");
});
test("object left-click Open and right-click Examine send valid action packets and yellow cross",()=>{
    const sent=[],menu=[],cross=[],vp={
        setActors(){},onClickCross:(x,y)=>cross.push([x,y])
    };
    const game=new NativeGameplay({cache:{},viewport:vp,session:{sendGame(...args){sent.push(args);}},
        onNpcMenu:info=>menu.push(info)});
    game.sync={local:{x:3202,y:3202,plane:0}};
    game.origin={mapX:50,mapY:50};game.regions.set("50,50",{mapX:50,mapY:50});
    const hit={id:25,name:"Door",actions:["Open",null,"Close"],
        tileX:12,tileY:15,plane:0,x:60,y:80};
    try{
        game.selectObject({...hit,mode:"default"});
        assert.equal(sent[0][0],96);
        assert.deepEqual(cross[0],[60,80]);
        game.selectObject({...hit,mode:"menu"});
        assert.deepEqual(menu.at(-1).actions,[{slot:0,label:"Open"},{slot:2,label:"Close"}]);
        assert.equal(game.interactObject(1),false,"no unadvertised action");
        assert.equal(game.examineObject(),true);
        assert.equal(sent[1][0],85);
        assert.deepEqual([...sent[1][1]],[153,0]); // shortAddLE(25)
    }finally{game.close();}
});
test("TSPS 100ms yellow click cross shrinks and clears, without stealing mouse input",()=>{
    assert.deepEqual(clickCrossAppearance(0),{size:24,alpha:1,visible:true});
    assert.deepEqual(clickCrossAppearance(100),{size:8,alpha:.5,visible:false});
    let now=100,raf;
    const old=globalThis.window;globalThis.window={devicePixelRatio:1};
    const operations=[],ctx={setTransform(){},clearRect(){},save(){},restore(){},
        beginPath(){},moveTo(...v){operations.push(["move",...v]);},
        lineTo(...v){operations.push(["line",...v]);},stroke(){operations.push(["stroke"]);},
        arc(){},fill(){}};
    const canvas={width:0,height:0,parentElement:{clientWidth:800,clientHeight:600},getContext:()=>ctx};
    try{
        const cross=new NativeClickCross(canvas,{now:()=>now,schedule:cb=>{raf=cb;return 1;},unschedule:()=>{}});
        cross.show(150,200);
        assert.deepEqual(operations[0],["move",138,188]);
        now=220;raf();
        assert.equal(cross.active,null);
        cross.dispose();
    }finally{globalThis.window=old;}
});
test("fallback menu font measures and draws before verified cache font downloads",()=>{
    const font=fallbackMenuFont(),text=[];
    const ctx={measureText:s=>({width:s.length*7}),fillText:(...args)=>text.push(args)};
    assert.equal(font.measure("Open"),28);
    assert.equal(font.draw(ctx,"Open",1,10,"#fff",true),29);
    assert.equal(text.length,2);
});

test("successful left-click Walk here sends MOVE_GAMECLICK and displays yellow click cross",()=>{
    const sent=[],cross=[];
    const vp={setActors(){},onClickCross:(x,y)=>cross.push([x,y])};
    const game=new NativeGameplay({cache:{},viewport:vp,session:{sendGame(...args){sent.push(args);}}});
    game.sync={local:{x:3200,y:3200,plane:0}};
    game.origin={mapX:50,mapY:50};
    const ground={mapX:50,mapY:50,side:64,heights:new Int32Array(4096),
        planes:Array.from({length:4},()=>({heights:new Int32Array(4096),
            renderFlags:new Uint8Array(4096)}))};
    game.regions.set("50,50",ground);
    try{
        game.move({x:11,y:12,screenX:77,screenY:84});
        assert.equal(sent.length,1);
        assert.deepEqual(cross,[[77,84]]);
        assert.deepEqual(game.destination,{x:3211,y:3212});
        game.move({x:200,y:12,screenX:77,screenY:84});
        assert.equal(cross.length,1,"invalid map clicks do not show a false success");
    }finally{game.close();}
});
