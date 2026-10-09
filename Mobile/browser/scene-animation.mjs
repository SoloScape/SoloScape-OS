import {buildObjectMesh} from "./scenery-models.mjs";

// Sequence definitions are immutable cache assets. Keep their per-frame
// durations/totals instead of allocating arrays on every 20Hz update.
const sequenceTimings=new WeakMap();
function timing(sequence){
    let value=sequenceTimings.get(sequence);
    if(!value){
        const lengths=sequence.frameLengths.map(n=>Math.max(1,n));
        value={lengths,total:lengths.reduce((sum,n)=>sum+n,0),tails:new Map()};
        sequenceTimings.set(sequence,value);
    }
    return value;
}

// Finite effects end after their last frame. Locations rewind only the cache's
// loop tail; they must not use the perpetual actor locomotion cycle.
export function sceneSequenceFrame(sequence,elapsedMs,{loop=false,location=false}={}){
    if(!Number.isFinite(elapsedMs)||elapsedMs<0)return -1;
    if(sequence.skeletalId>=0)throw new Error("Scene sequence requires skeletal animation");
    const stats=timing(sequence),lengths=stats.lengths,total=stats.total;
    if(!lengths.length||lengths.length!==sequence.frameIds.length)throw new Error("Scene sequence has no classic frames");
    let cycle=Math.floor(elapsedMs/20),frame=0;
    if(cycle>total){
        const tail=location?sequence.frameStep:loop?lengths.length:0;
        if(!Number.isInteger(tail)||tail<=0||tail>lengths.length)return -1;
        let duration=stats.tails.get(tail);
        if(duration===undefined){
            duration=0;
            for(let i=lengths.length-tail;i<lengths.length;i++)duration+=lengths[i];
            stats.tails.set(tail,duration);
        }
        cycle=total+1+(cycle-total-1)%duration;
    }
    while(frame<lengths.length&&cycle>lengths[frame]){cycle-=lengths[frame];frame++;}
    if(frame>=lengths.length){
        const tail=location?sequence.frameStep:loop?lengths.length:0;
        frame=tail>0?lengths.length-tail:-1;
        if(frame>=0){while(frame<lengths.length&&cycle>lengths[frame]){cycle-=lengths[frame];frame++;}}
    }
    return frame<lengths.length?frame:-1;
}

// Sample conservative visibility at the tile boundary. A one-tile
// allowance covers fractional movement without rebuilding every scene
// when a player walks within the same tile.
export function sceneVisibilityCell(player){
    return {x:Math.floor(player.x),y:Math.floor(player.y)};
}
export function sceneEntryVisible(entry,cell){
    const {terrain,loc,definition}=entry;
    const radius=50+Math.max(definition.sizeX,definition.sizeY);
    return Math.max(Math.abs(terrain.mapX*64+loc.x-cell.x),
        Math.abs(terrain.mapY*64+loc.y-cell.y))<=radius;
}
export class NativeSceneAnimations {
    constructor(animations){this.animations=animations;this.entries=[];this.errors=[];}
    reset(entries=[],started=0){
        this.entries=entries.map(entry=>({...entry,started,lastFrame:null,mesh:null,scenePart:null,failed:false}));
        this.errors=[];this.previousScene=null;this.previousView=null;
    }
    async scene(now,origin,player,textures){
        // Actors update independently from location animations. Keep the
        // complete scene and pick references until the tile cell or a visible
        // animation frame changes. Conservative culling covers sub-tile edges.
        const cell=sceneVisibilityCell(player);
        const view=origin.mapX+":"+origin.mapY+":"+cell.x+":"+cell.y+":"+(player.plane??0);
        if(this.previousScene&&this.previousView===view&&this.previousTextures===textures&&
            this.entries.every(entry=>{
                if(entry.failed||!sceneEntryVisible(entry,cell))return true;
                return Boolean(entry.sequence&&entry.sequenceResolver===this.animations.sequence&&
                    entry.lastFrame!==null&&entry.scenePart&&
                    sceneSequenceFrame(entry.sequence,Math.max(0,now-entry.started),{location:true})===entry.lastFrame);
            }))return this.previousScene;
        const batches=[],transparentBatches=[],pickMeshes=[];
        for(const entry of this.entries){
            const {terrain,loc,definition,part,model,level}=entry;
            const dx=(terrain.mapX-origin.mapX)*64,dy=(terrain.mapY-origin.mapY)*64;
            // Conservatively include edge tiles. The shader still clips to
            // the actual camera draw window, not this animation cache radius.
            if(entry.failed||!sceneEntryVisible(entry,cell))continue;
            try{
                if(!entry.sequence||entry.sequenceResolver!==this.animations.sequence){
                    entry.sequence=await this.animations.sequence(definition.seqId);
                    entry.sequenceResolver=this.animations.sequence;
                }
                const sequence=entry.sequence;
                const frame=sceneSequenceFrame(sequence,Math.max(0,now-entry.started),{location:true});
                if(!entry.mesh||frame!==entry.lastFrame){
                    const posed=frame<0?model:await this.animations.poseFrame(model,definition.seqId,frame);
                    entry.mesh=buildObjectMesh(terrain,loc,definition,part,[posed],{textures});entry.lastFrame=frame;
                    entry.scenePart=null;
                }
                if(entry.scenePart&&entry.scenePart.dx===dx&&entry.scenePart.dy===dy){
                    batches.push(...entry.scenePart.batches);transparentBatches.push(...entry.scenePart.transparentBatches);
                    pickMeshes.push(entry.scenePart.pickMesh);continue;
                }
                const partBatches=[],partAlpha=[];
                const shift=vertices=>{const v=vertices.slice();for(let i=0;i<v.length;i+=6){v[i]+=dx;v[i+2]+=dy;}return v;};
                const mesh=entry.mesh,chunks=[];
                if(mesh.vertices.length){const vertices=shift(mesh.vertices);partBatches.push({level,texture:-1,vertices});chunks.push(vertices);}
                for(const [texture,v] of mesh.texturedBatches){const vertices=shift(v);partBatches.push({level,texture,vertices});chunks.push(vertices);}
                for(const b of mesh.transparentBatches){const vertices=shift(b.vertices);partAlpha.push({...b,level,vertices});chunks.push(vertices);}
                const vertices=new Float32Array(chunks.reduce((n,v)=>n+v.length,0));let at=0;
                for(const v of chunks){vertices.set(v,at);at+=v.length;}
                const pickMesh={id:loc.id,name:definition.name,actions:definition.actions??[],
                    x:loc.x+dx,y:loc.y+dy,plane:loc.plane,level,vertices};
                entry.scenePart={dx,dy,batches:partBatches,transparentBatches:partAlpha,pickMesh};
                batches.push(...partBatches);transparentBatches.push(...partAlpha);pickMeshes.push(pickMesh);
            }catch(error){entry.failed=true;this.errors.push({id:loc.id,sequence:definition.seqId,reason:error.message});}
        }
        this.previousView=view;this.previousTextures=textures;
        this.previousScene={batches,transparentBatches,pickMeshes};
        return this.previousScene;
    }
}
