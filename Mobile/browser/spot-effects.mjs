// Cache definition layout follows BSD-2-Clause TSPS SpotAnimType; see
// player-config.mjs for its licence. Revision-241-only opcodes are rejected.
import {ByteBuffer} from "./cache-reader.mjs";
import {buildPlayerMesh} from "./player-models.mjs";
import {sceneSequenceFrame} from "./scene-animation.mjs";

export function decodeSpotEffect(bytes,id){
    const r=new ByteBuffer(bytes),d={id,modelId:-1,sequenceId:-1,widthScale:128,heightScale:128,
        orientation:0,ambient:0,contrast:0,recolors:[],retextures:[]};
    for(let count=0;count<4096;count++){
        const op=r.readUnsignedByte();
        if(op===0){
            if(r.offset!==r.length||d.modelId<0||![0,90,180,270].includes(d.orientation))throw new Error("Malformed spot effect definition");
            return d;
        }
        if(op===1)d.modelId=r.readUnsignedShort();
        else if(op===3)d.modelId=r.readInt()>>>0;
        else if(op===2){const n=r.readUnsignedShort();d.sequenceId=n===65535?-1:n;}
        else if(op===4)d.widthScale=r.readUnsignedShort();
        else if(op===5)d.heightScale=r.readUnsignedShort();
        else if(op===6)d.orientation=r.readUnsignedShort();
        else if(op===7)d.ambient=r.readUnsignedByte();
        else if(op===8)d.contrast=r.readUnsignedByte();
        else if(op===9)r.readString();
        else if(op===40||op===41){
            const pairs=Array.from({length:r.readUnsignedByte()},()=>[r.readUnsignedShort(),r.readUnsignedShort()]);
            d[op===40?"recolors":"retextures"]=pairs;
        }else throw new Error(`Unsupported revision-240 spot effect opcode ${op}`);
    }
    throw new Error("Spot effect definition exceeds opcode limit");
}

export class NativeSpotEffects {
    constructor(models){this.models=models;this.definitions=new Map();this.actors=new Map();this.errors=[];}
    reset(){this.actors.clear();this.errors=[];}
    update(key,updates,now){
        let state=this.actors.get(key);
        if(!state){state={source:null,slots:new Map()};this.actors.set(key,state);}
        // Sync retains the same array until a new update mask arrives. A new
        // update of the same id is still a restart; omitted slots keep playing.
        if(!updates||state.source===updates)return;
        state.source=updates;
        for(const effect of updates){
            if(effect.id<0)state.slots.delete(effect.slot);
            else state.slots.set(effect.slot,{...effect,started:now+effect.delay*20,failed:false});
        }
    }
    definition(id){
        if(!this.definitions.has(id)){
            const p=this.models.animations.file(2,13,id).then(bytes=>decodeSpotEffect(bytes,id));
            this.definitions.set(id,p);p.catch(()=>this.definitions.delete(id));
        }
        return this.definitions.get(id);
    }
    async meshes(key,actor,terrain,now,size=1){
        const state=this.actors.get(key),result=[];
        if(!state)return result;
        for(const effect of state.slots.values()){
            if(now<effect.started||effect.failed)continue;
            try{
                const d=await this.definition(effect.id);
                let model=await this.models.model(d.modelId);
                if(d.sequenceId>=0){
                    const seq=await this.models.animations.sequence(d.sequenceId);
                    const frame=sceneSequenceFrame(seq,now-effect.started,{loop:effect.loop});
                    if(frame<0){if(state.slots.get(effect.slot)===effect)state.slots.delete(effect.slot);continue;}
                    model=await this.models.animations.poseFrame(model,d.sequenceId,frame);
                }
                const colors=new Map(d.recolors),textures=new Map(d.retextures);
                const posed={...model,verticesX:model.verticesX.slice(),verticesY:model.verticesY.slice(),verticesZ:model.verticesZ.slice(),
                    faceColors:model.faceColors.slice(),faceTextures:model.faceTextures?.slice()};
                for(let i=0;i<posed.faceCount;i++){
                    posed.faceColors[i]=colors.get(posed.faceColors[i])??posed.faceColors[i];
                    if(posed.faceTextures)posed.faceTextures[i]=textures.get(posed.faceTextures[i])??posed.faceTextures[i];
                }
                for(const id of new Set(posed.faceTextures??[]))if(id>=0&&!await this.models.textures.load(id))throw new Error(`Spot effect texture ${id} unavailable`);
                for(let i=0;i<posed.verticesCount;i++){
                    let x=Math.trunc(posed.verticesX[i]*d.widthScale/128),z=Math.trunc(posed.verticesZ[i]*d.widthScale/128);
                    if(d.orientation===90)[x,z]=[z,-x];
                    else if(d.orientation===180){x=-x;z=-z;}
                    else if(d.orientation===270)[x,z]=[-z,x];
                    posed.verticesX[i]=x;posed.verticesZ[i]=z;
                    posed.verticesY[i]=Math.trunc(posed.verticesY[i]*d.heightScale/128)-effect.height;
                }
                // Ignore a superseded slot after asynchronous cache downloads.
                if(this.actors.get(key)!==state||state.slots.get(effect.slot)!==effect)continue;
                result.push(buildPlayerMesh(posed,terrain,actor,{size,ambient:d.ambient,contrast:82+d.contrast,
                    textures:this.models.textures.textures}));
            }catch(error){effect.failed=true;this.errors.push({actor:key,id:effect.id,reason:error.message});}
        }
        return result;
    }
}
