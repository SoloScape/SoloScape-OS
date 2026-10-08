// Cache-backed OSRS revision-240 NPC definitions. Opcode layout follows pinned
// TSPS NpcType (BSD-2-Clause; upstream licence retained in player-config.mjs).
import {ByteBuffer} from "./cache-reader.mjs";
import {mergePlayerModels,buildPlayerMesh} from "./player-models.mjs";

const none=id=>id===65535?-1:id;
const take=(r,count,method="readUnsignedShort")=>{
    if(count>1024)throw new Error("NPC definition count exceeds limit");
    return Array.from({length:count},()=>r[method]());
};
const bigSmart=r=>r.getUnsignedByte(r.offset)>=128?(r.readInt()&0x7fffffff):none(r.readUnsignedShort());
export function decodeNpcType(bytes,id=-1){
    if(!(bytes instanceof Uint8Array))throw new Error("Invalid NPC configuration");
    const r=new ByteBuffer(bytes),d={id,name:"",size:1,modelIds:[],modelOffsets:[],recolorFrom:[],recolorTo:[],
        retextureFrom:[],retextureTo:[],idleSeqId:-1,walkSeqId:-1,runSeqId:-1,basTypeId:-1,
        widthScale:128,heightScale:128,ambient:0,contrast:0,turnSpeed:32,actions:[],transforms:null};
    for(let count=0;count<4096;count++){
        const op=r.readUnsignedByte();
        if(op===0){if(r.offset!==r.length)throw new Error("NPC definition trailing bytes");return d;}
        if(op===1)d.modelIds=take(r,r.readUnsignedByte());
        else if(op===2)d.name=r.readString();
        else if(op===3)d.examine=r.readString();
        else if(op===12)d.size=Math.max(1,r.readUnsignedByte());
        else if(op===13)d.idleSeqId=none(r.readUnsignedShort());
        else if(op===14)d.walkSeqId=none(r.readUnsignedShort());
        else if(op===15)d.turnLeftSeqId=none(r.readUnsignedShort());
        else if(op===16)d.turnRightSeqId=none(r.readUnsignedShort());
        else if(op===17){d.walkSeqId=none(r.readUnsignedShort());d.walkBackSeqId=none(r.readUnsignedShort());
            d.walkLeftSeqId=none(r.readUnsignedShort());d.walkRightSeqId=none(r.readUnsignedShort());}
        else if(op===18)d.category=r.readUnsignedShort();
        else if(op>=30&&op<35){const action=r.readString();d.actions[op-30]=action.toLowerCase()==="hidden"?null:action;}
        else if(op===40||op===41){
            const n=r.readUnsignedByte(),from=take(r,n*2); // interleaved pairs
            d[op===40?"recolorFrom":"retextureFrom"]=from.filter((_,i)=>i%2===0);
            d[op===40?"recolorTo":"retextureTo"]=from.filter((_,i)=>i%2!==0);
        }
        else if(op===42||op===44||op===45)r.readUnsignedShort();
        else if(op===60)d.chatheadIds=take(r,r.readUnsignedByte());
        else if(op===61)d.modelIds=take(r,r.readUnsignedByte(),"readInt");
        else if(op===62)d.chatheadIds=take(r,r.readUnsignedByte(),"readInt");
        else if(op>=74&&op<=79)r.readUnsignedShort();
        else if(op===93||op===99||op===107||op===109||op===111||op===112||op===122||op===123||
            op===130||op===141||op===143||op===145||op===147||op===158||op===159||op===161||op===162){}
        else if(op===95)d.combatLevel=r.readUnsignedShort();
        else if(op===97)d.widthScale=r.readUnsignedShort();
        else if(op===98)d.heightScale=r.readUnsignedShort();
        else if(op===100)d.ambient=r.readByte();
        else if(op===101)d.contrast=r.readByte()*5;
        else if(op===102){
            let mask=r.readUnsignedByte();
            for(let bit=0;mask;bit++,mask>>>=1)if(mask&1){
                bigSmart(r);r.readUnsignedSmart(); // sprite id and index
            }
        }
        else if(op===103)d.turnSpeed=r.readUnsignedShort();
        else if(op===106||op===118){
            d.transformVarbit=none(r.readUnsignedShort());d.transformVarp=none(r.readUnsignedShort());
            const fallback=op===118?none(r.readUnsignedShort()):-1,n=r.readUnsignedByte();
            d.transforms=take(r,n+1).map(none);d.transforms.push(fallback);
        }
        else if(op===113)take(r,2);
        else if(op===114)d.runSeqId=none(r.readUnsignedShort());
        else if(op===115){d.runSeqId=none(r.readUnsignedShort());d.runBackSeqId=none(r.readUnsignedShort());
            d.runLeftSeqId=none(r.readUnsignedShort());d.runRightSeqId=none(r.readUnsignedShort());}
        else if(op===116)d.crawlSeqId=none(r.readUnsignedShort());
        else if(op===117){d.crawlSeqId=none(r.readUnsignedShort());d.crawlBackSeqId=none(r.readUnsignedShort());
            d.crawlLeftSeqId=none(r.readUnsignedShort());d.crawlRightSeqId=none(r.readUnsignedShort());}
        else if(op===119||op===128||op===140||op===163||op===165||op===168)r.readUnsignedByte();
        else if(op===121){
            for(let n=r.readUnsignedByte();n>0;n--)d.modelOffsets[r.readUnsignedByte()]=[r.readByte(),r.readByte(),r.readByte()];
        }
        else if(op===124||op===126||op===127||op===137||op===138||op===139||op===142||op===144||op===146)d[op===127?"basTypeId":"unused"]=r.readUnsignedShort();
        else if(op===125)d.spawnDirection=r.readByte();
        else if(op===134)take(r,4);
        else if(op===135||op===136){r.readUnsignedByte();r.readUnsignedShort();}
        else if(op===155)take(r,4,"readByte");
        else if(op===160)take(r,r.readUnsignedByte());
        else if(op===164)take(r,2);
        else if(op>=150&&op<155)d.actions[op-150]=r.readString();
        else if(op>=170&&op<176)r.readUnsignedShort();
        else if(op===249){
            for(let n=r.readUnsignedByte();n>0;n--){const str=r.readUnsignedByte();
                r.readMedium();if(str)r.readString();else r.readInt();}
        }
        else if(op===251){r.readUnsignedByte();r.readUnsignedByte();r.readString();}
        else if(op===252){r.readUnsignedByte();take(r,2);r.readInt();r.readInt();r.readString();}
        else if(op===253){r.readUnsignedByte();take(r,3);r.readInt();r.readInt();r.readString();}
        else throw new Error("Unsupported NPC config opcode "+op+" for "+id);
    }
    throw new Error("NPC definition opcode limit");
}
export function recolourNpcPart(source,definition,index=0){
    const c={...source,verticesX:source.verticesX.slice(),verticesY:source.verticesY.slice(),
        verticesZ:source.verticesZ.slice(),faceColors:source.faceColors.slice(),faceTextures:source.faceTextures?.slice()};
    const recolours=new Map(definition.recolorFrom.map((from,i)=>[from,definition.recolorTo[i]]));
    const retextures=new Map(definition.retextureFrom.map((from,i)=>[from,definition.retextureTo[i]]));
    for(let i=0;i<c.faceCount;i++){
        c.faceColors[i]=recolours.get(c.faceColors[i])??c.faceColors[i];
        if(c.faceTextures)c.faceTextures[i]=retextures.get(c.faceTextures[i])??c.faceTextures[i];
    }
    const offsets=definition.modelOffsets[index]??[0,0,0];
    for(let i=0;i<c.verticesCount;i++){
        c.verticesX[i]=Math.trunc(c.verticesX[i]*definition.widthScale/128)+offsets[0];
        c.verticesY[i]=Math.trunc(c.verticesY[i]*definition.heightScale/128)+offsets[1];
        c.verticesZ[i]=Math.trunc(c.verticesZ[i]*definition.widthScale/128)+offsets[2];
    }
    return c;
}
export class NativeNpcModels{
    constructor(playerModels){this.playerModels=playerModels;this.definitions=new Map();this.compositions=new Map();}
    definition(id){
        if(!Number.isInteger(id)||id<0||id>0xffffff)return Promise.reject(new Error("Invalid NPC type"));
        if(!this.definitions.has(id)){
            const p=this.playerModels.config(9,id,class {constructor(){}decode(bytes){return decodeNpcType(bytes,id);}});
            this.definitions.set(id,p);p.catch(()=>this.definitions.delete(id));
        }
        return this.definitions.get(id);
    }
    async composition(id){
        if(!this.compositions.has(id)){
            if(this.compositions.size>=128)this.compositions.delete(this.compositions.keys().next().value);
            const p=(async()=>{
                const definition=await this.definition(id);
                if(!definition.modelIds.length)throw new Error("NPC "+id+" has no static body models (dynamic transform unsupported)");
                const parts=[];
                for(const [index,modelId] of definition.modelIds.entries()){
                    if(modelId!==65535&&modelId>=0)parts.push(recolourNpcPart(await this.playerModels.model(modelId),definition,index));
                }
                const model=mergePlayerModels(parts);
                for(const texture of new Set(model.faceTextures))if(texture>=0)await this.playerModels.textures.load(texture);
                return {model,definition};
            })();
            this.compositions.set(id,p);p.catch(()=>this.compositions.delete(id));
        }
        return this.compositions.get(id);
    }
    async mesh(npc,terrain,{elapsed=0,sequenceElapsed=0}={}){
        const {model,definition}=await this.composition(npc.type),animations=this.playerModels.animations;
        let animId=npc.sequence?.id??-1,time=sequenceElapsed;
        if(animId<0){animId=npc.animationOverrides?.[npc.moving?(npc.moveSpeed===2?"run":"walk"):"idle"] ??
            (npc.moving?(npc.moveSpeed===2&&definition.runSeqId>=0?definition.runSeqId:definition.walkSeqId):definition.idleSeqId);time=elapsed;}
        let pose=model;
        if(animId>=0){try{pose=await animations.pose(model,animId,time);}catch{pose=model;}}
        return buildPlayerMesh(pose,terrain,npc,{textures:this.playerModels.textures.textures,
            size:definition.size,ambient:definition.ambient,contrast:82+definition.contrast});
    }
}
