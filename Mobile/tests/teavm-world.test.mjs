import test from "node:test";
import assert from "node:assert/strict";
import {TeaVmWorldBridge} from "../browser/teavm-world.mjs";

const ui=()=>({
    cache:{loadIndex(){}},canvas:{clientWidth:765,clientHeight:503},
    stage:{hidden:true},title:{hidden:false},overlay:{hidden:true},
    worldStatus:{textContent:""}
});
test("TeaVM world bridge attaches to the authenticated revision-240 session before rebuild packets",()=>{
    const elements=ui(),events=[];
    let options,closed=false,disposed=false;
    const world=new TeaVmWorldBridge({...elements,
        createViewport:canvas=>({
            canvas,onSceneFrame:null,setActors(){},setRoofContext(){},
            dispose(){disposed=true;events.push("dispose viewport");}
        }),
        createGameplay:opts=>(options=opts,{
            authenticated(account){events.push("authenticated "+account.playerIndex);},
            handle(packet){events.push("packet "+packet.name);},
            close(){closed=true;events.push("close gameplay");}
        }),
        onReady:()=>events.push("first painted frame")
    });
    const session={connected:true};
    world.activate(session,{playerIndex:42});
    assert.equal(elements.stage.hidden,false);
    assert.equal(elements.title.hidden,true);
    assert.equal(elements.overlay.hidden,false);
    world.handle({name:"REBUILD_NORMAL_V2",payload:new Uint8Array([1])});
    assert.deepEqual(events,["authenticated 42","packet REBUILD_NORMAL_V2"]);
    assert.equal(elements.worldStatus.textContent,"Loading - Please wait.");
    options.onStatus("Loading verified cache terrain, models and textures...");
    assert.equal(elements.worldStatus.textContent,"Loading - Please wait.");
    options.onLoading();
    options.onReady();
    assert.equal(elements.overlay.hidden,false,"never reveal the world before WebGL actually draws");
    world.viewport.onSceneFrame();
    assert.equal(elements.overlay.hidden,true);
    assert.equal(elements.worldStatus.textContent,"");
    assert.equal(events.at(-1),"first painted frame");
    world.dispose();
    assert.equal(closed,true);
    assert.equal(disposed,true);
    assert.equal(elements.stage.hidden,true);
    assert.equal(elements.title.hidden,false);
    world.handle({name:"PLAYER_INFO",payload:new Uint8Array()});
    assert.equal(events.filter(event=>event.startsWith("packet")).length,1);
});
test("TeaVM world refuses unauthenticated scenes and tears down partial renderer errors",()=>{
    const elements=ui();
    const world=new TeaVmWorldBridge({...elements,createViewport:()=>{
        throw new Error("WebGL not available");
    }});
    assert.throws(()=>world.activate({connected:false},{playerIndex:42}),/before native authentication/);
    assert.throws(()=>world.activate({connected:true},{playerIndex:42}),/WebGL not available/);
    assert.equal(elements.stage.hidden,true);
    assert.equal(elements.title.hidden,false);
    assert.equal(world.active,false);
});
test("TeaVM world treats malformed rev-240 game packet as a fatal session error",()=>{
    const elements=ui(),stopped=[];
    const world=new TeaVmWorldBridge({...elements,
        createViewport:canvas=>({canvas,setActors(){},setRoofContext(){},dispose(){}}),
        createGameplay:()=>({authenticated(){},handle(){throw new Error("Invalid rebuild");},close(){}})
    });
    world.activate({connected:true,stop:error=>stopped.push(error.message)},{playerIndex:7});
    world.handle({name:"REBUILD_NORMAL_V2"});
    assert.deepEqual(stopped,["Revision-240 world packet failed: Invalid rebuild"]);
    world.dispose();
});

test("active mobile world attaches server interfaces and routes every context menu action",async()=>{
    const elements=ui(),events=[],calls=[];
    let options,menuOptions,closed=0,disposed=0;
    elements.canvas.parentElement={};
    const view={active:null,paint(){},close(){}};
    const interfaces={view,bindInput:surface=>events.push(["bind",surface]),close:()=>closed++};
    const menu={load:async()=>{},open:info=>events.push(["menu",info]),close:()=>events.push("menu closed"),dispose:()=>disposed++};
    const world=new TeaVmWorldBridge({...elements,interfaceCanvas:{},menuCanvas:{},
        createViewport:()=>({dispose(){}}),createInterfaceView:()=>view,
        createInterfaces:settings=>{assert.equal(settings.session.connected,true);return interfaces;},
        createMenu:(_canvas,settings)=>{menuOptions=settings;return menu;},
        createGameplay:settings=>{
            options=settings;assert.equal(settings.interfaces,interfaces);
            return {models:{},authenticated(){events.push("authenticated");},handle(){},close(){},
                move:info=>calls.push(["walk",info]),interactNpc:(...args)=>calls.push(["npc",...args]),
                interactObject:(...args)=>calls.push(["object",...args]),
                examineNpc:index=>calls.push(["examine",index]),examineObject:()=>calls.push(["examine-object"])};
        }
    });
    world.activate({connected:true},{playerIndex:7});
    assert.deepEqual(events.slice(0,2),[["bind",elements.canvas.parentElement],"authenticated"]);
    const info={index:12,slot:1,tile:{x:3,y:4},x:100,y:110,run:true};
    menuOptions.onEntry({kind:"walk"},info);assert.equal(calls.length,0,"loading cover blocks actions");
    options.onReady();world.viewport.onSceneFrame();
    options.onNpcMenu(info);assert.deepEqual(events.at(-1),["menu",info]);
    for(const kind of ["walk","npc","object","examine","examine-object"])
        menuOptions.onEntry({kind,slot:1},info);
    assert.deepEqual(calls,[["walk",{x:3,y:4,run:true,screenX:100,screenY:110}],
        ["npc",12,1,{run:true}],["object",1,{run:true}],["examine",12],["examine-object"]]);
    options.onLoading();assert.equal(events.at(-1),"menu closed");
    world.dispose();assert.equal(closed,1);assert.equal(disposed,1);
    const before=calls.length;menuOptions.onEntry({kind:"walk"},info);assert.equal(calls.length,before);
    await Promise.resolve();
});

test("world performance HUD gets real RAF and server packet hooks, and stops on logout",()=>{
    const elements=ui(),calls=[];let gameplayOptions;
    const overlay={
        start:()=>calls.push("start"),
        frame:time=>calls.push(["frame",time]),
        tick:time=>calls.push(["tick",time]),
        actorStages:stages=>calls.push(["stages",stages]),
        dispose:()=>calls.push("dispose"),
    };
    const root={};
    const world=new TeaVmWorldBridge({...elements,performanceRoot:root,
        createPerformanceOverlay:received=>{assert.equal(received,root);return overlay;},
        createViewport:canvas=>({canvas,dispose(){calls.push("viewport disposed");}}),
        createGameplay:options=>{
            gameplayOptions=options;
            return {authenticated(){},close(){},handle(){}};
        }});
    world.activate({connected:true},{playerIndex:99});
    world.viewport.onFrame(500);
    gameplayOptions.onServerTick(600);
    gameplayOptions.onActorStages({player:3,npc:4,upload:7,scenery:2});
    assert.deepEqual(calls,["start",["frame",500],["tick",600],
        ["stages",{player:3,npc:4,upload:7,scenery:2}]]);
    world.dispose();
    assert.deepEqual(calls.slice(-2),["viewport disposed","dispose"]);
    gameplayOptions.onServerTick(700);
    gameplayOptions.onActorStages({player:99});
    assert.equal(calls.length,6,"disposed world must not collect more profiler events");
});

test("iPhone rotation and visualViewport resize update world layout and remove listeners on logout",()=>{
    const before=globalThis.window;
    const listeners=new Map(),visualListeners=new Map();
    const createTarget=map=>({
        addEventListener:(name,fn)=>map.set(name,fn),
        removeEventListener:(name,fn)=>{if(map.get(name)===fn)map.delete(name);}
    });
    const win=createTarget(listeners);win.visualViewport=createTarget(visualListeners);
    globalThis.window=win;
    try{
        const elements=ui(),events=[],world=new TeaVmWorldBridge({...elements,
            createViewport:()=>({dispose(){}}),
            createGameplay:()=>({
                authenticated(){},handle(){},close(){},
                updateWindowStatus(){events.push("window status");}
            })});
        world.activate({connected:true},{playerIndex:7});
        assert.equal(listeners.has("resize"),true);
        assert.equal(visualListeners.has("resize"),true);
        listeners.get("resize")();
        visualListeners.get("resize")();
        assert.deepEqual(events,["window status","window status"]);
        world.dispose();
        assert.equal(listeners.size,0);
        assert.equal(visualListeners.size,0);
    }finally{
        if(before===undefined)delete globalThis.window;else globalThis.window=before;
    }
});
