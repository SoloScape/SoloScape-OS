import {buildObjectMesh} from "./scenery-models.mjs";

// Finite effects end after their last frame. Locations rewind only the cache's
// loop tail; they must not use the perpetual actor locomotion cycle.
export function sceneSequenceFrame(sequence,elapsedMs,{loop=false,location=false}={}){
    if(!Number.isFinite(elapsedMs)||elapsedMs<0)return -1;
    if(sequence.skeletalId>=0)throw new Error("Scene sequence requires skeletal animation");
    const lengths=sequence.frameLengths.map(n=>Math.max(1,n));
    if(!lengths.length||lengths.length!==sequence.frameIds.length)throw new Error("Scene sequence has no classic frames");
    let cycle=Math.floor(elapsedMs/20),frame=0;
    const total=lengths.reduce((n,v)=>n+v,0);
    if(cycle>total){
        const tail=location?sequence.frameStep:loop?lengths.length:0;
        if(!Number.isInteger(tail)||tail<=0||tail>lengths.length)return -1;
        const duration=lengths.slice(-tail).reduce((n,v)=>n+v,0);
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

export class NativeSceneAnimations {
    constructor(animations){this.animations=animations;this.entries=[];this.errors=[];}
    reset(entries=[],started=0){this.entries=entries.map(entry=>({...entry,started,lastFrame:null,mesh:null,scenePart:null,failed:false}));this.errors=[];}
    async scene(now,origin,player,textures){
        const batches=[],transparentBatches=[],pickMeshes=[];
        for(const entry of this.entries){
            const {terrain,loc,definition,part,model,level}=entry;
            const dx=(terrain.mapX-origin.mapX)*64,dy=(terrain.mapY-origin.mapY)*64;
            // The draw window is camera-centred: allow its 25 tiles plus the
            // maximum 24-tile orbit and the object's footprint at the edge.
            const radius=49+Math.max(definition.sizeX,definition.sizeY);
            if(entry.failed||Math.max(Math.abs(terrain.mapX*64+loc.x-player.x),Math.abs(terrain.mapY*64+loc.y-player.y))>radius)continue;
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
        return {batches,transparentBatches,pickMeshes};
    }
}
