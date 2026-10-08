import assert from "node:assert/strict";
import {test} from "node:test";
import {cameraWheelDistance,GAME_CAMERA_ZOOM} from "../browser/world-webgl.mjs";
import {NativeGameplay} from "../browser/native-gameplay.mjs";

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
