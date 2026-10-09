import test from "node:test";
import assert from "node:assert/strict";
import {decodeSkeleton,decodeAnimationFrame,decodePlayerSequence,applyAnimation,NativePlayerAnimations,stepMovementFrames} from "../browser/player-animation.mjs";

const model=()=>({verticesCount:2,faceCount:1,verticesX:Int32Array.of(10,30),
    verticesY:Int32Array.of(0,0),verticesZ:Int32Array.of(0,0),vertexSkins:Int32Array.of(0,0),
    faceSkins:Int32Array.of(0),faceAlphas:Int32Array.of(240)});
const frame=(types,transforms)=>({skeleton:{types,labels:types.map(()=>[0])},transforms});

test("classic skeleton and frame retain omitted pivot for rotations",()=>{
    const skeleton=decodeSkeleton(Uint8Array.of(2,0,2,1,1,0,0));
    const decoded=decodeAnimationFrame(Uint8Array.of(0,7,2,0,2,192,64),skeleton);
    assert.deepEqual(decoded.transforms,[{group:0,x:0,y:0,z:0},{group:1,x:0,y:64,z:0}]);
    assert.equal(decoded.skeletonId,7);
});
test("translation preserves bind model and copies alpha",()=>{
    const base=model(),posed=applyAnimation(base,frame([1],[{group:0,x:2,y:3,z:4}]));
    assert.deepEqual([...posed.verticesX],[12,32]);assert.deepEqual([...posed.verticesY],[3,3]);
    assert.deepEqual([...posed.verticesZ],[4,4]);assert.deepEqual([...base.verticesX],[10,30]);
    assert.notEqual(posed.faceAlphas,base.faceAlphas);
});
test("yaw rotates around centroid pivot with Java fixed point order",()=>{
    const posed=applyAnimation(model(),frame([0,2],[{group:0,x:0,y:0,z:0},{group:1,x:0,y:64,z:0}]));
    assert.deepEqual([...posed.verticesX],[20,20]);assert.deepEqual([...posed.verticesZ],[10,-10]);
});
test("scale uses centroid pivot and truncation toward zero",()=>{
    const posed=applyAnimation(model(),frame([0,3],[{group:0,x:1,y:0,z:0},{group:1,x:64,y:128,z:128}]));
    assert.deepEqual([...posed.verticesX],[16,25]);
});
test("alpha transforms clamp and never mutate base",()=>{
    const base=model(),posed=applyAnimation(base,frame([5],[{group:0,x:3,y:0,z:0}]));
    assert.equal(posed.faceAlphas[0],255);assert.equal(base.faceAlphas[0],240);
});
test("strict frame bounds reject truncation, trailing data and impossible groups",()=>{
    const skeleton={types:[1],labels:[[0]]};
    assert.throws(()=>decodeAnimationFrame(Uint8Array.of(0,1,1,1),skeleton),/Truncated/);
    assert.throws(()=>decodeAnimationFrame(Uint8Array.of(0,1,1,0,0),skeleton),/trailing/);
    assert.throws(()=>decodeAnimationFrame(Uint8Array.of(0,1,2),skeleton),/count/);
});
test("revision 240 sequences decode unsigned composite frame ids and skeletal layout",()=>{
    const sequence=decodePlayerSequence(Uint8Array.of(1,0,1,0,2,0,7,128,0,2,0,1,0));
    assert.deepEqual(sequence.frameIds,[0x80000007]);assert.deepEqual(sequence.frameLengths,[2]);
    assert.equal(sequence.frameStep,1);
    const skeletal=decodePlayerSequence(Uint8Array.of(13,0,1,0,2,15,0,4,0,9,16,255,19,0));
    assert.equal(skeletal.skeletalId,65538);assert.equal(skeletal.skeletalStart,4);assert.equal(skeletal.skeletalEnd,9);
});
test("loader chooses locomotion frames at 20 ms and reuses promises",async()=>{
    const loader=new NativePlayerAnimations({}),sequence={frameIds:[1,2],frameLengths:[2,3],skeletalId:-1};
    loader.sequence=async()=>sequence;const seen=[];
    loader.frame=async id=>{seen.push(id);return frame([1],[{group:0,x:id,y:0,z:0}]);};
    assert.equal((await loader.pose(model(),819,0)).verticesX[0],11);
    assert.equal((await loader.pose(model(),819,40)).verticesX[0],11);
    assert.equal((await loader.pose(model(),819,60)).verticesX[0],12);
    assert.equal((await loader.pose(model(),819,120)).verticesX[0],11);
    assert.deepEqual(seen,[1,1,2,1]);
    loader.sequence=async()=>({skeletalId:2});
    await assert.rejects(loader.pose(model(),1,0),/skeletal/);
});

test("streaming poses never await a missing sequence or frame and animate once available",async()=>{
    const loader=new NativePlayerAnimations({}),base=model();
    let resolveSequence,resolveFrame;
    const sequence=new Promise(resolve=>{resolveSequence=resolve;});
    const pendingFrame=new Promise(resolve=>{resolveFrame=resolve;});
    loader.sequence=()=>sequence;loader.frame=()=>pendingFrame;
    assert.equal(loader.poseFrameAvailable(base,10),base);
    resolveSequence({frameIds:[1],frameLengths:[2],skeletalId:-1});await Promise.resolve();
    assert.equal(loader.poseFrameAvailable(base,10),base);
    assert.equal(loader.poseAvailable(base,10,1000),base);
    resolveFrame(frame([1],[{group:0,x:7,y:0,z:0}]));await Promise.resolve();
    assert.equal(loader.poseFrameAvailable(base,10).verticesX[0],17);
    assert.equal(loader.poseAvailable(base,10,1000).verticesX[0],17);
    assert.equal(base.verticesX[0],10);
});

test("streaming asset failures are handled and reported without an unhandled rejection",async()=>{
    const loader=new NativePlayerAnimations({}),base=model();
    const failed=Promise.reject(new Error("missing sequence"));loader.sequence=()=>failed;
    assert.equal(loader.poseFrameAvailable(base,10),base);await Promise.resolve();
    assert.throws(()=>loader.poseFrameAvailable(base,10),/missing sequence/);
});

test("locomotion retains frame/cycle across sequence changes and loops only the tail",()=>{
    const sequence={frameIds:[1,2,3],frameLengths:[2,2,2],frameStep:2};
    const state={frame:0,cycle:0};
    stepMovementFrames(sequence,state,2);assert.deepEqual(state,{frame:0,cycle:2});
    stepMovementFrames(sequence,state,1);assert.deepEqual(state,{frame:1,cycle:1});
    stepMovementFrames({...sequence,frameLengths:[5,5,5]},state,2);
    assert.deepEqual(state,{frame:1,cycle:3});
    stepMovementFrames(sequence,state,3);assert.equal(state.frame,1);
});

test("long elapsed animation times skip complete loops with identical final frame state",()=>{
    const sequence={frameIds:[1,2],frameLengths:[2,3]},state={frame:0,cycle:0,loops:0};
    stepMovementFrames(sequence,state,100000000);
    const short={frame:0,cycle:0,loops:0};stepMovementFrames(sequence,short,100000000%6);
    assert.deepEqual(state,short);
});
