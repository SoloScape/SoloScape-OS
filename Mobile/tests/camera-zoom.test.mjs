import assert from "node:assert/strict";
import {test} from "node:test";
import {cameraWheelDistance,GAME_CAMERA_ZOOM,GAME_CAMERA_ROTATION,rotateCamera,NativeTerrainViewport} from "../browser/world-webgl.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";

test("camera uses revision-240 pitch limits, wraps yaw and follows the OpenOSRS drag adapter",()=>{
    const camera={yaw:0,pitch:.65};
    rotateCamera(camera,100,0);
    assert.ok(Math.abs(camera.yaw-(16384-1600)*2*Math.PI/16384)<1e-12);
    rotateCamera(camera,-100,10000);
    assert.ok(Math.min(camera.yaw,2*Math.PI-camera.yaw)<1e-12);
    assert.equal(camera.pitch,GAME_CAMERA_ROTATION.maxPitch);
    rotateCamera(camera,0,-10000);
    assert.equal(camera.pitch,GAME_CAMERA_ROTATION.minPitch);
});

test("actual viewport keys orbit without panning, middle drag rotates and left drag does not",()=>{
    const saved=Object.fromEntries(["window","requestAnimationFrame","cancelAnimationFrame"].map(k=>[k,globalThis[k]]));
    const listeners=new Map();let viewport;
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},
        {get:(target,key)=>target[key]??(()=>({}))});
    const canvas={getContext:()=>gl,addEventListener(){},removeEventListener(){},setPointerCapture(){}};
    try{
        globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
        globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
        viewport=new NativeTerrainViewport(canvas);
        const target=[...viewport.target],yaw=viewport.yaw,pitch=viewport.pitch;
        let consumed=0;
        viewport.onKey({key:"ArrowLeft",target:{tagName:"CANVAS"},preventDefault(){consumed++;}});
        assert.ok(viewport.yaw<yaw);assert.deepEqual(viewport.target,target);
        viewport.onKey({key:"w",target:{tagName:"CANVAS"},preventDefault(){consumed++;}});
        assert.ok(viewport.pitch>pitch);assert.deepEqual(viewport.target,target);assert.equal(consumed,2);
        const before=viewport.yaw;
        viewport.onKey({key:"a",target:{tagName:"INPUT"},preventDefault(){throw new Error("Consumed typing");}});
        assert.equal(viewport.yaw,before);
        const pointer=button=>({pointerId:1,clientX:0,clientY:0,button,pointerType:"mouse",preventDefault(){}});
        viewport.onPointerDown(pointer(0));viewport.onPointerMove({...pointer(0),clientX:100});
        assert.equal(viewport.yaw,before);
        viewport.onPointerDown(pointer(1));viewport.onPointerMove({...pointer(1),clientX:100});
        assert.notEqual(viewport.yaw,before);
        viewport.dispose();viewport=null;assert.equal(listeners.has("keydown"),false);
    }finally{
        viewport?.dispose();
        for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
    }
});

test("wheel zoom has gameplay limits, consistent wheel units and a default reset",()=>{
    let distance=GAME_CAMERA_ZOOM.default;
    for(let i=0;i<100;i++)distance=cameraWheelDistance(distance,{deltaY:120});
    assert.equal(distance,24);
    for(let i=0;i<100;i++)distance=cameraWheelDistance(distance,{deltaY:-120});
    assert.equal(distance,6);
    assert.equal(cameraWheelDistance(distance,{deltaY:120,ctrlKey:true}),12);
    assert.equal(cameraWheelDistance(12,{deltaY:16}),cameraWheelDistance(12,{deltaY:1,deltaMode:1}));
    assert.equal(cameraWheelDistance(12,{deltaY:334}),cameraWheelDistance(12,{deltaY:1,deltaMode:2}));
    assert.equal(cameraWheelDistance(12,{deltaY:NaN}),12);
});

test("login sets a close camera before appearance loading and model failure preserves chosen zoom",async()=>{
    const viewport={canvas:{clientWidth:390,clientHeight:844},distance:170,pitch:1,
        setActors(){},setSceneLevel(){},setScenery(){}};
    const game=new NativeGameplay({cache:{},viewport,session:{sendGame(){}},now:()=>1000,
        models:{composition:async()=>{throw new Error("model unavailable");}}});
    try{
        game.authenticated({playerIndex:1});
        assert.equal(viewport.distance,12);
        assert.equal(viewport.pitch,.65);
        viewport.distance=8;
        game.origin={mapX:50,mapY:50};game.regions.set("50,50",{});
        game.updateMotion({x:3201,y:3201,plane:0,appearance:{hidden:false},moving:false});
        await game.drawActors();
        assert.equal(game.renderError,"model unavailable");
        assert.equal(viewport.distance,8);
    }finally{game.close();}
});
