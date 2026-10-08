import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeTerrainViewport} from "../browser/world-webgl.mjs";

test("map loading frame callback waits for completed nonempty WebGL terrain draw",()=>{
    const previousWindow=globalThis.window;
    globalThis.window={devicePixelRatio:1};
    const draw=[];
    const gl=new Proxy({
        LINES:1,TRIANGLES:4,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
        ARRAY_BUFFER:34962,TEXTURE0:33984,TEXTURE_2D:3553,FLOAT:5126,
        getAttribLocation:()=>0,getUniformLocation:()=>({}),
        drawArrays:(mode,from,count)=>draw.push([mode,from,count]),
    },{get:(target,field)=>field in target?target[field]:()=>{}});
    try{
        const vp=Object.create(NativeTerrainViewport.prototype);
        vp.gl=gl;vp.canvas={clientWidth:640,clientHeight:480,width:640,height:480};
        vp.target=[0,0,0];vp.yaw=0;vp.pitch=0.65;vp.distance=12;vp.visibleLevel=0;
        vp.program={};vp.textureProgram={};vp.buf={};vp.palette={};
        vp.terrainBatches=[];vp.sceneryBatches=[];vp.actorBatches=[];
        vp.terrainLevelCounts=[3,0,0,0];vp.sceneryLevelCounts=[0,0,0,0];
        vp.sceneryCount=0;vp.actorCount=0;vp.textures=new Map();
        vp.drawMode=gl.TRIANGLES;vp.count=0;
        let confirmed=0;
        vp.onSceneFrame=()=>{confirmed++;};
        vp.render();assert.equal(confirmed,0,"cleared background is not a world frame");
        vp.count=3;vp.drawMode=gl.LINES;vp.render();
        assert.equal(confirmed,0,"wireframe terrain must not count as a world-ready map");
        vp.drawMode=gl.TRIANGLES;vp.render();
        assert.equal(confirmed,1);assert.ok(draw.length>=1);
        vp.render();assert.equal(confirmed,1,"map readiness fires once");
    }finally{
        if(previousWindow===undefined)delete globalThis.window;
        else globalThis.window=previousWindow;
    }
});
