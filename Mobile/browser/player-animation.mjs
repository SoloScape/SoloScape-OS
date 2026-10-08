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

export function decodeSkeleton(bytes){
    const r=new ByteBuffer(bytes),count=r.readUnsignedByte();
    const types=Array.from({length:count},()=>r.readUnsignedByte());
    const lengths=Array.from({length:count},()=>r.readUnsignedByte());
    const labels=lengths.map(n=>Array.from({length:n},()=>r.readUnsignedByte()));
    // Modern skeletons append a skeletal bind pose, unused by classic frames.
    return {types,labels};
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
    const r=new ByteBuffer(bytes),seq={frameIds:[],frameLengths:[],frameStep:-1,maxLoops:99,skeletalId:-1};
    for(let op;(op=r.readUnsignedByte())!==0;){
        if(op===1){
            const n=r.readUnsignedShort();seq.frameLengths=Array.from({length:n},()=>r.readUnsignedShort());
            seq.frameIds=Array.from({length:n},()=>r.readUnsignedShort());
            for(let i=0;i<n;i++)seq.frameIds[i]=(seq.frameIds[i]+r.readUnsignedShort()*65536)>>>0;
        }else if(op===2)seq.frameStep=r.readUnsignedShort();
        else if(op===3){const n=r.readUnsignedByte();for(let i=0;i<n;i++)r.readUnsignedByte();}
        else if(op===4||op===19){}
        else if(op===8){seq.maxLoops=r.readUnsignedByte();seq.looping=true;}
        else if([5,9,10,11,16].includes(op))r.readUnsignedByte();
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

/** Shared promises avoid repeated JS5 requests while a sequence is streaming. */
export class NativePlayerAnimations {
    constructor(cache){this.cache=cache;this.files=new Map();this.sequences=new Map();this.frames=new Map();this.skeletons=new Map();}
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
                if(!this.skeletons.has(baseId)){
                    const base=this.file(1,baseId,0).then(decodeSkeleton);
                    this.skeletons.set(baseId,base);base.catch(()=>this.skeletons.delete(baseId));
                }
                return decodeAnimationFrame(bytes,await this.skeletons.get(baseId));
            })();
            this.frames.set(id,p);p.catch(()=>this.frames.delete(id));
        }
        return this.frames.get(id);
    }
    async pose(model,id,timeMs=0,movementState=null){
        if(!Number.isFinite(timeMs)||timeMs<0)throw new Error("Invalid animation time");
        const sequence=await this.sequence(id);
        if(sequence.skeletalId>=0)throw new Error(`Sequence ${id} requires skeletal animation`);
        if(!sequence.frameIds.length)throw new Error(`Sequence ${id} has no classic frames`);
        if(movementState){
            const tick=Math.floor(timeMs/20),cycles=Math.max(0,tick-(movementState.tick??tick));
            movementState.frame??=0;movementState.cycle??=0;
            stepMovementFrames(sequence,movementState,cycles);
            // A newly selected shorter sequence may not contain the old frame.
            if(movementState.frame>=sequence.frameIds.length){movementState.frame=0;movementState.cycle=0;}
            movementState.tick=tick;
            return applyAnimation(model,await this.frame(sequence.frameIds[movementState.frame]));
        }
        const index=stepMovementFrames(sequence,{frame:0,cycle:0},Math.floor(timeMs/20));
        return applyAnimation(model,await this.frame(sequence.frameIds[index]));
    }
}
