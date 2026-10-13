import assert from "node:assert/strict";
import {test} from "node:test";
import {SceneTileModel} from "../browser/tsps-runtime/rs-scene-SceneTileModel.mjs";
import {INVALID_HSL_COLOR,adjustUnderlayLight,adjustOverlayLight} from "../browser/tsps-runtime/rs-util-ColorUtil.mjs";
import {buildTspsFloorTile,buildTerrainMesh,buildTerrainScene} from "../browser/world-webgl.mjs";
import {HSL_PALETTE} from "../browser/floor-lighting.mjs";
import {HSL_RGB_MAP} from "../browser/tsps-runtime/rs-util-ColorUtil.mjs";
import {prepareFloorLighting} from "../browser/floor-lighting.mjs";

test("native tile adapter renders exact pinned TSPS SceneTileModel faces on all 13 overlay shapes and rotations",()=>{
    const heights=[-80,-88,-104,-120],lights=[82,94,73,112];
    for(let shape=0;shape<=12;shape++)for(let rotation=0;rotation<4;rotation++){
        const args={shape,rotation,heights,lights,underlayHsl:25000,
            overlayHsl:32000,overlayTexture:5};
        const expected=new SceneTileModel(shape,rotation,5,0,0,
            ...heights,...lights,25000,25000,25000,25000,32000,32000,-1,-1);
        const actual=buildTspsFloorTile(args);
        assert.equal(actual.length,expected.faces.length);
        for(let i=0;i<actual.length;i++){
            assert.equal(actual[i].isOverlay,expected.faces[i].isOverlay);
            const points=expected.faces[i].vertices.map(v=>[v.x/128,v.z/128,v.y,v.hsl]);
            assert.deepEqual(actual[i].vertices,points,"shape "+shape+" rotation "+rotation+" face "+i);
        }
    }
});

test("pinned TSPS hidden overlay faces are absent, and floor lighting uses pinned color rules",()=>{
    const faces=buildTspsFloorTile({shape:2,rotation:1,heights:[0,0,0,0],
        lights:[84,84,84,84],underlayHsl:10000,overlayHsl:-2});
    assert.equal(faces.length,1);
    assert.equal(faces[0].isOverlay,false);
    assert.equal(adjustUnderlayLight(-1,84),INVALID_HSL_COLOR);
    assert.equal(adjustOverlayLight(-2,84),INVALID_HSL_COLOR);
});

function region(){
    const side=64;
    return {
        side,heights:new Int32Array(side*side),
        underlays:new Uint8Array(side*side).fill(1),overlays:new Uint8Array(side*side),
        overlayShapes:new Uint8Array(side*side),overlayRotations:new Uint8Array(side*side),
        floorMaterials:{underlays:new Map([[0,{textureId:-1,rgb:0x568a21}]]),
            overlays:new Map([[0,{textureId:-1,rgb:0x8b4432}]])},
        lightOcclusions:new Uint8Array(side*side),
    };
}

test("cache-backed ground mesh consumes pinned face coordinates and lit HSL",()=>{
    const source=region(),tileX=32,tileY=32,i=tileX*64+tileY;
    source.overlays[i]=1;source.overlayShapes[i]=2;source.overlayRotations[i]=1;
    const lit=prepareFloorLighting(source,source.floorMaterials);
    const corner=[[tileX,tileY],[tileX+1,tileY],[tileX+1,tileY+1],[tileX,tileY+1]];
    const light=corner.map(([x,y])=>lit.lights[x*lit.lightSide+y]);
    const tileFaces=buildTspsFloorTile({shape:3,rotation:1,heights:[0,0,0,0],
        lights:light,underlayHsl:lit.underlays[i],overlayHsl:lit.overlays.get(0)});
    const expected=tileFaces.map(face=>face.vertices.map(([x,y,h,hsl])=>
        [tileX+x-31.5,-h/128,tileY+y-31.5,hsl,0,0])).flat(2);
    const mesh=buildTerrainMesh(source),actual=[];
    for(let j=0;j<mesh.length;j+=18){
        const cx=(mesh[j]+mesh[j+6]+mesh[j+12])/3;
        const cy=(mesh[j+2]+mesh[j+8]+mesh[j+14])/3;
        if(cx>tileX-31.5&&cx<tileX-30.5&&cy>tileY-31.5&&cy<tileY-30.5)
            for(let k=0;k<18;k++)actual.push(mesh[j+k]);
    }
    assert.deepEqual(actual,expected,"native world vertices must exactly match pinned TSPS tile faces");
});

test("native textured overlay HSL/UV triangles are emitted from TSPS tile faces",()=>{
    const source=region(),tileX=32,tileY=32,i=tileX*64+tileY;
    source.overlays[i]=1;source.overlayShapes[i]=2;source.overlayRotations[i]=3;
    source.floorMaterials.overlays.set(0,{textureId:8,rgb:0x993355});
    source.textures=new Map([[8,{pixels:new Uint8Array(4),width:1,height:1}]]);
    const lit=prepareFloorLighting(source,source.floorMaterials);
    const corners=[[tileX,tileY],[tileX+1,tileY],[tileX+1,tileY+1],[tileX,tileY+1]];
    const lights=corners.map(([x,y])=>lit.lights[x*lit.lightSide+y]);
    const tsps=buildTspsFloorTile({shape:3,rotation:3,heights:[0,0,0,0],
        lights,underlayHsl:lit.underlays[i],overlayHsl:-1,overlayTexture:8});
    const expected=tsps.filter(face=>face.isOverlay).flatMap(face=>
        face.vertices.flatMap(([x,y,h,hsl])=>[
            tileX+x-31.5,-h/128,tileY+y-31.5,hsl,tileX+x,tileY+y,
        ]));
    const scene=buildTerrainScene(source),texture=scene.texturedBatches.find(b=>b.texture===8);
    assert.ok(texture);
    assert.deepEqual([...texture.vertices],expected);
});

test("GPU packed-HSL palette uses the pinned TSPS source for every authored index",()=>{
    assert.deepEqual([...HSL_PALETTE.subarray(0,65535)],[...HSL_RGB_MAP]);
    assert.equal(HSL_PALETTE.length,65536);
});
