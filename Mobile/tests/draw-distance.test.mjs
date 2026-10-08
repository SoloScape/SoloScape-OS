import assert from "node:assert/strict";
import {test} from "node:test";
import {CLASSIC_DRAW_DISTANCE,sceneDrawBounds,withinDrawBounds,sceneCameraMatrix,pickTerrainTile,pickNpcTriangles} from "../browser/world-webgl.mjs";

test("classic draw window spans 50 tiles around the camera tile through orbit and pan",()=>{
    assert.equal(CLASSIC_DRAW_DISTANCE,25);
    for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
        const target=[12,3,-9],pitch=.65,distance=12;
        const bounds=sceneDrawBounds(target,yaw,pitch,distance);
        assert.equal(bounds[2]-bounds[0],50);assert.equal(bounds[3]-bounds[1],50);
        const x=target[0]+Math.sin(yaw)*Math.cos(pitch)*distance;
        const z=target[2]-Math.cos(yaw)*Math.cos(pitch)*distance;
        assert.ok(withinDrawBounds(x,z,bounds));
        assert.ok(withinDrawBounds(bounds[0],bounds[1],bounds));
        assert.equal(withinDrawBounds(bounds[2],z,bounds),false);
        assert.equal(withinDrawBounds(x,bounds[3],bounds),false);
        assert.equal(withinDrawBounds(bounds[0]-.01,z,bounds),false);
        const moved=sceneDrawBounds([20,3,-25],yaw,pitch,distance);
        assert.deepEqual(moved,bounds.map((n,i)=>n+(i%2?-16:8)));
    }
});

test("distant ground and NPCs cannot be picked outside the rendered window",()=>{
    const target=[0,0,0],yaw=0,pitch=1.3,distance=70;
    const matrix=sceneCameraMatrix(target,yaw,pitch,distance,1);
    const bounds=sceneDrawBounds(target,yaw,pitch,distance);
    const triangle=z=>new Float32Array([-2,.5,z-2,2000,0,0, 2,.5,z-2,2000,0,0, 0,.5,z+2,2000,0,0]);
    for(const [north,visible] of [[0,true],[12,false]]){
        const point=[0,.5,north,1];
        const clip=[0,1,2,3].map(row=>point.reduce((n,v,col)=>n+matrix[col*4+row]*v,0));
        const nx=clip[0]/clip[3],ny=clip[1]/clip[3],vertices=triangle(north);
        assert.ok(pickTerrainTile(vertices,matrix,nx,ny));
        assert.ok(pickNpcTriangles([{index:7,vertices}],matrix,nx,ny));
        assert.equal(Boolean(pickTerrainTile(vertices,matrix,nx,ny,bounds)),visible);
        assert.equal(Boolean(pickNpcTriangles([{index:7,vertices}],matrix,nx,ny,bounds)),visible);
    }
});
