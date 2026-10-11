// Original cache chathead composition, using the native actor model/animation loaders.
import {IdkType,ObjType} from "./player-config.mjs";
import {mergePlayerModels,recolourPlayerModel} from "./player-models.mjs";
import {NativeNpcModels,recolourNpcPart} from "./npc-models.mjs";
import {HSL_PALETTE,adjustFloorLight} from "./floor-lighting.mjs";

export class NativeDialogueModels {
    constructor(models,{appearance=()=>null,npc=()=>null}={}){
        this.models=models;this.appearance=appearance;this.npc=npc;this.npcs=new NativeNpcModels(models);this.cache=new Map();
    }
    async load(widget){
        const appearance=this.appearance();
        let type=widget.modelId,kind=widget.modelKind;
        if(kind==="npc-active"){type=this.npc(type)?.type;if(type===undefined)throw new Error("Dialogue NPC is no longer synchronized");kind="npc";}
        if(kind==="player"&&appearance?.transformedNpcId>=0){kind="npc";type=appearance.transformedNpcId;}
        if(!["player","npc"].includes(kind))throw new Error("Unsupported interface model kind");
        if(kind==="player"&&!appearance)throw new Error("Player chathead awaits server appearance");
        const key=kind+":"+(kind==="npc"?type:JSON.stringify([appearance.equipment,appearance.colours,appearance.gender,appearance.customisations]));
        if(!this.cache.has(key)){
            if(this.cache.size>=16)this.cache.delete(this.cache.keys().next().value);
            const promise=(async()=>{
                const parts=[];
                if(kind==="npc"){
                    const d=await this.npcs.definition(type);
                    if(d.transforms)throw new Error("Transformed NPC chathead requires varbit resolution");
                    if(!d.chatheadIds?.length)throw new Error("NPC cache has no chathead models");
                    for(const id of d.chatheadIds)parts.push(recolourNpcPart(await this.models.model(id),{...d,widthScale:128,heightScale:128,modelOffsets:[]}));
                }else for(let slot=0;slot<12;slot++){
                    const code=appearance.equipment[slot];if(code<256)continue;
                    const item=code>=2048,d=await this.models.config(item?10:3,code-(item?2048:256),item?ObjType:IdkType);
                    const prefix=appearance.gender===1?"female":"male";
                    const primary=appearance.customisations?.[slot]?.headModels?.[appearance.gender===1?1:0]??d[prefix+"HeadModel"];
                    const ids=(item?[primary,d[prefix+"HeadModel2"]]:d.ifModelIds??[]).filter(id=>id>=0&&id!==65535&&id!==0xffffffff);
                    for(const id of ids)parts.push(recolourPlayerModel(await this.models.model(id),
                        {...d,resizeX:128,resizeY:128,resizeZ:128,manwearXOff:0,manwearYOff:0,manwearZOff:0,
                            womanwearXOff:0,womanwearYOff:0,womanwearZOff:0,maleOffset:0,femaleOffset:0},appearance,appearance.customisations?.[slot]));
                }
                if(!parts.length)throw new Error("Cache chathead has no available parts");
                const model=mergePlayerModels(parts);
                for(const id of new Set(model.faceTextures))if(id>=0)await this.models.textures.load(id);
                return {model,textures:this.models.textures.textures};
            })();this.cache.set(key,promise);promise.catch(()=>this.cache.delete(key));
        }
        return this.cache.get(key);
    }
    async pose(source,widget,elapsed){
        if(widget.sequenceId<0||widget.sequenceId===undefined)return source;
        return {...source,model:await this.models.animations.pose(source.model,widget.sequenceId,elapsed)};
    }
}

// Bounded software rasterization into the real widget's inherited clipping
// rectangle. Perspective UV interpolation and a depth buffer preserve overlapping
// head geometry without relying on approximate CSS artwork or a body-model crop.
export function rasterizeChathead({model,textures=new Map()},widget,width,height,cx,cy){
    if(width<1||height<1||width*height>512*512||model.faceCount>32768)throw new Error("Chathead raster budget exceeded");
    const pixels=new Uint8ClampedArray(width*height*4),depth=new Float64Array(width*height).fill(Infinity);
    const angle=n=>(n??0)*Math.PI/1024,rx=angle(widget.rotationX),ry=angle(widget.rotationY),rz=angle(widget.rotationZ);
    const zoom=widget.modelZoom||796,heightModel=Math.max(0,...model.verticesY.map(y=>-y));
    const vertices=[];
    for(let i=0;i<model.verticesCount;i++){
        let x=model.verticesX[i],y=model.verticesY[i],z=model.verticesZ[i];
        [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];
        [x,z]=[x*Math.cos(ry)+z*Math.sin(ry),z*Math.cos(ry)-x*Math.sin(ry)];
        [y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];
        y+=heightModel/2+Math.sin(rx)*zoom+(widget.modelOffsetY??0);z+=Math.cos(rx)*zoom;
        x+=widget.modelOffsetX??0;
        vertices.push({x:cx+x*512/z,y:cy+y*512/z,z});
    }
    for(let f=0;f<model.faceCount;f++){
        if((model.faceRenderTypes?.[f]??0)>1)continue;
        const ids=[model.indices1[f],model.indices2[f],model.indices3[f]],v=ids.map(i=>vertices[i]);
        if(v.some(p=>p.z<50||![p.x,p.y,p.z].every(Number.isFinite)))continue;
        const [a,b,c]=v,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        if(Math.abs(area)<1e-6)continue;
        const xyz=ids.map(i=>[model.verticesX[i],model.verticesY[i],model.verticesZ[i]]),ab=xyz[1].map((n,i)=>n-xyz[0][i]),ac=xyz[2].map((n,i)=>n-xyz[0][i]);
        const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...normal)||1;
        const light=Math.max(2,Math.min(126,64+Math.trunc((-50*normal[0]-10*normal[1]-50*normal[2])*256/(length*213))));
        const color=HSL_PALETTE[adjustFloorLight(model.faceColors[f],light)],texture=textures.get(model.faceTextures?.[f]??-1);
        if((model.faceTextures?.[f]??-1)>=0&&!texture)continue;
        const uv=model.textureUvs?.subarray(f*6,f*6+6),alpha=1-Math.max(0,Math.min(255,model.faceAlphas?.[f]??0))/255;
        if(!alpha)continue;
        const minX=Math.max(0,Math.floor(Math.min(...v.map(p=>p.x)))),maxX=Math.min(width-1,Math.ceil(Math.max(...v.map(p=>p.x)))),
            minY=Math.max(0,Math.floor(Math.min(...v.map(p=>p.y)))),maxY=Math.min(height-1,Math.ceil(Math.max(...v.map(p=>p.y))));
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
            const px=x+.5,py=y+.5,w0=((b.x-px)*(c.y-py)-(b.y-py)*(c.x-px))/area,
                w1=((c.x-px)*(a.y-py)-(c.y-py)*(a.x-px))/area,w2=1-w0-w1;
            if(Math.min(w0,w1,w2)<0)continue;
            const iz=w0/a.z+w1/b.z+w2/c.z,z=1/iz,at=y*width+x;if(z>=depth[at])continue;
            let rgb=[color>>>16&255,color>>>8&255,color&255],opacity=alpha;
            if(texture&&uv?.length===6){
                const u=(w0*uv[0]/a.z+w1*uv[2]/b.z+w2*uv[4]/c.z)/iz,t=(w0*uv[1]/a.z+w1*uv[3]/b.z+w2*uv[5]/c.z)/iz;
                const size=texture.size,tx=((Math.floor(u*size)%size)+size)%size,ty=((Math.floor(t*size)%size)+size)%size,offset=(ty*size+tx)*4;
                opacity*=texture.pixels[offset+3]/255;if(!opacity)continue;
                rgb=[0,1,2].map(k=>Math.min(255,texture.pixels[offset+k]*light/128));
            }
            depth[at]=z;
            const previous=pixels[at*4+3]/255,out=opacity+previous*(1-opacity);
            for(let k=0;k<3;k++)pixels[at*4+k]=(rgb[k]*opacity+pixels[at*4+k]*previous*(1-opacity))/out;
            pixels[at*4+3]=255*out;
        }
    }
    return pixels;
}
