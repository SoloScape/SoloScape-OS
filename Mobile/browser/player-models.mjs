// Player composition follows pinned BSD TSPS PlayerModelLoader/PlayerComposition.
// See the BSD license in player-config.mjs and player-colors.mjs.
import {IdkType,ObjType} from "./player-config.mjs";
import {PLAYER_BODY_RECOLOR_FROM_1 as from1,PLAYER_BODY_RECOLOR_FROM_2 as from2,
    PLAYER_BODY_RECOLOR_TO_1 as to1,PLAYER_BODY_RECOLOR_TO_2 as to2} from "./player-colors.mjs";
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeModel,buildObjectMesh} from "./scenery-models.mjs";
import {terrainPlane} from "./scene-planes.mjs";
import {sampleTerrain} from "./floor-lighting.mjs";
import {SceneTextures} from "./texture-cache.mjs";
import {NativePlayerAnimations} from "./player-animation.mjs";
import {mapBounded} from "./bounded-work.mjs";
import {activeActorTint,actorTintKey,tintActorMesh} from "./actor-tint.mjs";

export function recolourPlayerModel(source,definition,appearance,custom=null){
    const model={...source,verticesX:source.verticesX.slice(),verticesY:source.verticesY.slice(),verticesZ:source.verticesZ.slice(),
        faceColors:source.faceColors.slice(),faceTextures:source.faceTextures?.slice()};
    const recolours=new Map((definition.recolorFrom??[]).map((n,i)=>[n&65535,(definition.recolorTo[i])&65535]));
    const retextures=new Map((definition.retextureFrom??[]).map((n,i)=>[n,definition.retextureTo[i]]));
    for(let i=0;i<model.faceCount;i++){
        let color=recolours.get(model.faceColors[i])??model.faceColors[i];
        for(const {index,value} of custom?.recolours??[])if(color===(definition.recolorTo?.[index]&65535))color=value;
        for(let c=0;c<5;c++){
            const choice=appearance.colours[c];
            if(color===(from1[c]&65535)&&to1[c][choice]!==undefined)color=to1[c][choice]&65535;
            if(color===(from2[c]&65535)&&to2[c][choice]!==undefined)color=to2[c][choice]&65535;
        }
        model.faceColors[i]=color;
        if(model.faceTextures){
            let texture=retextures.get(model.faceTextures[i])??model.faceTextures[i];
            for(const {index,value} of custom?.retextures??[])if(texture===definition.retextureTo?.[index])texture=value;
            model.faceTextures[i]=texture;
        }
    }
    const female=appearance.gender===1;
    const offsets=female?[definition.womanwearXOff??0,(definition.womanwearYOff??0)+(definition.femaleOffset??0),definition.womanwearZOff??0]:
        [definition.manwearXOff??0,(definition.manwearYOff??0)+(definition.maleOffset??0),definition.manwearZOff??0];
    for(let i=0;i<model.verticesCount;i++){
        model.verticesX[i]=Math.trunc(model.verticesX[i]*(definition.resizeX??128)/128)+offsets[0];
        model.verticesY[i]=Math.trunc(model.verticesY[i]*(definition.resizeY??128)/128)+offsets[1];
        model.verticesZ[i]=Math.trunc(model.verticesZ[i]*(definition.resizeZ??128)/128)+offsets[2];
    }
    return model;
}

export {mergePlayerModels} from "./model-composition.mjs";
import {mergePlayerModels} from "./model-composition.mjs";

export function playerGroundHeight(terrain,x,y,plane){
    const tx=Math.floor(x),ty=Math.floor(y),fx=x-tx,fy=y-ty;
    const bridge=sampleTerrain(terrainPlane(terrain,1),"renderFlags",tx,ty)&2;
    const physicalPlane=plane<3&&bridge?plane+1:plane;
    const view=terrainPlane(terrain,physicalPlane);if(!view)throw new Error("Player plane terrain is unavailable");
    const h=[[tx,ty],[tx+1,ty],[tx,ty+1],[tx+1,ty+1]].map(([a,b])=>sampleTerrain(view,"heights",a,b));
    if(h.some(n=>n===undefined))throw new Error("Player terrain heights are unavailable");
    return {height:(h[0]*(1-fx)+h[1]*fx)*(1-fy)+(h[2]*(1-fx)+h[3]*fx)*fy,view};
}
// Animated poses are immutable. Cache per-pose rotation arrays and the
// expensive lit/triangulated mesh. Retained actors translate that geometry on
// the GPU; legacy consumers receive immutable region-local vertex snapshots.
const actorRotations=new WeakMap(),actorTileMeshes=new WeakMap();
export function rotatedActorModel(model,orientation=0){
    let entries=actorRotations.get(model);
    if(!entries){entries=new Map();actorRotations.set(model,entries);}
    if(entries.has(orientation))return entries.get(orientation);
    const angle=orientation*Math.PI/1024,sin=Math.sin(angle),cos=Math.cos(angle);
    const rotated={...model,verticesX:new Int32Array(model.verticesCount),
        verticesZ:new Int32Array(model.verticesCount)};
    for(let i=0;i<model.verticesCount;i++){
        rotated.verticesX[i]=Math.trunc(model.verticesX[i]*cos+model.verticesZ[i]*sin);
        rotated.verticesZ[i]=Math.trunc(model.verticesZ[i]*cos-model.verticesX[i]*sin);
    }
    if(entries.size>=8)entries.delete(entries.keys().next().value);
    entries.set(orientation,rotated);
    return rotated;
}
export function buildPlayerMesh(model,terrain,player,{textures=new Map(),size=1,ambient=0,contrast=82,renderTime=NaN,retained=false}={}){
    if(!Number.isInteger(size)||size<1||size>8)throw new Error("Invalid actor footprint");
    const x=player.x-terrain.mapX*64,y=player.y-terrain.mapY*64;
    const tx=Math.floor(x),ty=Math.floor(y),ground=playerGroundHeight(terrain,x+size/2,y+size/2,player.plane);
    const rotated=rotatedActorModel(model,player.orientation??0);
    const sx=tx+(size>>1),ex=tx+((size+1)>>1),sy=ty+(size>>1),ey=ty+((size+1)>>1);
    const h=[[sx,sy],[ex,sy],[sx,ey],[ex,ey]].map(([a,b])=>sampleTerrain(ground.view,"heights",a,b));
    if(h.some(n=>n===undefined))throw new Error("Player footprint terrain is unavailable");
    const center=(h[0]+h[1]+h[2]+h[3])>>2;
    let entries=actorTileMeshes.get(rotated);
    if(!entries){entries=new Map();actorTileMeshes.set(rotated,entries);}
    // Actors never contour to terrain: lighting and UVs depend on the pose,
    // facing and material only. Retained geometry can cross tiles/regions;
    // its original anchor is removed by the per-instance translation.
    const key=retained?["retained",size,ambient,contrast].join(":"):
        [tx,ty,ground.view.plane,size,ambient,contrast].join(":");
    let cached=entries.get(key);
    if(!cached||(!retained&&cached.terrain!==terrain)||cached.textures!==textures){
        const mesh=buildObjectMesh(ground.view,{x:tx,y:ty,rotation:0},
            {sizeX:size,sizeY:size,isRotated:false,modelSizeX:128,modelSizeHeight:128,modelSizeY:128,offsetX:0,offsetHeight:0,offsetY:0,
                ambient,contrast,recolors:[],retextures:[],contour:-1},
            {type:10,rotation:0,dx:0,dy:0},[rotated],{textures});
        cached={terrain:retained?null:terrain,textures,mesh,tx,ty,center};
        if(entries.size>=16)entries.delete(entries.keys().next().value);
        entries.set(key,cached);
    }
    const mesh=cached.mesh,dx=x-tx,dz=y-ty,dy=-(ground.height-center)/128;
    if(retained){
        const tint=activeActorTint(player.tinting??player.tint,renderTime-player.tintStartedAt),key=actorTintKey(tint);
        if(!cached.retained||cached.tintKey!==key||cached.level!==player.plane){
            cached.retained=tintActorMesh({vertices:mesh.vertices,
                texturedBatches:Array.from(mesh.texturedBatches,([texture,vertices])=>({level:player.plane,texture,vertices})),
                transparentBatches:mesh.transparentBatches.map(b=>({...b,level:player.plane})),textures},tint);
            cached.tintKey=key;cached.level=player.plane;
        }
        return {...cached.retained,offset:[x-cached.tx,-(ground.height-cached.center)/128,y-cached.ty]};
    }
    const shift=source=>{
        const vertices=source.slice();
        for(let i=0;i<vertices.length;i+=6){
            vertices[i]+=dx;vertices[i+1]+=dy;vertices[i+2]+=dz;
        }
        return vertices;
    };
    return tintActorMesh({vertices:shift(mesh.vertices),
        texturedBatches:Array.from(mesh.texturedBatches,([texture,vertices])=>
            ({level:player.plane,texture,vertices:shift(vertices)})),
        transparentBatches:mesh.transparentBatches.map(b=>
            ({...b,level:player.plane,vertices:shift(b.vertices)})),textures},activeActorTint(player.tinting??player.tint,renderTime-player.tintStartedAt));
}

export class NativePlayerModels {
    constructor(cache){this.cache=cache;this.configs=new Map();this.models=new Map();this.appearances=new Map();this.textures=new SceneTextures(cache);this.animations=new NativePlayerAnimations(cache);}
    async config(group,id,Type){
        if(!this.configs.has(group))this.configs.set(group,(async()=>{
            const table=await verifiedCatalog(this.cache,2),ids=table.fileIdsForGroup.get(group);
            if(!ids)throw new Error("Missing player configuration group "+group);
            return unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(2,group)),ids,new Set(ids),{maxFiles:100000});
        })());
        const bytes=(await this.configs.get(group)).get(id);if(!bytes)throw new Error("Missing player configuration "+group+":"+id);
        return new Type(id).decode(bytes);
    }
    model(id){
        if(!this.models.has(id))this.models.set(id,this.cache.loadGroup(7,id).then(decodeGroup).then(decodeModel));
        return this.models.get(id);
    }
    composition(appearance){
        const key=JSON.stringify([appearance.equipment,appearance.colours,appearance.gender,appearance.customisations,appearance.transformedNpcId]);
        if(!this.appearances.has(key)){
            if(this.appearances.size>=16)this.appearances.delete(this.appearances.keys().next().value);
            const pending=(async()=>{
                if(appearance.transformedNpcId!==-1)throw new Error("NPC-transformed player models are unavailable");
                // Equipment slots are independent JS5 downloads. Fetch a few
                // concurrently but flatten in the original slot/model order:
                // welding and recolours remain bit-for-bit deterministic.
                const partSlots=[];
                const loaded=await mapBounded(Array.from({length:12},(_,slot)=>slot),6,async slot=>{
                        const code=appearance.equipment[slot];if(code<256)return [];
                        const item=code>=2048;
                        const d=await this.config(item?10:3,code-(item?2048:256),item?ObjType:IdkType);
                        const prefix=appearance.gender===1?"female":"male";
                        const primary=appearance.customisations?.[slot]?.wearModels?.[appearance.gender===1?1:0]??d[prefix+"Model"];
                        const ids=item?[primary,d[prefix+"Model1"],d[prefix+"Model2"]].filter(id=>id>=0&&id<0x7fffffff):d.modelIds??[];
                        const models=await Promise.all(ids.map(id=>this.model(id)));
                        return models.map(model=>recolourPlayerModel(model,d,appearance,appearance.customisations?.[slot]));
                    });
                partSlots.push(...loaded);
                const model=mergePlayerModels(partSlots.flat());
                const textures=[...new Set(model.faceTextures)].filter(id=>id>=0);
                const loadedTextures=await mapBounded(textures,6,id=>this.textures.load(id));
                for(let i=0;i<textures.length;i++)if(!loadedTextures[i])
                    throw new Error("Player model texture "+textures[i]+" unavailable");
                return model;
            })();
            this.appearances.set(key,pending);pending.catch(()=>this.appearances.delete(key));
        }
        return this.appearances.get(key);
    }
}
