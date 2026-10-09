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
