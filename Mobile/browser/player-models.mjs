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

// All body parts share skeleton pivots; weld BEFORE applying a frame.
export function mergePlayerModels(parts){
    const xyz=[[],[],[]],skins=[],faces=[[],[],[]],colors=[],textures=[],alphas=[],types=[],faceSkins=[],uvs=[],welded=new Map();
    for(const part of parts){
        const mapping=[];
        for(let i=0;i<part.verticesCount;i++){
            const coords=[part.verticesX[i],part.verticesY[i],part.verticesZ[i]],skin=part.vertexSkins?.[i]??-1;
            const key=coords.join(",")+","+skin;let vertex=welded.get(key);
            if(vertex===undefined){vertex=skins.length;welded.set(key,vertex);coords.forEach((n,k)=>xyz[k].push(n));skins.push(skin);}
            mapping.push(vertex);
        }
        for(let i=0;i<part.faceCount;i++){
            [part.indices1[i],part.indices2[i],part.indices3[i]].forEach((n,k)=>faces[k].push(mapping[n]));
            colors.push(part.faceColors[i]);textures.push(part.faceTextures?.[i]??-1);alphas.push(part.faceAlphas?.[i]??0);
            types.push(part.faceRenderTypes?.[i]??0);faceSkins.push(part.faceSkins?.[i]??-1);
            uvs.push(...(part.textureUvs?.subarray(i*6,i*6+6)??[0,0,0,0,0,0]));
        }
    }
    if(!skins.length||skins.length>65535||colors.length>65535)throw new Error("Invalid composed player model size");
    return {verticesCount:skins.length,faceCount:colors.length,
        verticesX:Int32Array.from(xyz[0]),verticesY:Int32Array.from(xyz[1]),verticesZ:Int32Array.from(xyz[2]),vertexSkins:Int32Array.from(skins),
        indices1:Int32Array.from(faces[0]),indices2:Int32Array.from(faces[1]),indices3:Int32Array.from(faces[2]),
        faceColors:Uint16Array.from(colors),faceTextures:Int16Array.from(textures),faceAlphas:Int32Array.from(alphas),
        faceRenderTypes:Int8Array.from(types),faceSkins:Int32Array.from(faceSkins),textureUvs:Float32Array.from(uvs)};
}

export function playerGroundHeight(terrain,x,y,plane){
    const tx=Math.floor(x),ty=Math.floor(y),fx=x-tx,fy=y-ty;
    const bridge=sampleTerrain(terrainPlane(terrain,1),"renderFlags",tx,ty)&2;
    const physicalPlane=plane<3&&bridge?plane+1:plane;
    const view=terrainPlane(terrain,physicalPlane);if(!view)throw new Error("Player plane terrain is unavailable");
    const h=[[tx,ty],[tx+1,ty],[tx,ty+1],[tx+1,ty+1]].map(([a,b])=>sampleTerrain(view,"heights",a,b));
    if(h.some(n=>n===undefined))throw new Error("Player terrain heights are unavailable");
    return {height:(h[0]*(1-fx)+h[1]*fx)*(1-fy)+(h[2]*(1-fx)+h[3]*fx)*fy,view};
}
export function buildPlayerMesh(model,terrain,player,{textures=new Map()}={}){
    const x=player.x-terrain.mapX*64,y=player.y-terrain.mapY*64;
    const tx=Math.floor(x),ty=Math.floor(y),ground=playerGroundHeight(terrain,x+.5,y+.5,player.plane);
    const angle=(player.orientation??0)*Math.PI/1024,sin=Math.sin(angle),cos=Math.cos(angle);
    const rotated={...model,verticesX:new Int32Array(model.verticesCount),verticesZ:new Int32Array(model.verticesCount)};
    for(let i=0;i<model.verticesCount;i++){
        rotated.verticesX[i]=Math.trunc(model.verticesX[i]*cos+model.verticesZ[i]*sin);
        rotated.verticesZ[i]=Math.trunc(model.verticesZ[i]*cos-model.verticesX[i]*sin);
    }
    const h=[[tx,ty],[tx+1,ty],[tx,ty+1],[tx+1,ty+1]].map(([a,b])=>sampleTerrain(ground.view,"heights",a,b));
    if(h.some(n=>n===undefined))throw new Error("Player footprint terrain is unavailable");
    const center=(h[0]+h[1]+h[2]+h[3])>>2;
    const mesh=buildObjectMesh(ground.view,{x:tx,y:ty,rotation:0},
        {sizeX:1,sizeY:1,isRotated:false,modelSizeX:128,modelSizeHeight:128,modelSizeY:128,offsetX:0,offsetHeight:0,offsetY:0,
            ambient:0,contrast:82,recolors:[],retextures:[],contour:-1},
        {type:10,rotation:0,dx:0,dy:0},[rotated],{textures});
    const shift=vertices=>{for(let i=0;i<vertices.length;i+=6){vertices[i]+=x-tx;vertices[i+1]-=(ground.height-center)/128;vertices[i+2]+=y-ty;}};
    shift(mesh.vertices);for(const v of mesh.texturedBatches.values())shift(v);
    return {vertices:mesh.vertices,texturedBatches:Array.from(mesh.texturedBatches,([texture,vertices])=>({level:player.plane,texture,vertices})),textures};
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
                const parts=[];
                for(let slot=0;slot<12;slot++){
                    const code=appearance.equipment[slot];if(code<256)continue;
                    const item=code>=2048;
                    const d=await this.config(item?10:3,code-(item?2048:256),item?ObjType:IdkType);
                    const prefix=appearance.gender===1?"female":"male";
                    const primary=appearance.customisations?.[slot]?.wearModels?.[appearance.gender===1?1:0]??d[prefix+"Model"];
                    const ids=item?[primary,d[prefix+"Model1"],d[prefix+"Model2"]].filter(id=>id>=0&&id<0x7fffffff):d.modelIds??[];
                    for(const id of ids)parts.push(recolourPlayerModel(await this.model(id),d,appearance,appearance.customisations?.[slot]));
                }
                const model=mergePlayerModels(parts);
                for(const id of new Set(model.faceTextures))if(id>=0)await this.textures.load(id);
                return model;
            })();
            this.appearances.set(key,pending);pending.catch(()=>this.appearances.delete(key));
        }
        return this.appearances.get(key);
    }
}
