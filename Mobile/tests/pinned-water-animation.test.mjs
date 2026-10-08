import assert from "node:assert/strict";
import {test} from "node:test";
import {textureAnimationOffset,NativeTerrainViewport} from "../browser/world-webgl.mjs";
import {isKnownWaterTextureId,KNOWN_WATER_TEXTURE_IDS} from "../browser/tsps-runtime/common-world-WaterTextureIds.mjs";

test("TSPS water taxonomy includes classic, swamp, ice, dark and water-colour bank",()=>{
    for(const id of [1,25,91,130,145,189,208])assert.equal(isKnownWaterTextureId(id),true);
    for(const id of [-1,0,24,90,129,190,207,209])assert.equal(isKnownWaterTextureId(id),false);
    assert.equal(KNOWN_WATER_TEXTURE_IDS.size,64);
});
test("vanilla TSPS UV animation follows the exact pinned direction/speed scale",()=>{
    const speed=4;
    assert.deepEqual(textureAnimationOffset({animationDirection:0,animationSpeed:speed},120),[0,0]);
    assert.deepEqual(textureAnimationOffset({animationDirection:1,animationSpeed:speed},20),[0,-4/128]);
    assert.deepEqual(textureAnimationOffset({animationDirection:2,animationSpeed:speed},40),[-8/128,0]);
    assert.deepEqual(textureAnimationOffset({animationDirection:3,animationSpeed:speed},20),[0,4/128]);
    assert.deepEqual(textureAnimationOffset({animationDirection:4,animationSpeed:speed},20),[4/128,0]);
    assert.deepEqual(textureAnimationOffset({animationDirection:4,animationSpeed:2},1280),[0,0]);
    assert.deepEqual(textureAnimationOffset({animationDirection:9,animationSpeed:4},30),[0,0]);
});
test("textured batch classification retains pinned water IDs for future material passes",()=>{
    const vp=Object.create(NativeTerrainViewport.prototype),deleted=[];
    vp.gl={
        deleteBuffer:buffer=>deleted.push(buffer),
        createBuffer:()=>({}),bindBuffer:()=>{},bufferData:()=>{},
        ARRAY_BUFFER:34962,STATIC_DRAW:35044,
    };vp.terrainBatches=[];
    vp.replaceBatches("terrainBatches",[
        {vertices:new Float32Array(18),texture:1,level:0},
        {vertices:new Float32Array(18),texture:24,level:0},
        {vertices:new Float32Array(18),texture:208,level:2},
    ]);
    assert.deepEqual(vp.terrainBatches.map(b=>b.isWater),[true,false,true]);
    assert.deepEqual(vp.terrainBatches.map(b=>b.level),[0,0,2]);
});
