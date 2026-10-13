import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {ByteBuffer} from "../browser/cache-reader.mjs";
import {decodeSkeleton,applySkeletalAnimation,NativePlayerAnimations,stepMovementSkeletal} from "../browser/player-animation.mjs";
import {SkeletalSeq} from "../browser/tsps-runtime/rs-model-skeletal-SkeletalSeq.mjs";
import {Curve} from "../browser/tsps-runtime/rs-model-skeletal-Curve.mjs";
import {mergePlayerModels} from "../browser/model-composition.mjs";

class Writer{
    data=[];
    byte(n){this.data.push(n&255);return this;}
    short(n){return this.byte(n>>>8).byte(n);}
    float(n){const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,n);for(let i=0;i<4;i++)this.byte(view.getUint8(i));return this;}
    bytes(){return Uint8Array.from(this.data);}
}
function skeletonBytes(parents=[-1,0],translations=[]){
    const w=new Writer().byte(1).byte(5).byte(1).byte(0).short(parents.length).byte(1);
    for(const [bone,parent] of parents.entries()){
        w.short(parent);
        for(let i=0;i<16;i++)w.float(i===12?(translations[bone]??0):i%5===0?1:0);
        w.float(0).float(0).float(0);
    }
    return w.bytes();
}
function curve(w,type,bone,channel,value){
    w.byte(type).byte(bone+64).byte(channel).short(2).byte(0).byte(0).byte(0).byte(0);
    for(const tick of [0,4])w.short(tick).float(value).float(0).float(0).float(0).float(0);
}
function sequenceBytes(){
    const w=new Writer().byte(1).short(7).short(0).short(4).byte(0).short(3);
    curve(w,1,0,4,10);curve(w,1,1,4,5);curve(w,4,0,1,0.1);
    return w.bytes();
}
function sequence(){
    const base=decodeSkeleton(skeletonBytes()),bytes=sequenceBytes(),r=new ByteBuffer(bytes);
    const version=r.readUnsignedByte();r.readUnsignedShort();
    return new SkeletalSeq(65538,version,base,base.skeletalBase,r);
}
function model(){return {verticesCount:2,faceCount:1,verticesX:Int32Array.of(10,10),verticesY:Int32Array.of(0,0),verticesZ:Int32Array.of(0,0),
    animMayaGroups:[Int32Array.of(1),Int32Array.of(0,1)],animMayaScales:[Int32Array.of(255),Int32Array.of(128,127)],
    faceSkins:Int32Array.of(0),faceAlphas:Int32Array.of(240),indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(0),faceColors:Uint16Array.of(100)};}

test("decoded skeletal hierarchy, weighted translation and alpha pose preserve bind model",()=>{
    const original=model(),seq=sequence(),pose=applySkeletalAnimation(original,seq,2);
    assert.deepEqual([...pose.verticesX],[25,22]);assert.equal(pose.faceAlphas[0],255);
    assert.deepEqual([...original.verticesX],[10,10]);assert.equal(original.faceAlphas[0],240);
    assert.deepEqual([...applySkeletalAnimation(original,seq,2).verticesX],[25,22]);
});
test("pinned skeletal quaternion order transforms signed model axes",()=>{
    const seq=sequence();seq.boneCurves[0]=[];seq.boneCurves[1]=[];
    seq.boneCurves[0][2]={getValue:()=>Math.PI/2};
    const pose=applySkeletalAnimation(model(),seq,0);
    assert.equal(pose.verticesX[0],0);assert.equal(pose.verticesY[0],-10);
});
test("hierarchical inverse bind matrices remove rest translation before posing",()=>{
    const base=decodeSkeleton(skeletonBytes([-1,0],[10,5])),bytes=sequenceBytes(),r=new ByteBuffer(bytes);
    r.readUnsignedByte();r.readUnsignedShort();
    const seq=new SkeletalSeq(65538,1,base,base.skeletalBase,r);
    // Curves are absolute local translations, not offsets from the rest pose.
    assert.deepEqual([...applySkeletalAnimation(model(),seq,2).verticesX],[10,10]);
    seq.boneCurves[0][3]={getValue:()=>20};
    assert.deepEqual([...applySkeletalAnimation(model(),seq,2).verticesX],[20,20]);
});
test("pinned Hermite and parametric Bezier curves interpolate interior frames",()=>{
    for(const bezier of [false,true]){
        const w=new Writer().short(2).byte(0).byte(0).byte(0).byte(bezier?1:0);
        for(const [tick,value] of [[0,0],[4,10]])w.short(tick).float(value).float(4).float(10).float(4).float(10);
        const curve=new Curve(0);curve.decode(new ByteBuffer(w.bytes()),1);curve.load();
        assert.equal(curve.getValue(0),0);assert.equal(curve.getValue(2),5);assert.equal(curve.getValue(4),10);
    }
});
test("composition preserves weights and avoids welding differently skinned vertices",()=>{
    const first=model(),second=model();second.animMayaScales[1]=Int32Array.of(127,128);
    const merged=mergePlayerModels([first,second]);
    assert.equal(merged.verticesCount,3);
    assert.deepEqual([...merged.animMayaScales[2]],[127,128]);
    assert.notEqual(merged.animMayaGroups[0],first.animMayaGroups[0]);
    assert.deepEqual([...applySkeletalAnimation(merged,sequence(),2).verticesX],[25,22,23]);
});
test("skeletal loader selects animation archive/file and shared skeleton and poses actively",async()=>{
    const loader=new NativePlayerAnimations({}),requested=[];
    loader.file=async(index,group,file)=>{
        requested.push([index,group,file]);
        return index===0?sequenceBytes():skeletonBytes();
    };
    loader.sequence=async()=>({skeletalId:65538,skeletalStart:0,skeletalEnd:5,frameStep:2});
    const original=model();
    const first=await loader.poseFrame(original,100,2),second=await loader.poseFrame(original,100,2);
    assert.equal(first,second);assert.equal(first.verticesX[0],25);
    assert.deepEqual(requested,[[0,1,2],[1,7,0]]);
    assert.equal((await loader.pose(original,100,120)).verticesX[0],25);
});
test("skeletal streaming keeps bind pose until verified assets resolve",async()=>{
    const loader=new NativePlayerAnimations({}),original=model();
    const definition=Promise.resolve({skeletalId:65538,skeletalStart:0,skeletalEnd:5});
    let resolve;const pending=new Promise(done=>{resolve=done;});
    loader.sequence=()=>definition;loader.skeletal=()=>pending;
    assert.equal(loader.poseFrameAvailable(original,10,2),original);await Promise.resolve();
    assert.equal(loader.poseFrameAvailable(original,10,2),original);
    resolve(sequence());await Promise.resolve();
    assert.equal(loader.poseFrameAvailable(original,10,2).verticesX[0],25);
});
test("skeletal timing rewinds tail and skips hours with the same final state",()=>{
    const definition={skeletalStart:10,skeletalEnd:15,frameStep:2,looping:true,maxLoops:3},state={frame:0,cycle:0};
    stepMovementSkeletal(definition,state,5);assert.equal(state.frame,3);assert.equal(state.loops,1);
    stepMovementSkeletal(definition,state,4);assert.equal(state.frame,0);assert.equal(state.loops,0);
    const fast={frame:0},slow={frame:0};
    stepMovementSkeletal(definition,fast,200000);for(let i=0;i<200000;i++)stepMovementSkeletal(definition,slow,1);
    assert.deepEqual(fast,slow);
});
test("skeletal cache readers reject truncated floats and cyclic bind hierarchies",()=>{
    assert.equal(new ByteBuffer(new Writer().float(-0.25).bytes()).readFloat(),-0.25);
    assert.throws(()=>new ByteBuffer(Uint8Array.of(0,0,0)).readFloat(),/Truncated/);
    assert.throws(()=>decodeSkeleton(skeletonBytes([1,0])),/hierarchy/);
    assert.throws(()=>decodeSkeleton(skeletonBytes().slice(0,-1)),/Truncated/);
});
test("skeletal runtime adaptation reproduces the committed generated modules",async()=>{
    const names=["Curve","CurveInterp","CurveInterpType","CurveType","SkeletalTransformType","MatrixPool","QuatPool","SkeletalBone","SkeletalBase","SkeletalSeq"];
    const files=names.map(name=>new URL(`../browser/tsps-runtime/rs-model-skeletal-${name}.mjs`,import.meta.url));
    files.push(new URL("../browser/tsps-runtime/common-utils-FloatUtil.mjs",import.meta.url));
    const previous=await Promise.all(files.map(path=>readFile(path,"utf8")));
    const result=spawnSync(process.execPath,[new URL("../scripts/adapt-tsps-skeletal.mjs",import.meta.url).pathname.replace(/^\/(\w:)/,"$1")],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(await Promise.all(files.map(path=>readFile(path,"utf8"))),previous);
});
