/*
BSD 2-Clause License

Copyright (c) 2022-2026, dennisdev, xrsps
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
// Classic OSRS frame transforms adapted from pinned TSPS SeqFrame/Model.
import {ByteBuffer} from "./cache-reader.mjs";
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {SkeletalBase} from "./tsps-runtime/rs-model-skeletal-SkeletalBase.mjs";
import {SkeletalSeq} from "./tsps-runtime/rs-model-skeletal-SkeletalSeq.mjs";

export function decodeSkeleton(bytes){
    const r=new ByteBuffer(bytes),count=r.readUnsignedByte();
    const types=Array.from({length:count},()=>r.readUnsignedByte());
    const lengths=Array.from({length:count},()=>r.readUnsignedByte());
    const labels=lengths.map(n=>Array.from({length:n},()=>r.readUnsignedByte()));
    let skeletalBase;
    if(r.offset<r.length){
        const bones=r.readUnsignedShort();
        if(bones){
            skeletalBase=new SkeletalBase(r,bones);
            if(!skeletalBase.poseCount)throw new Error("Skeletal base has no bind poses");
            for(let i=0;i<bones;i++){
                const seen=new Set([i]);let parent=skeletalBase.bones[i].parentId;
                while(parent>=0){
                    if(parent>=bones||seen.has(parent))throw new Error("Invalid skeletal parent hierarchy");
                    seen.add(parent);parent=skeletalBase.bones[parent].parentId;
                }
            }
        }
    }
    if(r.offset!==r.length)throw new Error("Skeleton has trailing data");
    return {count,types,labels,skeletalBase};
}

/** Evaluate the pinned Maya curves against the immutable decoded bind model. */
export function applySkeletalAnimation(model,sequence,frame){
    if(!Number.isInteger(frame)||frame<0)throw new Error("Invalid skeletal frame");
    const base=sequence.skeletalBase;
    if(!base||sequence.poseId>=base.poseCount)throw new Error("Invalid skeletal bind pose");
    base.updateAnimMatrices(sequence,frame);
    const posed={...model,verticesX:model.verticesX.slice(),verticesY:model.verticesY.slice(),verticesZ:model.verticesZ.slice(),
        faceAlphas:model.faceAlphas?.slice()??new Int32Array(model.faceCount)};
    // Multiplying the uniform scaling matrix scales rows 0..2, leaving row 3
    // unchanged, as in pinned Model.transformSkeletal; Float32 rounds each add.
    const matrix=new Float32Array(16);
    for(let v=0;v<model.verticesCount;v++){
        const groups=model.animMayaGroups?.[v],weights=model.animMayaScales?.[v];
        if(!groups?.length)continue;
        if(!weights||weights.length!==groups.length)throw new Error("Invalid skeletal vertex weights");
        matrix.fill(0);
        for(let i=0;i<groups.length;i++){
            const bone=base.getBone(groups[i]);
            if(!bone)continue;
            const final=bone.getFinalMatrix(sequence.poseId),scale=Math.fround(weights[i]/255);
            for(let j=0;j<16;j++)matrix[j]+=Math.fround(final[j]*(j%4===3?1:scale));
        }
        const x=model.verticesX[v],y=-model.verticesY[v],z=-model.verticesZ[v];
        posed.verticesX[v]=Math.round(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12]);
        posed.verticesY[v]=-Math.round(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13]);
        posed.verticesZ[v]=-Math.round(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]);
    }
    if(sequence.hasAlphaTransform){
        const faces=model.faceLabels??skinLabels(model.faceSkins,model.faceCount);
        for(let i=0;i<sequence.base.count;i++){
            const curve=sequence.curves[i]?.[0];
            if(sequence.base.types[i]!==5||!curve)continue;
            for(const label of sequence.base.labels[i])for(const face of faces[label]??[])
                posed.faceAlphas[face]=Math.max(0,Math.min(255,(posed.faceAlphas[face]&255)+curve.getValue(frame)*255));
        }
    }
    return posed;
}

export function decodeAnimationFrame(bytes,skeleton){
    const flags=new ByteBuffer(bytes),values=new ByteBuffer(bytes);
    const skeletonId=flags.readUnsignedShort(),count=flags.readUnsignedByte();
    if(count>skeleton.types.length)throw new Error("Animation exceeds skeleton transform count");
    values.offset=flags.offset+count;
    const transforms=[];let origin=-1,lastOrigin=-1;
    for(let group=0;group<count;group++){
        const type=skeleton.types[group],flag=flags.readUnsignedByte();
        if(type===0)origin=group;
        if(flag===0)continue;
        if(flag&~7)throw new Error("Invalid classic animation transform flags");
        if(type===0)lastOrigin=group;
        if(type>=1&&type<=3&&origin>lastOrigin){
            transforms.push({group:origin,x:0,y:0,z:0});lastOrigin=origin;
        }
        const fallback=type===3||type===10?128:0;
        transforms.push({group,x:flag&1?values.readSmart2():fallback,
            y:flag&2?values.readSmart2():fallback,z:flag&4?values.readSmart2():fallback});
    }
    if(values.offset!==bytes.length)throw new Error("Classic animation has trailing data");
    return {skeletonId,skeleton,transforms};
}

function skinLabels(skins,count){
    const labels=[];
    if(skins)for(let i=0;i<count;i++){
        const label=skins[i];if(label<0)continue;
        (labels[label]??=[]).push(i);
    }
    return labels;
}
const sin=Int32Array.from({length:2048},(_,i)=>Math.trunc(Math.sin(i*Math.PI/1024)*65536));
const cos=Int32Array.from({length:2048},(_,i)=>Math.trunc(Math.cos(i*Math.PI/1024)*65536));

/** Pose a fresh copy: successive frames never accumulate into the bind model. */
export function applyAnimation(model,frame){
    const posed=Object.assign(Object.create(Object.getPrototypeOf(model)),model);
    for(const key of ["verticesX","verticesY","verticesZ"])posed[key]=model[key].slice();
    posed.faceAlphas=model.faceAlphas?.slice()??new Int32Array(model.faceCount);
    const vertices=model.vertexLabels??skinLabels(model.vertexSkins,model.verticesCount);
    const faces=model.faceLabels??skinLabels(model.faceSkins,model.faceCount);
    let ox=0,oy=0,oz=0;
    const X=posed.verticesX,Y=posed.verticesY,Z=posed.verticesZ;
    for(const {group,x:tx,y:ty,z:tz} of frame.transforms){
        const type=frame.skeleton.types[group],labels=frame.skeleton.labels[group];
        if(!labels)throw new Error("Invalid animation transform group");
        if(type===0){
            let count=0;ox=0;oy=0;oz=0;
            for(const label of labels)for(const v of vertices[label]??[]){ox+=X[v];oy+=Y[v];oz+=Z[v];count++;}
            ox=tx+(count?Math.trunc(ox/count):0);oy=ty+(count?Math.trunc(oy/count):0);oz=tz+(count?Math.trunc(oz/count):0);
        }else if(type===5){
            for(const label of labels)for(const f of faces[label]??[])
                posed.faceAlphas[f]=Math.max(0,Math.min(255,(posed.faceAlphas[f]&255)+tx*8));
        }else if(type>=1&&type<=3){
            for(const label of labels)for(const v of vertices[label]??[]){
                if(type===1){X[v]+=tx;Y[v]+=ty;Z[v]+=tz;continue;}
                let x=X[v]-ox,y=Y[v]-oy,z=Z[v]-oz;
                if(type===2){
                    const ax=(tx&255)*8,ay=(ty&255)*8,az=(tz&255)*8;
                    if(az){const next=(sin[az]*y+cos[az]*x)>>16;y=(cos[az]*y-sin[az]*x)>>16;x=next;}
                    if(ax){const next=(cos[ax]*y-sin[ax]*z)>>16;z=(sin[ax]*y+cos[ax]*z)>>16;y=next;}
                    if(ay){const next=(sin[ay]*z+cos[ay]*x)>>16;z=(cos[ay]*z-sin[ay]*x)>>16;x=next;}
                }else{x=Math.trunc(x*tx/128);y=Math.trunc(y*ty/128);z=Math.trunc(z*tz/128);}
                X[v]=x+ox;Y[v]=y+oy;Z[v]=z+oz;
            }
        }else throw new Error(`Unsupported classic transform type ${type}`);
    }
    return posed;
}

/** Revision 240 sequence layout, including shifted skeletal/sound opcodes. */
export function decodePlayerSequence(bytes){
    const r=new ByteBuffer(bytes),seq={frameIds:[],frameLengths:[],frameStep:-1,maxLoops:99,skeletalId:-1,
        forcedPriority:5,precedenceAnimating:-1,priority:-1,replyMode:2,hasInterleaveMask:false};
    for(let op;(op=r.readUnsignedByte())!==0;){
        if(op===1){
            const n=r.readUnsignedShort();seq.frameLengths=Array.from({length:n},()=>r.readUnsignedShort());
            seq.frameIds=Array.from({length:n},()=>r.readUnsignedShort());
            for(let i=0;i<n;i++)seq.frameIds[i]=(seq.frameIds[i]+r.readUnsignedShort()*65536)>>>0;
        }else if(op===2)seq.frameStep=r.readUnsignedShort();
        else if(op===3){const n=r.readUnsignedByte();seq.hasInterleaveMask=true;for(let i=0;i<n;i++)r.readUnsignedByte();}
        else if(op===4||op===19){}
        else if(op===8){seq.maxLoops=r.readUnsignedByte();seq.looping=true;}
        else if(op===5)seq.forcedPriority=r.readUnsignedByte();
        else if(op===9)seq.precedenceAnimating=r.readUnsignedByte();
        else if(op===10)seq.priority=r.readUnsignedByte();
        else if(op===11)seq.replyMode=r.readUnsignedByte();
        else if(op===16)r.readUnsignedByte();
        else if(op===6||op===7)r.readUnsignedShort();
        else if(op===12){const n=r.readUnsignedByte();for(let i=0;i<n*2;i++)r.readUnsignedShort();}
        else if(op===13)seq.skeletalId=r.readInt();
        else if(op===14){const n=r.readUnsignedShort();for(let i=0;i<n;i++){r.readUnsignedShort();r.readUnsignedShort();for(let j=0;j<4;j++)r.readUnsignedByte();}}
        else if(op===15){seq.skeletalStart=r.readUnsignedShort();seq.skeletalEnd=r.readUnsignedShort();}
        else if(op===17){const n=r.readUnsignedByte();for(let i=0;i<n;i++)r.readUnsignedByte();}
        else if(op===18)r.readString();
        else if(op===100){const n=r.readUnsignedByte();for(let i=0;i<n*2;i++)r.readUnsignedShort();}
        else throw new Error(`Unsupported sequence opcode ${op}`);
    }
    if(r.offset!==r.length)throw new Error("Sequence has trailing data");
    return seq;
}

// TSPS PlayerAnimController: retain movement frames on sequence changes,
// advance only after the frame length, and rewind by the sequence's loop tail.
export function stepMovementFrames(sequence,state,cycles){
    const count=sequence.frameIds.length;
    const frameStep=sequence.frameStep??-1;
    if(!count)throw new Error("Sequence has no classic frames");
    const visited=cycles>1000?new Map():null;
    for(let i=0;i<cycles;i++){
        // Stateless NPC/portrait callers can supply hours of elapsed time.
        // Skip whole repeated loops instead of replaying every client cycle.
        if(visited&&state.cycle<=1){
            const key=`${state.frame}:${state.cycle}:${state.loops??0}`,previous=visited.get(key);
            if(previous!==undefined)i+=Math.floor((cycles-i-1)/(i-previous))*(i-previous);
            else visited.set(key,i);
        }
        state.cycle++;
        if(state.frame<count&&state.cycle>Math.max(1,sequence.frameLengths[state.frame])){
            state.cycle=1;state.frame++;
        }
        if(state.frame>=count){
            state.frame-=frameStep>0?frameStep:count;
            if(sequence.looping)state.loops=(state.loops??0)+1;
            if(frameStep<=0||state.frame<0||state.frame>=count||sequence.looping&&state.loops>=sequence.maxLoops){
                state.frame=0;state.cycle=0;state.loops=0;
            }
        }
    }
    return state.frame;
}

export function stepMovementSkeletal(sequence,state,cycles){
    const duration=(sequence.skeletalEnd??0)-(sequence.skeletalStart??0);
    if(!Number.isInteger(duration)||duration<=0)throw new Error("Invalid skeletal duration");
    const visited=cycles>1000?new Map():null;
    for(let i=0;i<cycles;i++){
        if(visited){
            const key=`${state.frame}:${state.loops??0}`,previous=visited.get(key);
            if(previous!==undefined)i+=Math.floor((cycles-i-1)/(i-previous))*(i-previous);
            else visited.set(key,i);
        }
        state.frame++;
        if(state.frame>=duration){
            state.frame-=sequence.frameStep>0?sequence.frameStep:duration;
            if(sequence.looping&&sequence.frameStep>0)state.loops=(state.loops??0)+1;
            if(state.frame<0||state.frame>=duration||sequence.looping&&state.loops>=sequence.maxLoops){state.frame=0;state.loops=0;}
        }
        state.cycle=0;
    }
    return state.frame;
}

/** Shared promises avoid repeated JS5 requests while a sequence is streaming. */
const availableAssets=new WeakMap();
export function availableAsset(promise){
    let state=availableAssets.get(promise);
    if(!state){
        state={ready:false};availableAssets.set(promise,state);
        promise.then(value=>{state.value=value;state.ready=true;},error=>{state.error=error;state.ready=true;});
    }
    if(state.error)throw state.error;
    return state.ready?state.value:null;
}

export class NativePlayerAnimations {
    constructor(cache){this.cache=cache;this.files=new Map();this.sequences=new Map();this.frames=new Map();this.skeletons=new Map();this.skeletalSequences=new Map();
        // Model/animation frame combinations are immutable and repeat across
        // client ticks. A WeakMap avoids keeping unloaded base models alive.
        this.posedFrames=new WeakMap();
    }
    cachedPose(model,frame){
        let entries=this.posedFrames.get(model);
        if(!entries){entries=new Map();this.posedFrames.set(model,entries);}
        if(entries.has(frame)){
            const posed=entries.get(frame);
            entries.delete(frame);entries.set(frame,posed);
            return posed;
        }
        const posed=applyAnimation(model,frame);
        entries.set(frame,posed);
        if(entries.size>8)entries.delete(entries.keys().next().value);
        return posed;
    }
    cachedSkeletalPose(model,sequence,frame){
        let entries=this.posedFrames.get(model);
        if(!entries){entries=new Map();this.posedFrames.set(model,entries);}
        const key=`skeletal:${sequence.id}:${frame}`;
        if(entries.has(key)){const posed=entries.get(key);entries.delete(key);entries.set(key,posed);return posed;}
        const posed=applySkeletalAnimation(model,sequence,frame);entries.set(key,posed);
        if(entries.size>8)entries.delete(entries.keys().next().value);
        return posed;
    }
    skeleton(id){
        if(!this.skeletons.has(id)){
            const p=this.file(1,id,0).then(decodeSkeleton);
            this.skeletons.set(id,p);p.catch(()=>this.skeletons.delete(id));
        }
        return this.skeletons.get(id);
    }
    skeletal(id){
        if(!Number.isInteger(id)||id<0)return Promise.reject(new Error("Invalid skeletal sequence id"));
        if(!this.skeletalSequences.has(id)){
            const p=(async()=>{
                const bytes=await this.file(0,id>>>16,id&65535),r=new ByteBuffer(bytes);
                const version=r.readUnsignedByte(),base=await this.skeleton(r.readUnsignedShort());
                if(!base.skeletalBase)throw new Error("Missing skeletal bind pose");
                const seq=new SkeletalSeq(id,version,base,base.skeletalBase,r);
                if(r.offset!==r.length)throw new Error("Skeletal sequence has trailing data");
                if(seq.poseId>=base.skeletalBase.poseCount)throw new Error("Invalid skeletal bind pose");
                for(const [curves,count] of [[seq.boneCurves,base.skeletalBase.bones.length],[seq.curves,base.count]]){
                    for(const key of Object.keys(curves)){
                        if(!/^\d+$/.test(key)||Number(key)>=count)throw new Error("Invalid skeletal curve target");
                        if(Object.keys(curves[key]).some(channel=>!/^\d+$/.test(channel)))throw new Error("Invalid skeletal curve channel");
                    }
                }
                return seq;
            })();
            this.skeletalSequences.set(id,p);p.catch(()=>this.skeletalSequences.delete(id));
        }
        return this.skeletalSequences.get(id);
    }
    file(index,group,file){
        const key=`${index}:${group}`;
        if(!this.files.has(key)){
            const promise=(async()=>{
                const table=await verifiedCatalog(this.cache,index),ids=table.fileIdsForGroup.get(group);
                if(!ids)throw new Error(`Animation cache group ${key} missing`);
                return unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(index,group)),ids,new Set(ids),{maxFiles:100000});
            })();
            this.files.set(key,promise);promise.catch(()=>this.files.delete(key));
        }
        return this.files.get(key).then(files=>{const data=files.get(file);if(!data)throw new Error(`Animation file ${key}:${file} missing`);return data;});
    }
    sequence(id){
        if(!Number.isInteger(id)||id<0||id>65535)return Promise.reject(new Error("Invalid player sequence id"));
        if(!this.sequences.has(id)){
            const p=this.file(2,12,id).then(decodePlayerSequence);
            this.sequences.set(id,p);p.catch(()=>this.sequences.delete(id));
        }
        return this.sequences.get(id);
    }
    frame(id){
        if(!this.frames.has(id)){
            const p=(async()=>{
                const bytes=await this.file(0,id>>>16,id&65535),r=new ByteBuffer(bytes),baseId=r.readUnsignedShort();
                return decodeAnimationFrame(bytes,await this.skeleton(baseId));
            })();
            this.frames.set(id,p);p.catch(()=>this.frames.delete(id));
        }
        return this.frames.get(id);
    }
    async poseFrame(model,id,index=0){
        const sequence=await this.sequence(id);
        if(sequence.skeletalId>=0)return this.cachedSkeletalPose(model,await this.skeletal(sequence.skeletalId),this.skeletalFrame(sequence,index));
        if(!sequence.frameIds.length)throw new Error(`Sequence ${id} has no classic frames`);
        return this.cachedPose(model,await this.frame(sequence.frameIds[Math.max(0,Math.min(index|0,sequence.frameIds.length-1))]));
    }
    // World actors must keep moving while verified sequence/frame data streams.
    // Use bind pose for missing assets; never hold the shared actor drawing lock.
    poseFrameAvailable(model,id,index=0){
        const sequence=availableAsset(this.sequence(id));
        if(!sequence)return model;
        if(sequence.skeletalId>=0){
            const frame=this.skeletalFrame(sequence,index),skeletal=availableAsset(this.skeletal(sequence.skeletalId));
            return skeletal?this.cachedSkeletalPose(model,skeletal,frame):model;
        }
        if(!sequence.frameIds.length)throw new Error(`Sequence ${id} has no classic frames`);
        const frame=availableAsset(this.frame(sequence.frameIds[Math.max(0,Math.min(index|0,sequence.frameIds.length-1))]));
        return frame?this.cachedPose(model,frame):model;
    }
    poseAvailable(model,id,timeMs=0){
        if(!Number.isFinite(timeMs)||timeMs<0)throw new Error("Invalid animation time");
        const sequence=availableAsset(this.sequence(id));
        if(!sequence)return model;
        if(sequence.skeletalId>=0){
            const index=stepMovementSkeletal(sequence,{frame:0,cycle:0},Math.floor(timeMs/20));
            return this.poseFrameAvailable(model,id,index);
        }
        if(!sequence.frameIds.length)throw new Error(`Sequence ${id} has no classic frames`);
        const index=stepMovementFrames(sequence,{frame:0,cycle:0},Math.floor(timeMs/20));
        return this.poseFrameAvailable(model,id,index);
    }
    async pose(model,id,timeMs=0,movementState=null){
        if(!Number.isFinite(timeMs)||timeMs<0)throw new Error("Invalid animation time");
        const sequence=await this.sequence(id);
        if(sequence.skeletalId>=0){
            let index;
            if(movementState){
                const tick=Math.floor(timeMs/20),cycles=Math.max(0,tick-(movementState.tick??tick));
                movementState.frame??=0;movementState.cycle??=0;
                index=stepMovementSkeletal(sequence,movementState,cycles);movementState.tick=tick;
            }else index=stepMovementSkeletal(sequence,{frame:0,cycle:0},Math.floor(timeMs/20));
            return this.cachedSkeletalPose(model,await this.skeletal(sequence.skeletalId),this.skeletalFrame(sequence,index));
        }
        if(!sequence.frameIds.length)throw new Error(`Sequence ${id} has no classic frames`);
        if(movementState){
            const tick=Math.floor(timeMs/20),cycles=Math.max(0,tick-(movementState.tick??tick));
            movementState.frame??=0;movementState.cycle??=0;
            stepMovementFrames(sequence,movementState,cycles);
            // A newly selected shorter sequence may not contain the old frame.
            if(movementState.frame>=sequence.frameIds.length){movementState.frame=0;movementState.cycle=0;}
            movementState.tick=tick;
            return this.cachedPose(model,await this.frame(sequence.frameIds[movementState.frame]));
        }
        const index=stepMovementFrames(sequence,{frame:0,cycle:0},Math.floor(timeMs/20));
        return this.cachedPose(model,await this.frame(sequence.frameIds[index]));
    }
    skeletalFrame(sequence,index){
        const duration=(sequence.skeletalEnd??0)-(sequence.skeletalStart??0);
        if(!Number.isInteger(duration)||duration<=0)throw new Error("Invalid skeletal duration");
        return Math.max(0,Math.min(index|0,duration-1));
    }
}
