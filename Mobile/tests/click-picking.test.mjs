import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeTerrainViewport,pickNpcTriangles,pickTerrainTile,sceneCameraMatrix,withinDrawBounds} from "../browser/world-webgl.mjs";

// Independent copy of the previous projection/interpolation algorithm.
function reference(vertices,matrix,nx,ny,bounds){
    let best=null,depth=Infinity;
    for(let i=0;i<vertices.length;i+=18){
        const points=[0,6,12].map(offset=>{
            const at=i+offset,x=vertices[at],y=vertices[at+1],z=vertices[at+2];
            const p=[0,1,2,3].map(r=>matrix[r]*x+matrix[r+4]*y+matrix[r+8]*z+matrix[r+12]);
            return p[3]>0?[p[0]/p[3],p[1]/p[3],p[2]/p[3],p[3]]:null;
        });
        const [a,b,c]=points;if(!a||!b||!c)continue;
        const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
        if(Math.abs(d)<1e-10)continue;
        const u=((b[1]-c[1])*(nx-c[0])+(c[0]-b[0])*(ny-c[1]))/d;
        const v=((c[1]-a[1])*(nx-c[0])+(a[0]-c[0])*(ny-c[1]))/d,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const z=u*a[2]+v*b[2]+w*c[2];if(z< -1||z>1||z>=depth)continue;
        const weights=[u/a[3],v/b[3],w/c[3]],sum=weights.reduce((n,t)=>n+t,0);
        const x=weights.reduce((n,t,k)=>n+t*vertices[i+k*6],0)/sum;
        const north=weights.reduce((n,t,k)=>n+t*vertices[i+k*6+2],0)/sum;
        if(!withinDrawBounds(x,north,bounds))continue;
        depth=z;best={depth,x:Math.floor(x+31.5),y:Math.floor(north+31.5)};
    }
    return best;
}

test("optimized picking matches previous perspective, clipping, depth and draw bounds",()=>{
    let seed=12345;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
    let hits=0,misses=0;
    for(let sample=0;sample<1000;sample++){
        const matrix=sceneCameraMatrix([0,0,0],random()*Math.PI*2,.2+random(),6+random()*18,1.4);
        const vertices=new Float32Array(18*30);
        for(let i=0;i<vertices.length;i+=6){
            vertices[i]=random()*70-35;vertices[i+1]=random()*10-5;vertices[i+2]=random()*70-35;
        }
        const nx=random()*2-1,ny=random()*2-1,bounds=sample%2?[-10,-10,10,10]:null;
        const expected=reference(vertices,matrix,nx,ny,bounds);
        const ground=pickTerrainTile(vertices,matrix,nx,ny,bounds);
        const actor=pickNpcTriangles([{index:7,vertices}],matrix,nx,ny,bounds);
        if(!expected){misses++;assert.equal(ground,null);assert.equal(actor,null);}
        else{
            hits++;assert.deepEqual(ground,{x:expected.x,y:expected.y});
            assert.equal(actor.index,7);assert.ok(Math.abs(actor.depth-expected.depth)<1e-12);
        }
    }
    assert.ok(hits>100&&misses>100,"exercise both hits and rejections");
});

test("uploaded mesh bounds retain boundary-crossing models and refresh animated poses",()=>{
    const viewport={replaceBatches(){}};
    const vertices=Float32Array.of(-2,-1,0,0,0,0, 2,-1,0,0,0,0, 0,2,0,0,0,0);
    const scene={pickMeshes:[{index:8,vertices}]};
    const matrix=Float32Array.of(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),bounds=[-1,-1,1,1];
    NativeTerrainViewport.prototype.setDynamicScenery.call(viewport,scene);
    assert.equal(pickNpcTriangles(viewport.dynamicPickMeshes,matrix,0,0,bounds).index,8);
    for(let i=0;i<vertices.length;i+=6)vertices[i]+=10;
    NativeTerrainViewport.prototype.setDynamicScenery.call(viewport,scene);
    assert.equal(pickNpcTriangles(viewport.dynamicPickMeshes,matrix,10,0,bounds),null);
    for(let i=0;i<vertices.length;i+=6)vertices[i]-=10;
    NativeTerrainViewport.prototype.setDynamicScenery.call(viewport,scene);
    assert.equal(pickNpcTriangles(viewport.dynamicPickMeshes,matrix,0,0,bounds).index,8);
});

test("object picking calculates roof visibility once for the entire click",()=>{
    const saved={window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>o[k]??(()=>({}))});
    const canvas={getContext:()=>gl,addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
    let viewport;
    try{
        globalThis.window={addEventListener(){},removeEventListener(){}};
        globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
        viewport=new NativeTerrainViewport(canvas);
        viewport.sceneryPickMeshes=Array.from({length:1000},()=>({plane:0,level:0,vertices:new Float32Array()}));
        let calls=0;viewport.visibleRoofLevel=()=>{calls++;return 0;};
        assert.equal(viewport.pickObjectAt(400,300),null);assert.equal(calls,1);
    }finally{
        viewport?.dispose();
        for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
    }
});
