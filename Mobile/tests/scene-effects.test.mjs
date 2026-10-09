import assert from "node:assert/strict";
import {test} from "node:test";
import {NativeSceneAnimations,sceneSequenceFrame,sceneVisibilityCell,sceneEntryVisible} from "../browser/scene-animation.mjs";
import {NativeSpotEffects,decodeSpotEffect} from "../browser/spot-effects.mjs";
import {mergePlayerModels,buildPlayerMesh} from "../browser/player-models.mjs";
import {combineRegionMeshes,sortTransparentFaces,sortTransparentBatches,mergeOpaqueTextureBatches,partitionOpaqueScene,partitionColorScene,spatialBoundsOverlap,sceneCameraMatrix,worldRenderPixels,worldShaderSources,NativeTerrainViewport} from "../browser/world-webgl.mjs";
import {decodeObjectDefinition} from "../browser/object-definitions.mjs";

const model=()=>({verticesCount:3,faceCount:1,verticesX:Int32Array.of(0,128,0),verticesY:Int32Array.of(0,0,-128),
    verticesZ:Int32Array.of(0,0,128),indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
    faceColors:Uint16Array.of(2000),vertexSkins:Int32Array.of(0,0,0)});
const terrain=()=>({mapX:50,mapY:50,side:64,heights:new Int32Array(4096),renderFlags:new Uint8Array(4096)});
const seq={frameIds:[10,11,12],frameLengths:[2,3,4],frameStep:2,skeletalId:-1};

test("finite scene sequences end, loops rewind their tail, and long suspensions stay bounded",()=>{
    assert.equal(sceneSequenceFrame(seq,0),0);
    assert.equal(sceneSequenceFrame(seq,40),0);
    assert.equal(sceneSequenceFrame(seq,60),1);
    assert.equal(sceneSequenceFrame(seq,180),2);
    assert.equal(sceneSequenceFrame(seq,200),-1);
    assert.equal(sceneSequenceFrame(seq,200,{loop:true}),0);
    assert.equal(sceneSequenceFrame(seq,200,{location:true}),1);
    assert.equal(sceneSequenceFrame(seq,340,{location:true}),1);
    assert.equal(sceneSequenceFrame(seq,1e12,{location:true})>=0,true);
    assert.throws(()=>sceneSequenceFrame({...seq,skeletalId:3},0),/skeletal/);
});

test("composition preserves per-face priority and animated alpha reaches actor meshes",()=>{
    const m=model();m.priority=9;m.faceAlphas=Int8Array.of(-128);
    const merged=mergePlayerModels([m]);assert.equal(merged.faceRenderPriorities[0],9);
    const mesh=buildPlayerMesh(merged,terrain(),{x:3210.25,y:3210.5,plane:0,orientation:512});
    assert.equal(mesh.vertices.length,0);assert.equal(mesh.transparentBatches[0].alpha,128);
    assert.equal(mesh.transparentBatches[0].vertices.length,18);
    assert.deepEqual([...m.verticesX],[0,128,0]);
    const combined=combineRegionMeshes([{scene:mesh,dx:64,dy:-64}]);
    assert.equal(combined.transparentBatches[0].vertices[0],mesh.transparentBatches[0].vertices[0]+64);
});

test("transparent faces sort across texture groups, reverse with camera and filter roofs",()=>{
    const tri=z=>Float32Array.of(-1,0,z,2000,0,0,1,0,z,2000,0,0,0,1,z,2000,0,0);
    const near={level:0,texture:3,alpha:128,vertices:tri(-2)},far={level:0,texture:-1,alpha:64,vertices:tri(2)};
    const roof={...near,level:1};
    const matrix=yaw=>sceneCameraMatrix([0,0,0],yaw,.5,12,1);
    assert.deepEqual(sortTransparentFaces([near,roof,far],matrix(0),0).map(f=>f.batch),[far,near]);
    assert.deepEqual(sortTransparentFaces([near,far],matrix(Math.PI),0).map(f=>f.batch),[near,far]);
});

test("animated scenery poses once per frame, retains world offsets and picking, and reports unsupported sequences",async()=>{
    let poses=0,sequenceReads=0;
    const animations={sequence:async()=>{sequenceReads++;return seq;},poseFrame:async(m,_id,index)=>{poses++;return {...m,verticesY:Int32Array.from(m.verticesY,y=>y-index*128)};}};
    const runtime=new NativeSceneAnimations(animations),t=terrain(),d=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    runtime.reset([{terrain:t,loc:{id:5,x:10,y:10,plane:0,rotation:0,shape:10},definition:d,
        part:{type:10,rotation:0,dx:0,dy:0},model:model(),level:0}],1000);
    const origin={mapX:49,mapY:50},player={x:3210,y:3210};
    const a=await runtime.scene(1000,origin,player,new Map());
    assert.equal(a.batches.length,1);assert.equal(a.pickMeshes[0].x,74);
    await runtime.scene(1020,origin,player,new Map());assert.equal(poses,1);
    assert.equal(sequenceReads,1,"cached location sequence is reused across animation ticks");
    const b=await runtime.scene(1060,origin,player,new Map());assert.equal(poses,2);
    assert.equal(b.batches[0].vertices[1],a.batches[0].vertices[1]+1);
    animations.sequence=async()=>({...seq,skeletalId:1});
    assert.equal((await runtime.scene(1200,origin,player,new Map())).batches.length,0);
    assert.match(runtime.errors[0].reason,/skeletal/);
    runtime.reset();assert.equal(runtime.entries.length,0);assert.equal(runtime.errors.length,0);
});

test("revision-240 effect definitions retain scaling, rotation, recolours and strict opcode boundaries",()=>{
    const d=decodeSpotEffect(Uint8Array.of(1,0,7,2,0,3,4,1,0,5,0,64,6,0,90,40,1,0,1,0,2,0),8);
    assert.equal(d.modelId,7);assert.equal(d.widthScale,256);assert.equal(d.heightScale,64);
    assert.equal(d.orientation,90);assert.deepEqual(d.recolors,[[1,2]]);
    assert.throws(()=>decodeSpotEffect(Uint8Array.of(1,0,7,10,0),0),/opcode 10/);
    assert.throws(()=>decodeSpotEffect(Uint8Array.of(1,0,7,0,1),0),/Malformed/);
});

test("actor effects delay, end, restart on explicit update and preserve omitted slots",async()=>{
    let loads=0;
    const m=model(),models={model:async()=>m,textures:{textures:new Map(),load:async()=>{}},
        animations:{file:async()=>{loads++;return Uint8Array.of(1,0,7,2,0,3,0);},sequence:async()=>seq,poseFrame:async()=>m}};
    const effects=new NativeSpotEffects(models),actor={x:3210,y:3210,plane:0,orientation:0};
    const update=[{slot:0,id:8,height:128,delay:2,loop:false}];
    effects.update("p",update,1000);
    assert.equal((await effects.meshes("p",actor,terrain(),1020)).length,0);assert.equal(loads,0);
    const mesh=(await effects.meshes("p",actor,terrain(),1040))[0];
    assert.equal(mesh.vertices[1],1,"effect height is above ground");
    effects.update("p",update,1100);assert.equal(effects.actors.get("p").slots.get(0).started,1040);
    assert.equal((await effects.meshes("p",actor,terrain(),1240)).length,0,"finite effect expires");
    effects.update("p",[...update],1300);assert.equal((await effects.meshes("p",actor,terrain(),1340)).length,1);
    effects.update("p",[{slot:1,id:8,height:0,delay:0,loop:true}],1340);
    assert.equal(effects.actors.get("p").slots.size,2);
    effects.update("p",[{slot:0,id:-1}],1340);assert.equal(effects.actors.get("p").slots.size,1);
    assert.equal((await effects.meshes("p",actor,terrain(),1e6)).length,1);
    assert.equal(loads,1,"effect definitions share verified cache promises");
    effects.reset();assert.equal((await effects.meshes("p",actor,terrain(),1e6)).length,0);
});

test("effect cache responses after slot replacement or disconnect cannot return obsolete meshes",async()=>{
    let resolve;
    const models={model:()=>new Promise(r=>{resolve=r;}),animations:{file:async()=>Uint8Array.of(1,0,7,0)},textures:{textures:new Map()}};
    const effects=new NativeSpotEffects(models);
    effects.update("p",[{slot:0,id:8,height:0,delay:0}],0);
    const pending=effects.meshes("p",{x:3210,y:3210,plane:0},terrain(),0);
    await new Promise(r=>setImmediate(r));effects.reset();resolve(model());
    assert.deepEqual(await pending,[]);
});

test("mobile GPU framebuffer is capped and desktop quality remains unchanged",()=>{
    assert.deepEqual(worldRenderPixels(600,400,2,false),{width:1200,height:800});
    assert.deepEqual(worldRenderPixels(600,400,1,true),{width:600,height:400});
    const mobile=worldRenderPixels(932,430,3,true);
    assert.ok(mobile.width*mobile.height<=850000);
    assert.ok(mobile.width<932*2&&mobile.height<430*2,
        "phone no longer renders twice the screen resolution per axis");
    const huge=worldRenderPixels(3000,1500,3,true);
    assert.ok(huge.width*huge.height<850000,
        "large or zoomed iPhone viewport must not explode GPU fill rate");
});
test("mobile alpha render batches hundreds of transparent faces in one draw per material batch",()=>{
    const triangles=150,vertices=new Float32Array(triangles*18);
    for(let i=0;i<triangles;i++){
        for(let j=0;j<3;j++){
            const v=i*18+j*6;vertices[v]=i*.01;vertices[v+1]=j;vertices[v+2]=i*.01;
        }
    }
    const batch={vertices,count:triangles*3,alpha:128,texture:-1,level:0};
    const matrix=sceneCameraMatrix([0,0,0],.8,.6,14,1.5);
    assert.equal(sortTransparentFaces([batch],matrix,0).length,triangles);
    const coarse=sortTransparentBatches([batch],matrix,0);
    assert.equal(coarse.length,1);
    assert.equal(coarse[0].first,0);assert.equal(coarse[0].count,triangles*3);
    assert.equal(sortTransparentBatches([batch],matrix,-1).length,0,"invisible plane excluded");
    const calls=[],gl={BLEND:10,SRC_ALPHA:1,ONE_MINUS_SRC_ALPHA:2,
        enable(){},disable(){},blendFunc(){},depthMask(){}};
    const fake={gl,touch:true,sceneryAlphaBatches:[batch],
        renderMaterialBatch:(b,first,count,_m,_bounds,opacity)=>calls.push({b,first,count,opacity})};
    NativeTerrainViewport.prototype.renderTransparent.call(fake,matrix,0,[0,0,64,64]);
    assert.equal(calls.length,1,"iPhone submits one alpha draw for one mesh instead of 150 draws");
    assert.equal(calls[0].count,450);
    assert.ok(Math.abs(calls[0].opacity-(1-128/255))<.00001);
    fake.touch=false;calls.length=0;
    NativeTerrainViewport.prototype.renderTransparent.call(fake,matrix,0,[0,0,64,64]);
    assert.equal(calls.length,triangles,"desktop maintains exact per-face alpha sorting");
    assert.ok(calls.every(c=>c.count===3));
});

test("WebGL uniform locations are cached by program and name",()=>{
    let lookups=0;
    const gl={getUniformLocation(program,name){lookups++;return {program,name};}};
    const view={gl},main={},textured={};
    const uniform=NativeTerrainViewport.prototype.uniform;
    const first=uniform.call(view,main,"u_mvp");
    assert.strictEqual(uniform.call(view,main,"u_mvp"),first);
    assert.notStrictEqual(uniform.call(view,textured,"u_mvp"),first);
    assert.strictEqual(uniform.call(view,main,"u_color"),uniform.call(view,main,"u_color"));
    assert.equal(lookups,3,"thousands of draw calls do not repeatedly call getUniformLocation");
});

test("GL draw call counter increments once per submitted call",()=>{
    const seen=[],view={drawCallCount:0,gl:{drawArrays:(...args)=>seen.push(args)}};
    NativeTerrainViewport.prototype.drawArrays.call(view,4,0,450);
    NativeTerrainViewport.prototype.drawArrays.call(view,4,450,3);
    assert.equal(view.drawCallCount,2);
    assert.deepEqual(seen,[[4,0,450],[4,450,3]]);
});

test("opaque mobile terrain merges duplicate level/texture geometry without changing vertex data",()=>{
    const a=Float32Array.from({length:18},(_,i)=>i+1);
    const b=Float32Array.from({length:36},(_,i)=>i+100);
    const c=Float32Array.from({length:18},(_,i)=>i+200);
    const batches=[
        {level:0,texture:42,vertices:a},{level:1,texture:42,vertices:c},
        {level:0,texture:42,vertices:b},{level:0,texture:15,vertices:c}
    ];
    const grouped=mergeOpaqueTextureBatches(batches);
    assert.equal(grouped.length,3,"repeated region materials upload as a single static GPU batch");
    assert.deepEqual(grouped.map(v=>[v.level,v.texture,v.vertices.length]),
        [[0,42,54],[1,42,18],[0,15,18]]);
    assert.deepEqual([...grouped[0].vertices],[...a,...b]);
    assert.deepEqual([...grouped[1].vertices],[...c]);
    assert.deepEqual([...a],Array.from({length:18},(_,i)=>i+1),
        "original geometry is not modified");
    assert.throws(()=>mergeOpaqueTextureBatches([{level:0,texture:42,vertices:new Float32Array(2)}]),
        /Invalid opaque/);
});

test("mobile scenery upload groups same-zone textures and preserves alpha and desktop batching",()=>{
    const tri=Float32Array.from({length:18},(_,i)=>i);
    const scene={vertices:tri,levelCounts:[3,0,0,0],texturedBatches:[
        {level:0,texture:7,vertices:tri},{level:0,texture:7,vertices:tri},
        {level:0,texture:2,vertices:tri}
    ],transparentBatches:[{level:0,texture:-1,alpha:100,vertices:tri}],
    pickMeshes:[],textures:new Map()};
    const exercise=touch=>{
        const received=new Map(),view={
            touch,sceneryBuf:{},gl:{ARRAY_BUFFER:9,STATIC_DRAW:10,
                bindBuffer(){},bufferData(){},deleteTexture(){}},
            setDynamicScenery(){},replaceBatches:(name,batches)=>received.set(name,batches),
            textures:new Map(),textureMeta:new Map(),addTextures(){},
        };
        NativeTerrainViewport.prototype.setScenery.call(view,scene);
        return received;
    };
    const mobile=exercise(true),desktop=exercise(false);
    assert.equal(mobile.get("sceneryColorBatches").length,1,
        "mobile scene upload has a separate cullable opaque colour chunk");
    assert.equal(desktop.get("sceneryColorBatches").length,0,
        "desktop retains original complete static-colour VBO");
    assert.equal(mobile.get("sceneryBatches").length,2);
    assert.equal(mobile.get("sceneryBatches")[0].vertices.length,tri.length*2);
    assert.equal(desktop.get("sceneryBatches").length,3);
    assert.strictEqual(mobile.get("sceneryAlphaBatches")[0],scene.transparentBatches[0],
        "transparent alpha sorting must remain independent from opaque batching");
});

test("unchanged animated scenery bypasses redundant GPU uploads",()=>{
    const vertices=new Float32Array(18),mesh={level:0,texture:5,vertices};
    const pick={vertices};
    const scene={batches:[mesh],transparentBatches:[],pickMeshes:[pick]};
    let uploadCount=0,pickUpdates=0;
    const fake={dynamicBatches:[],dynamicAlphaBatches:[],
        replaceBatches(name,batches){uploadCount++;this[name]=batches.map(b=>({...b}));},
        get dynamicPickMeshes(){return this._picks;},
        set dynamicPickMeshes(value){pickUpdates++;this._picks=value;}
    };
    const update=NativeTerrainViewport.prototype.setDynamicScenery;
    update.call(fake,scene);
    assert.equal(uploadCount,2);assert.equal(pickUpdates,1);
    update.call(fake,{batches:[mesh],transparentBatches:[],pickMeshes:[pick]});
    assert.equal(uploadCount,2,"same posed buffers skip uploads despite new wrapper arrays");
    assert.equal(pickUpdates,1,"identical scene does not repeatedly rebuild picking meshes");
    update.call(fake,{batches:[{...mesh,vertices:new Float32Array(vertices)}],
        transparentBatches:[],pickMeshes:[{vertices:new Float32Array(vertices)}]});
    assert.equal(uploadCount,4,"changed animation poses still update the GPU");
    update.call(fake,null);
    assert.equal(fake.dynamicBatches.length,0,"scene unload removes stale dynamic geometry");
});

test("animated placements update only changed VBOs and retain identities across reorder and origin shifts",async()=>{
    const calls=[],gl={ARRAY_BUFFER:1,STATIC_DRAW:2,DYNAMIC_DRAW:3,
        createBuffer(){const b={};calls.push(["create",b]);return b;},
        bindBuffer(_target,b){calls.push(["bind",b]);},
        bufferData(_target,v,usage){calls.push(["data",v.length,usage]);},
        bufferSubData(_target,_offset,v){calls.push(["subdata",v.length]);},
        deleteBuffer(b){calls.push(["delete",b]);}};
    const view={gl,dynamicBatches:[],dynamicAlphaBatches:[],
        replaceBatches:NativeTerrainViewport.prototype.replaceBatches,
        releaseGeometry:b=>calls.push(["release",b])};
    const upload=scene=>NativeTerrainViewport.prototype.setDynamicScenery.call(view,scene);
    const t=terrain(),definition=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    const alpha=model();alpha.faceAlphas=Int8Array.of(-128);
    const entry=(x,m,seqId)=>({terrain:t,loc:{id:5,x,y:10,plane:0,rotation:0,shape:10},
        definition:{...definition,seqId},part:{type:10,rotation:0,dx:0,dy:0},model:m,level:0});
    const runtime=new NativeSceneAnimations({sequence:async id=>id===3?{...seq,frameLengths:[100,100,100]}:seq,
        poseFrame:async(m,_id,frame)=>({...m,verticesY:Int32Array.from(m.verticesY,y=>y-frame*128)})});
    runtime.reset([entry(10,model(),2),entry(11,model(),3),entry(12,alpha,2)],1000);
    const origin={mapX:50,mapY:50},player={x:3210,y:3210},textures=new Map();
    const first=await runtime.scene(1000,origin,player,textures);upload(first);
    const buffers=[...view.dynamicBatches,...view.dynamicAlphaBatches].map(b=>b.buffer);
    assert.equal(calls.filter(c=>c[0]==="create").length,3);
    assert.ok(calls.filter(c=>c[0]==="data").every(c=>c[2]===gl.DYNAMIC_DRAW));
    calls.length=0;
    const next=await runtime.scene(1060,origin,player,textures);upload(next);
    assert.deepEqual([...view.dynamicBatches,...view.dynamicAlphaBatches].map(b=>b.buffer),buffers);
    assert.equal(calls.filter(c=>c[0]==="subdata").length,2,"only fast opaque and alpha poses upload");
    assert.equal(calls.filter(c=>["create","delete","release","data"].includes(c[0])).length,0);
    assert.strictEqual(first.batches[1],next.batches[1],"slow pose retains its batch snapshot");
    assert.strictEqual(first.pickMeshes[1],next.pickMeshes[1],"unchanged picking snapshot is retained");
    assert.notStrictEqual(first.pickMeshes[0].vertices,next.pickMeshes[0].vertices);
    assert.equal(next.pickMeshes[0].vertices[1],first.pickMeshes[0].vertices[1]+1);
    calls.length=0;
    upload({...next,batches:[...next.batches].reverse(),pickMeshes:[...next.pickMeshes].reverse()});
    assert.equal(calls.length,0,"reordering visible placements preserves VBOs without uploading");
    assert.strictEqual(view.dynamicBatches[0].buffer,buffers[1]);
    const shifted=await runtime.scene(1060,{mapX:49,mapY:50},player,textures);upload(shifted);
    assert.equal(calls.filter(c=>c[0]==="subdata").length,3,"origin shift updates coordinates in existing buffers");
    assert.strictEqual(view.dynamicBatches[0].buffer,buffers[0]);
    assert.equal(shifted.pickMeshes[0].x,next.pickMeshes[0].x+64);
    calls.length=0;
    upload({...shifted,batches:shifted.batches.slice(1),pickMeshes:shifted.pickMeshes.slice(1)});
    assert.deepEqual(calls,[["release",buffers[0]],["delete",buffers[0]]],"only removed placement is released");
    calls.length=0;upload(null);
    assert.equal(calls.filter(c=>c[0]==="delete").length,2,"unload releases remaining opaque and alpha buffers");
    runtime.reset([entry(11,model(),3)],1100);
    const reset=await runtime.scene(1100,origin,player,textures);
    assert.notStrictEqual(reset.batches[0].key,first.batches[1].key,"new scene cannot inherit obsolete identities");
});

test("dynamic scenery grows buffer capacity without releasing its retained geometry",()=>{
    const calls=[],buffer={},key={},gl={ARRAY_BUFFER:1,DYNAMIC_DRAW:2,
        createBuffer(){calls.push("create");return buffer;},bindBuffer(){},
        bufferData(){calls.push("data");},bufferSubData(){calls.push("subdata");},
        deleteBuffer(){calls.push("delete");}};
    const view={gl,releaseGeometry:()=>calls.push("release")};
    for(const size of [18,36,18])NativeTerrainViewport.prototype.replaceBatches.call(view,"dynamicBatches",
        [{key,level:0,texture:-1,vertices:new Float32Array(size)}]);
    assert.deepEqual(calls,["create","data","data","subdata"]);
    assert.strictEqual(view.dynamicBatches[0].buffer,buffer);
    assert.equal(view.dynamicBatches[0].capacity,36*4);
});

test("dynamic actor VBOs are reused with subData when size allows, reallocated only on growth",()=>{
    const calls=[],gl={
        ARRAY_BUFFER:1,STATIC_DRAW:2,DYNAMIC_DRAW:3,
        createBuffer(){const b={id:calls.filter(c=>c[0]==="create").length+1};calls.push(["create",b.id]);return b;},
        bindBuffer(_kind,b){calls.push(["bind",b.id]);},
        bufferData(_kind,v,usage){calls.push(["data",v.length,usage]);},
        bufferSubData(_kind,offset,v){calls.push(["subdata",offset,v.length]);},
        deleteBuffer(b){calls.push(["delete",b.id]);}
    };
    const view={gl,actorBatches:[],actorAlphaBatches:[]};
    const update=NativeTerrainViewport.prototype.replaceBatches;
    const one=vertices=>({level:0,texture:5,vertices});
    const a=new Float32Array(18),b=new Float32Array(18).fill(1),
        larger=new Float32Array(36).fill(3);
    update.call(view,"actorBatches",[one(a)]);
    assert.equal(calls.filter(c=>c[0]==="create").length,1);
    update.call(view,"actorBatches",[one(b)]);
    assert.equal(calls.filter(c=>c[0]==="create").length,1);
    assert.equal(calls.filter(c=>c[0]==="subdata").length,1);
    assert.strictEqual(view.actorBatches[0].buffer.id,1);
    update.call(view,"actorBatches",[one(larger)]);
    assert.equal(calls.filter(c=>c[0]==="data").length,2,"grow re-uploads into existing VBO");
    update.call(view,"actorBatches",[one(a)]);
    assert.equal(calls.filter(c=>c[0]==="subdata").length,2);
    assert.equal(calls.filter(c=>c[0]==="delete").length,0);
    update.call(view,"actorBatches",[]);
    assert.deepEqual(calls.filter(c=>c[0]==="delete"),[["delete",1]],"unload releases buffer");

    const dynamic=new Float32Array(18).fill(7);
    update.call(view,"dynamicBatches",[one(dynamic)]);
    const before=calls.length;
    update.call(view,"dynamicBatches",[one(dynamic)]);
    assert.equal(calls.length,before,"identical dynamic meshes never upload again");
    update.call(view,"dynamicBatches",[]);
    assert.equal(calls.filter(c=>c[0]==="delete").length,2);
});

test("color actor VBO keeps allocation between updates and does not upload on clear",()=>{
    const calls=[],gl={
        ARRAY_BUFFER:1,DYNAMIC_DRAW:2,
        bindBuffer(){},bufferData(_t,data){calls.push(["data",data.length]);},
        bufferSubData(_t,_offset,data){calls.push(["subdata",data.length]);}
    };
    const fake={gl,actorBuf:{},actorBatches:[],actorAlphaBatches:[],
        replaceBatches(){},addTextures(){}};
    const set=NativeTerrainViewport.prototype.setActors;
    set.call(fake,{vertices:new Float32Array(18)});
    set.call(fake,{vertices:new Float32Array(18).fill(1)});
    set.call(fake,null);
    assert.deepEqual(calls,[["data",18],["subdata",18]]);
    assert.equal(fake.actorCount,0);
});

test("unchanged animated scenery returns exact cached scene until frame, tile, or textures change",async()=>{
    let poses=0;
    const animations={sequence:async()=>seq,poseFrame:async(m)=>{poses++;return m;}};
    const runtime=new NativeSceneAnimations(animations),t=terrain(),
        definition=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    runtime.reset([{terrain:t,loc:{id:5,x:10,y:10,plane:0,rotation:0,shape:10},
        definition,part:{type:10,rotation:0,dx:0,dy:0},model:model(),level:0}],1000);
    const origin={mapX:50,mapY:50},player={x:3210,y:3210,plane:0},textures=new Map();
    const first=await runtime.scene(1000,origin,player,textures);
    const same=await runtime.scene(1020,origin,player,textures);
    assert.strictEqual(same,first,"the full unchanged scene uses identical batch and pick references");
    assert.equal(poses,1);
    const moved=await runtime.scene(1020,origin,{...player,x:3211},textures);
    assert.notStrictEqual(moved,first,"crossing a tile invalidates scenery visibility");
    const newFrame=await runtime.scene(1060,origin,player,textures);
    assert.notStrictEqual(newFrame,moved,"advanced classic animation frame rebuilds scenery");
    assert.equal(poses,2);
    const newTextures=await runtime.scene(1060,origin,player,new Map());
    assert.notStrictEqual(newTextures,newFrame,"different texture material set invalidates scene");
    runtime.reset();
    const cleared=await runtime.scene(1100,origin,player,textures);
    assert.notStrictEqual(cleared,newTextures,"map unload invalidates cached scene");
    assert.deepEqual(cleared.batches,[]);
});

test("distant uninitialised animations do not disable scenery caching",async()=>{
    const t=terrain(),definition=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    const animations={sequence:async()=>seq,poseFrame:async m=>m};
    const create=(x,region=t)=>({terrain:region,loc:{id:5,x,y:10,plane:0,rotation:0,shape:10},
        definition,part:{type:10,rotation:0,dx:0,dy:0},model:model(),level:0});
    const runtime=new NativeSceneAnimations(animations);
    runtime.reset([create(10),create(10,{...t,mapX:52})],1000);
    const origin={mapX:50,mapY:50},player={x:3210,y:3210,plane:0},textures=new Map();
    const first=await runtime.scene(1000,origin,player,textures);
    const cached=await runtime.scene(1020,origin,player,textures);
    assert.strictEqual(cached,first,"offscreen animations should not defeat active scene caching");
    assert.equal(runtime.entries[1].sequence,undefined,"far scenery need not fetch animation frames");
    const crossed=await runtime.scene(1020,origin,{...player,x:3340},textures);
    assert.notStrictEqual(crossed,cached,"moving to the distant object loads a new visible scene");
    assert.ok(crossed.batches.length>0);
});

test("animated material replacement rebuilds geometry without posing the same frame again",async()=>{
    const m=model();m.faceTextures=Int16Array.of(3);m.textureUvs=Float32Array.of(0,0,1,0,0,1);
    let poses=0;
    const animations={sequence:async()=>seq,poseFrame:async()=>{poses++;return m;}};
    const runtime=new NativeSceneAnimations(animations),t=terrain(),
        definition=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    runtime.reset([{terrain:t,loc:{id:5,x:10,y:10,plane:0,rotation:0,shape:10},
        definition,part:{type:10,rotation:0,dx:0,dy:0},model:m,level:0}],1000);
    const origin={mapX:50,mapY:50},player={x:3210,y:3210};
    const missing=await runtime.scene(1000,origin,player,new Map());
    assert.equal(missing.batches.length,0);
    const loaded=await runtime.scene(1020,origin,player,new Map([[3,{}]]));
    assert.equal(loaded.batches[0].texture,3);assert.equal(poses,1);
    const key=loaded.batches[0].key;
    animations.sequence=async()=>seq;
    const replaced=await runtime.scene(1020,origin,player,new Map([[3,{}]]));
    assert.equal(poses,2,"a replaced sequence resolver invalidates even the same frame index");
    assert.strictEqual(replaced.batches[0].key,key,"material identity survives rebuilding its pose");
});

test("mobile WebGL reuses shader frame state and UV offsets across hundreds of material draws",()=>{
    const log=[],counts=new Map(),record=name=>(...args)=>{
        counts.set(name,(counts.get(name)??0)+1);log.push([name,...args]);
    };
    const gl={
        ARRAY_BUFFER:1,TRIANGLES:4,FLOAT:5,TEXTURE0:6,TEXTURE_2D:7,
        createVertexArray:()=>{record("createVertexArray")();return {};},
        bindVertexArray:record("bindVertexArray"),
        deleteVertexArray:record("deleteVertexArray"),
        useProgram:record("useProgram"),uniformMatrix4fv:record("uniformMatrix4fv"),
        uniform4fv:record("uniform4fv"),uniform1i:record("uniform1i"),
        uniform1f:record("uniform1f"),uniform2f:record("uniform2f"),
        getAttribLocation:(_p,name)=>{record("getAttribLocation")(name);return name==="a_position"?0:1;},
        activeTexture:record("activeTexture"),bindTexture:record("bindTexture"),
        bindBuffer:record("bindBuffer"),enableVertexAttribArray:record("enableVertexAttribArray"),
        vertexAttribPointer:record("vertexAttribPointer"),
        drawArrays:record("drawArrays")
    };
    const view=Object.create(NativeTerrainViewport.prototype);
    const main={},textured={},texture={},buffer={};
    view.gl=gl;view.program=main;view.textureProgram=textured;
    view.palette={};view.textures=new Map([[4,texture]]);
    view.textureMeta=new Map();view.textureClock=0;view.frameTime=1000;
    view.framePreparedPrograms=new Set();view.frameOpacity=new Map();
    view.frameTextureOffsets=new Map();view.drawCallCount=0;
    view.uploadFog=()=>{record("uploadFog")();};
    view.uniform=(_p,name)=>name;
    const bounds=[0,0,64,64],matrix=new Float32Array(16),batch={
        buffer,texture:4,count:3,level:0
    };
    for(let i=0;i<150;i++)view.renderMaterialBatch(batch,0,3,matrix,bounds,1);
    assert.equal(counts.get("drawArrays"),150);
    assert.equal(counts.get("activeTexture"),1,"same texture unit activated once per frame");
    assert.equal(counts.get("bindTexture"),1,"same material texture bound once for 150 draws");
    assert.equal(counts.get("useProgram"),1,
        "same shader avoids 149 redundant WebGL program switches");
    assert.equal(counts.get("uniformMatrix4fv"),1,
        "scene matrix is uploaded once for 150 texture draws");
    assert.equal(counts.get("uploadFog"),1);
    assert.equal(counts.get("getAttribLocation"),2);
    assert.equal(counts.get("createVertexArray"),1);
    assert.equal(counts.get("vertexAttribPointer"),2,
        "VAOs eliminate repeated attribute pointer calls across 150 draws");
    assert.equal(view.frameTextureOffsets.size,1,
        "all batches sharing a texture use one scroll-offset calculation");
    view.renderMaterialBatch(batch,0,3,matrix,bounds,.5);
    view.renderMaterialBatch(batch,0,3,matrix,bounds,.5);
    assert.equal(counts.get("uniform1f"),2,
        "opacity updates only when value actually changes");
    const paletteBatch={...batch,texture:-1};
    view.renderMaterialBatch(paletteBatch,0,3,matrix,bounds,1);
    assert.equal(counts.get("useProgram"),2,"switch only when changing shader");
    assert.equal(counts.get("uploadFog"),2);
    assert.equal(counts.get("uniformMatrix4fv"),2);
    assert.equal(counts.get("createVertexArray"),2,"palette shader uses its own VAO");
    view.renderMaterialBatch(batch,0,3,matrix,bounds,1);
    assert.equal(counts.get("useProgram"),3,
        "switch back to textured shader on subsequent batches");
});

test("the native renderer uses WebGL 2 GLSL ES 3.00 for both palette and textured shaders",()=>{
    for(const textured of [false,true]){
        const {vertex,fragment}=worldShaderSources(textured);
        for(const source of [vertex,fragment]){
            assert.ok(source.startsWith("#version 300 es\n"));
            assert.doesNotMatch(source,/\bvarying\b|\battribute\b|\bgl_FragColor\b|\btexture2D\s*\(/,
                "WebGL 1 shader syntax must not ship in the WebGL 2 renderer");
        }
        assert.match(vertex,/\bin vec3 a_position;/);
        assert.match(vertex,/\bout highp vec2 v_uv;/);
        assert.match(fragment,/\bin highp vec2 v_uv;/);
        assert.match(fragment,/\bout vec4 fragColor;/);
        assert.match(fragment,/\bfragColor=vec4\(mix\(/);
        if(textured){
            assert.match(fragment,/texture\(u_texture,v_uv\+u_textureShift\)/);
            assert.match(fragment,/if\(texel\.a<0\.1\)discard/);
        }else assert.match(fragment,/texture\(u_palette,\(cell\+0\.5\)\/256\.0\)/);
    }
});

test("the renderer requests only WebGL 2, with no WebGL 1 fallback",()=>{
    const before=globalThis.window,calls=[];
    try{
        globalThis.window={matchMedia:()=>({matches:true})};
        const canvas={getContext:(type,options)=>{calls.push([type,options]);return null;}};
        assert.throws(()=>new NativeTerrainViewport(canvas),/WebGL 2 is required/);
        assert.deepEqual(calls,[["webgl2",{antialias:false,alpha:false}]]);
    }finally{
        if(before===undefined)delete globalThis.window;
        else globalThis.window=before;
    }
});

test("scene frame selection reuses immutable animation timing and preserves loop boundaries",()=>{
    const lengths=[2,3,4],ids=[10,11,12],sequence={
        frameLengths:lengths,frameIds:ids,frameStep:2,skeletalId:-1
    };
    let reads=0;
    const instrumented=new Proxy(lengths,{get(target,key,receiver){
        if(key==="map"){reads++;return target.map.bind(target);}
        return Reflect.get(target,key,receiver);
    }});
    sequence.frameLengths=instrumented;
    for(let i=0;i<500;i++){
        assert.equal(sceneSequenceFrame(sequence,0),0);
        assert.equal(sceneSequenceFrame(sequence,60),1);
        assert.equal(sceneSequenceFrame(sequence,200,{location:true}),1);
    }
    assert.equal(reads,1,"unchanged cache sequence never reallocates frame-length arrays");
    assert.equal(sceneSequenceFrame(sequence,1e12,{location:true})>=0,true);
    assert.equal(sceneSequenceFrame({...sequence,frameLengths:[1,1,1]},20),0,
        "different sequence object has independent timeline");
});

test("fractional player movement does not rebuild unchanged animated scene or lose edge objects",async()=>{
    let poses=0;
    const animations={sequence:async()=>seq,poseFrame:async m=>{poses++;return m;}};
    const runtime=new NativeSceneAnimations(animations),t=terrain(),
        definition=decodeObjectDefinition(Uint8Array.of(24,0,2,0),5);
    const make=(x,y)=>({terrain:t,loc:{id:5,x,y,plane:0,rotation:0,shape:10},
        definition,part:{type:10,rotation:0,dx:0,dy:0},model:model(),level:0});
    runtime.reset([make(10,10),make(60,10)],1000);
    const origin={mapX:50,mapY:50},textures=new Map();
    const starting={x:3210.05,y:3210.2,plane:0};
    const initial=await runtime.scene(1000,origin,starting,textures);
    assert.equal(initial.batches.length,2,"the conservative tile window includes an edge object");
    assert.strictEqual(await runtime.scene(1020,origin,{...starting,x:3210.97,y:3210.99},textures),initial,
        "subtile interpolation cannot rebuild the unchanged scene");
    assert.equal(poses,2,"subtile movement does not recompute animation poses");
    assert.notStrictEqual(await runtime.scene(1020,origin,{...starting,x:3211.01},textures),initial,
        "crossing a tile invalidates the visibility set");
    assert.ok(sceneEntryVisible(runtime.entries[1],sceneVisibilityCell(starting)),
        "edge scene visibility is conservative");
    assert.notStrictEqual(await runtime.scene(1060,origin,starting,textures),initial,
        "the scene still advances on a new animation frame");
});

test("opaque world geometry is partitioned by material and zone without dropping edge triangles",()=>{
    const tri=(points,color)=>Float32Array.from(points.flatMap(([x,z])=>[x,0,z,color,.25,.75]));
    const left=tri([[2,2],[3,2],[2,3]],2000);
    const far=tri([[80,80],[81,80],[80,81]],2001);
    const edge=tri([[31,3],[33,3],[33,4]],2002);
    const input=new Float32Array([...left,...far,...edge]);
    const materials=[{level:0,texture:7,vertices:input},
        {level:1,texture:7,vertices:tri([[3,3],[4,3],[3,4]],4000)}];
    const zones=partitionOpaqueScene(materials,32);
    assert.equal(zones.length,4,"two local cells, a remote cell and a separate roof level");
    assert.equal(zones.reduce((n,b)=>n+b.vertices.length,0),input.length+18);
    assert.ok(zones.every(b=>b.vertices.length%18===0));
    assert.deepEqual([...input],[...left,...far,...edge],"original mesh remains immutable");
    const visible=[0,0,31.5,8];
    const culled=zones.filter(b=>b.level===0&&spatialBoundsOverlap(b.bounds,visible));
    assert.equal(culled.length,2,"edge triangle survives even if its centroid belongs to next zone");
    assert.ok(culled.some(b=>b.vertices.includes(33)),
        "triangle straddling the viewport edge must be kept for shader clipping");
    assert.ok(!culled.some(b=>b.vertices.includes(80)),"offscreen distant zone is skipped");
    assert.deepEqual(partitionColorScene(input,[9,0,0,0]).reduce((n,b)=>n+b.vertices.length,0),
        input.length);
    assert.throws(()=>partitionOpaqueScene(materials,0),/zone size/);
    assert.throws(()=>partitionOpaqueScene([{level:0,texture:5,vertices:new Float32Array(10)}]),
        /Invalid opaque/);
});

test("WebGL 2 VAOs retain per-program layouts and are released when their buffers disappear",()=>{
    const log=[],record=name=>(...args)=>log.push([name,...args]);
    const gl={
        ARRAY_BUFFER:1,FLOAT:2,STATIC_DRAW:3,
        createVertexArray:()=>({id:log.filter(x=>x[0]==="createVAO").length+1}),
        bindVertexArray:record("bindVAO"),deleteVertexArray:record("deleteVAO"),
        createBuffer:()=>({name:"buffer"}),bindBuffer:record("bindBuffer"),
        bufferData:record("bufferData"),bufferSubData:record("bufferSubData"),
        deleteBuffer:record("deleteBuffer"),
        enableVertexAttribArray:record("enableVertexAttribArray"),
        vertexAttribPointer:record("vertexAttribPointer")
    };
    const view=Object.create(NativeTerrainViewport.prototype);
    view.gl=gl;
    const palette={},textured={},buffer={};
    view.attribute=(_program,name)=>name==="a_position"?0:1;
    view.bindGeometry(buffer,palette);view.bindGeometry(buffer,palette);
    assert.equal(log.filter(x=>x[0]==="vertexAttribPointer").length,2);
    view.bindGeometry(buffer,textured);
    assert.equal(log.filter(x=>x[0]==="vertexAttribPointer").length,4,
        "separate shaders need separately configured VAOs");
    assert.equal(view.vertexArrays.size,1);
    view.releaseGeometry(buffer);
    assert.equal(log.filter(x=>x[0]==="deleteVAO").length,2);
    assert.equal(view.vertexArrays.size,0);
    // A batch replacement must also delete the VAOs associated with its VBO.
    view.actorBatches=[];view.replaceBatches("actorBatches",
        [{texture:3,level:0,vertices:new Float32Array(18)}]);
    const vb=view.actorBatches[0].buffer;
    view.bindGeometry(vb,palette);
    view.replaceBatches("actorBatches",[]);
    assert.equal(log.filter(x=>x[0]==="deleteVAO").length,3);
    assert.equal(log.filter(x=>x[0]==="deleteBuffer").length,1);
    assert.equal(view.vertexArrays.size,0,"unloaded geometry does not leak VAOs");
    // Attribute layout survives changing VBO contents without changing VAO.
    view.replaceBatches("actorBatches",[{texture:3,level:0,vertices:new Float32Array(18)}]);
    const reused=view.actorBatches[0].buffer;
    view.bindGeometry(reused,palette);
    const before=log.filter(x=>x[0]==="vertexAttribPointer").length;
    view.replaceBatches("actorBatches",[{texture:3,level:0,vertices:new Float32Array(18).fill(1)}]);
    view.bindGeometry(reused,palette);
    assert.equal(log.filter(x=>x[0]==="vertexAttribPointer").length,before,
        "bufferSubData updates retain the existing VAO layout");
    view.replaceBatches("actorBatches",[]);
});

test("touch render skips offscreen opaque chunks without skipping visible scene or roof masks",()=>{
    const oldWindow=globalThis.window,submitted=[];
    const gl={TRIANGLES:4,LINES:1,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
        viewport(){},clear(){},uniform1i(){},uniform2f(){},useProgram(){}};
    const batch=(label,bounds,level=0,texture=-1)=>({label,bounds,level,texture,
        buffer:{},count:3,vertices:new Float32Array(18)});
    const view=Object.create(NativeTerrainViewport.prototype);
    view.touch=true;view.gl=gl;view.canvas={clientWidth:300,clientHeight:200,width:300,height:200};
    view.count=3;view.sceneryCount=3;view.actorCount=0;
    view.program={};view.textureProgram={};view.palette={};view.drawMode=gl.TRIANGLES;
    view.target=[0,0,0];view.yaw=0;view.pitch=.6;view.distance=30;
    view.visibleRoofLevel=()=>0;view.drawBounds=()=>[0,0,32,32];
    view.terrainColorBatches=[batch("ground near",[2,2,10,10]),
        batch("ground far",[100,100,110,110]),batch("ground roof",[2,2,10,10],1)];
    view.sceneryColorBatches=[batch("wall near",[31,31,34,34]),
        batch("wall far",[-80,-80,-60,-60])];
    view.terrainBatches=[batch("floor textured",[2,2,10,10],0,5),
        batch("floor texture far",[90,90,100,100],0,5)];
    view.sceneryBatches=[];view.actorBatches=[];view.dynamicBatches=[];
    view.textures=new Map([[5,{}]]);
    view.uniform=()=>0;view.prepareRenderProgram=()=>{};view.bindRenderTexture=()=>{};
    view.bindGeometry=()=>{};view.frameTextureShift=()=>[0,0];
    view.renderTransparent=()=>{};view.renderMaterialBatch=b=>submitted.push(b.label);
    view.drawArrays=(_mode,_first,_count)=>submitted.push("texture draw");
    try{
        globalThis.window={devicePixelRatio:1};
        view.render();
        assert.deepEqual(submitted,["ground near","wall near","texture draw"]);
        assert.equal(view.terrainColorBatches.length,3,
            "culling does not mutate the persisted world or its picking sources");
    }finally{
        if(oldWindow===undefined)delete globalThis.window;
        else globalThis.window=oldWindow;
    }
});
