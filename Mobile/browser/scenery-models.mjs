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
import { CacheModel } from "./model-codec.mjs";
import { decodeObjectDefinition } from "./object-definitions.mjs";
import { loadRegionLocations, verifiedCatalog, decodeGroup } from "./location-cache.mjs";
import { unpackArchiveFiles } from "./floor-materials.mjs";
import { sampleTerrain, adjustFloorLight } from "./floor-lighting.mjs";
import {computeTextureCoords} from "./texture-mapper.mjs";
import {SceneTextures} from "./texture-cache.mjs";
import {terrainPlane,sceneLevel} from "./scene-planes.mjs";
import {mapBounded} from "./bounded-work.mjs";

export function decodeModel(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<18||bytes.length>2*1024*1024)throw new Error("Invalid model length");
    const model=new CacheModel();
    model.decode(new Int8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength));
    if(model.verticesCount>65535||model.faceCount>65535)throw new Error("Model exceeds geometry limit");
    for(const indices of [model.indices1,model.indices2,model.indices3]){
        if(!indices||indices.some(i=>i<0||i>=model.verticesCount))throw new Error("Model face index out of bounds");
    }
    if(model.faceTextures){
        for(let i=0;i<model.faceCount;i++){
            const coord=model.textureCoords?.[i]??-1;
            if(coord!==-1){
                const t=coord&255,type=model.textureRenderTypes?.[t]??0;
                if(t>=model.textureFaceCount||type<0||type>3)throw new Error("Model texture mapping out of bounds");
                if(type===0&&[model.textureMappingP[t],model.textureMappingM[t],model.textureMappingN[t]]
                    .some(v=>v<0||v>=model.verticesCount))throw new Error("Model texture vertex out of bounds");
            }
        }
        model.textureUvs=computeTextureCoords({isSd:()=>true},model);
    }
    return model;
}

/** SceneBuilder shape-to-model mapping, including two-sided corners/decorations. */
export function placementParts(loc,definition,wallDisplacement=16){
    const r=loc.rotation,s=loc.shape;
    let parts;
    if(s===2)parts=[{type:2,rotation:r+4},{type:2,rotation:(r+1)&3}];
    else if(s===11)parts=[{type:10,rotation:r,diagonal:true}];
    else if(s===6)parts=[{type:4,rotation:r+4}];
    else if(s===7)parts=[{type:4,rotation:((r+2)&3)+4}];
    else if(s===8)parts=[{type:4,rotation:r+4},{type:4,rotation:((r+2)&3)+4}];
    else parts=[{type:s===5?4:s,rotation:r}];
    for(const p of parts){
        p.dx=0;p.dy=0;
        if(s===5){p.dx=wallDisplacement*[1,0,-1,0][r];p.dy=wallDisplacement*[0,-1,0,1][r];}
        if(s===6||s===8){p.dx=(wallDisplacement>>1)*[1,-1,-1,1][r];p.dy=(wallDisplacement>>1)*[-1,-1,1,1][r];}
        p.modelIds=definition.types?definition.models.filter((_,i)=>definition.types[i]===p.type):
            (p.type===10?definition.models:[]);
    }
    return parts;
}

function heightAt(terrain,x,y){
    const tx=Math.floor(x),ty=Math.floor(y),fx=x-tx,fy=y-ty;
    const h=[[tx,ty],[tx+1,ty],[tx,ty+1],[tx+1,ty+1]].map(([a,b])=>sampleTerrain(terrain,"heights",a,b));
    if(h.some(n=>n===undefined))throw new Error("Object extends beyond available terrain heights");
    // Java bilinear terrain height interpolation uses integer model units.
    const wx=Math.floor(fx*128),wy=Math.floor(fy*128);
    const south=(h[0]*(128-wx)+h[1]*wx)>>7,north=(h[2]*(128-wx)+h[3]*wx)>>7;
    return (south*(128-wy)+north*wy)>>7;
}

function transformPart(model,d,part){
    const mirror=d.isRotated !== (part.rotation>3);
    const vertices=[];
    for(let i=0;i<model.verticesCount;i++){
        let x=model.verticesX[i],y=model.verticesY[i],z=model.verticesZ[i];
        if(mirror)z=-z;
        if(part.type===4&&part.rotation>3){
            const sin=46340,cos=46340,oldX=x;
            x=(x*cos+z*sin)>>16;z=(z*cos-oldX*sin)>>16;x+=45;z-=45;
        }
        const r=part.rotation&3;
        if(r===1)[x,z]=[z,-x];else if(r===2){x=-x;z=-z;}else if(r===3)[x,z]=[-z,x];
        x=Math.trunc(x*d.modelSizeX/128)+d.offsetX;
        y=Math.trunc(y*d.modelSizeHeight/128)+d.offsetHeight;
        z=Math.trunc(z*d.modelSizeY/128)+d.offsetY;
        if(part.diagonal){const oldX=x;x=(x*46340+z*46340)>>16;z=(z*46340-oldX*46340)>>16;}
        vertices.push([x,y,z]);
    }
    const recolors=new Map(d.recolors),retextures=new Map(d.retextures);
    const uvs=model.textureUvs??computeTextureCoords({isSd:()=>true},model);
    const faces=[];
    for(let i=0;i<model.faceCount;i++){
        let texture=model.faceTextures?.[i]??-1;
        texture=retextures.get(texture)??texture;
        let indices=[model.indices1[i],model.indices2[i],model.indices3[i]];
        let uv=uvs?Array.from(uvs.subarray(i*6,i*6+6)):null;
        if(mirror){indices.reverse();if(uv)uv=[...uv.slice(4,6),...uv.slice(2,4),...uv.slice(0,2)];}
        faces.push({indices,color:recolors.get(model.faceColors[i])??model.faceColors[i],
            priority:model.faceRenderPriorities?.[i]??model.priority??0,
            type:model.faceRenderTypes?.[i]??0,alpha:model.faceAlphas?.[i]??0,texture,uv});
    }
    return {vertices,faces};
}

/** Emit the same six-float position/packed-HSL layout as ground geometry. */
export function buildObjectMesh(terrain,loc,d,part,models,{textures=new Map()}={}){
    let sizeX=d.sizeX,sizeY=d.sizeY;
    if(loc.rotation&1)[sizeX,sizeY]=[sizeY,sizeX];
    const sx=loc.x+(sizeX>>1),ex=loc.x+((sizeX+1)>>1),sy=loc.y+(sizeY>>1),ey=loc.y+((sizeY+1)>>1);
    const heights=[[sx,sy],[ex,sy],[sx,ey],[ex,ey]].map(([x,y])=>sampleTerrain(terrain,"heights",x,y));
    if(heights.some(h=>h===undefined))throw new Error("Object footprint lacks terrain heights");
    const centerHeight=(heights[0]+heights[1]+heights[2]+heights[3])>>2;
    const centerX=loc.x+sizeX/2+part.dx/128,centerY=loc.y+sizeY/2+part.dy/128;
    // Weld multipart coincident vertices for their shared smooth normals.
    const vertices=[],faces=[],welded=new Map();
    for(const model of models){
        const transformed=transformPart(model,d,part),mapping=[];
        for(const v of transformed.vertices){
            const key=v.join(",");let index=welded.get(key);
            if(index===undefined){index=vertices.length;vertices.push(v);welded.set(key,index);}
            mapping.push(index);
        }
        for(const f of transformed.faces)faces.push({...f,indices:f.indices.map(i=>mapping[i])});
    }
    const normals=vertices.map(()=>[0,0,0,0]),faceNormals=[];
    for(const f of faces){
        const [a,b,c]=f.indices.map(i=>vertices[i]);
        const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
        let nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0];
        while(Math.max(Math.abs(nx),Math.abs(ny),Math.abs(nz))>8192){nx>>=1;ny>>=1;nz>>=1;}
        const length=Math.max(1,Math.trunc(Math.sqrt(nx*nx+ny*ny+nz*nz)));
        const normal=[nx,ny,nz].map(n=>Math.trunc(n*256/length));faceNormals.push(normal);
        if(f.type===0)for(const i of f.indices){for(let k=0;k<3;k++)normals[i][k]+=normal[k];normals[i][3]++;}
    }
    const intensity=(Math.trunc(Math.sqrt(5100))*(768+d.contrast))>>8;
    if(intensity<=0)throw new Error("Invalid object lighting contrast");
    const dot=n=>-50*n[0]-10*n[1]-50*n[2],ambient=64+d.ambient;
    const out=[],textured=new Map(),maxHeight=vertices.reduce((max,v)=>Math.max(max,-v[1]),1);
    let omittedFaces=0;
    for(let i=0;i<faces.length;i++){
        const f=faces[i];
        // Keep cache priority and a small scenery/decal layer in the otherwise
        // unused fractional colour bits. Both shaders decode it before lighting.
        const layer=1+(loc.shape>=4&&loc.shape<=8||loc.shape===22?1:0)+Math.max(0,Math.min(11,f.priority));
        if(f.alpha!==0||f.type>1||f.type<0||f.texture>=0&&
            (!textures.has(f.texture)||!f.uv?.every(Number.isFinite))){omittedFaces++;continue;}
        let target=out;
        if(f.texture>=0){
            if(!textured.has(f.texture))textured.set(f.texture,[]);
            target=textured.get(f.texture);
        }
        for(let corner=0;corner<3;corner++){
            const index=f.indices[corner];
            const [vx,vy,vz]=vertices[index],x=centerX+vx/128,z=centerY+vz/128;
            let groundOffset=0;
            if(d.contour===0)groundOffset=heightAt(terrain,x,z)-centerHeight;
            else if(d.contour>0){
                const ratio=Math.trunc(-vy*65536/maxHeight);
                if(ratio<d.contour)groundOffset=Math.trunc((d.contour-ratio)*(heightAt(terrain,x,z)-centerHeight)/d.contour);
            }
            const normal=f.type===1?faceNormals[i]:normals[index];
            const denominator=f.type===1?intensity+(intensity>>1):intensity*Math.max(1,normal[3]);
            const light=ambient+Math.trunc(dot(normal)/denominator);
            target.push(x-31.5,-(centerHeight+vy+groundOffset)/128,z-31.5,
                ...(f.texture>=0?[Math.max(2,Math.min(126,light))+layer/32,f.uv[corner*2],f.uv[corner*2+1]]:
                    [adjustFloorLight(f.color,light)+layer/32,0,0]));
        }
    }
    return {vertices:new Float32Array(out),texturedBatches:new Map(Array.from(textured,([id,v])=>[id,new Float32Array(v)])),omittedFaces};
}

export async function loadStaticScenery(cache,terrain,{key,isCurrent=()=>true,onProgress=()=>{},textureSource=new SceneTextures(cache,{isCurrent}),modelStore=new Map()}={}){
    const source=await loadRegionLocations(cache,terrain,{key});
    if(!isCurrent())return null;
    const table=await verifiedCatalog(cache,2),ids=new Set(source.locations.map(l=>l.id));
    if(ids.size>4096)throw new Error("Scene definition count exceeds limit");
    const files=table.fileIdsForGroup.get(6);
    if(!files)throw new Error("Object configuration group 2:6 is missing");
    const definitions=unpackArchiveFiles(await decodeGroup(await cache.loadGroup(2,6)),files,ids,{maxFiles:100000});
    const decoded=new Map(),errors=[];
    for(const [id,bytes] of definitions){try{decoded.set(id,decodeObjectDefinition(bytes,id));}catch(error){errors.push({id,reason:error.message});}}
    const models=new Map(),modelErrors=new Set(),meshes=Array.from({length:4},()=>[]),placements=[],pickMeshes=[],walls=new Map(),textured=new Map();
    const planeViews=Array.from({length:4},(_,p)=>terrainPlane(terrain,p));
    let rendered=0,skipped=0,omittedFaces=0,totalFloats=0;
    for(const loc of source.locations){if(loc.shape<=3){const d=decoded.get(loc.id);if(d)walls.set(`${loc.plane},${loc.x},${loc.y}`,d.decorDisplacement);}}
    // Fetch independent, CRC-checked model archives concurrently rather than
    // serially awaiting each new model in the placement/triangle loop. Share
    // decoded promises across overlapping regions in this rebuild only.
    const requiredModels=new Set();
    for(const loc of source.locations){
        if(!isCurrent())return null;
        const d=decoded.get(loc.id);
        if(!planeViews[loc.plane]||!d||d.transforms||d.seqId!==-1||!d.sizeX||!d.sizeY)continue;
        const parts=placementParts(loc,d,walls.get(`${loc.plane},${loc.x},${loc.y}`));
        for(const part of parts)for(const id of part.modelIds)requiredModels.add(id);
        if(requiredModels.size>2048)throw new Error("Scene model count exceeds limit");
    }
    await mapBounded(requiredModels,6,async id=>{
        if(!isCurrent())return;
        if(!modelStore.has(id)){
            modelStore.set(id,Promise.resolve().then(()=>cache.loadGroup(7,id)).then(decodeGroup).then(decodeModel));
        }
        try{models.set(id,await modelStore.get(id));}
        catch(error){modelErrors.add(id);errors.push({model:id,reason:error.message});}
    });
    if(!isCurrent())return null;
    for(const loc of source.locations){
        if(!isCurrent())return null;
        const view=planeViews[loc.plane],level=sceneLevel(terrain,loc.plane,loc.x,loc.y);
        const d=decoded.get(loc.id);
        // Dynamic transformations depend on authenticated varp/varbit state.
        if(!view||!d||d.transforms||d.seqId!==-1||!d.sizeX||!d.sizeY){skipped++;continue;}
        const parts=placementParts(loc,d,walls.get(`${loc.plane},${loc.x},${loc.y}`));
        let drawn=false;
        const pickParts=[];
        for(const part of parts){
            if(!part.modelIds.length)continue;
            const components=[];
            for(const id of part.modelIds){
                if(!isCurrent())return null;
                const model=models.get(id);if(model)components.push(model);
            }
            if(components.length!==part.modelIds.length)continue;
            const textureIds=new Set(),retextures=new Map(d.retextures);
            for(const model of components)for(const id of model.faceTextures??[])if(id>=0)textureIds.add(retextures.get(id)??id);
            await mapBounded(textureIds,4,id=>isCurrent()?textureSource.load(id):null);
            if(!isCurrent())return null;
            try{
                const mesh=buildObjectMesh(view,loc,d,part,components,{textures:textureSource.textures});omittedFaces+=mesh.omittedFaces;
                totalFloats+=mesh.vertices.length;
                meshes[level].push(mesh.vertices);if(mesh.vertices.length)pickParts.push(mesh.vertices);
                drawn ||= mesh.vertices.length>0;
                for(const [id,vertices] of mesh.texturedBatches){
                    const key=`${level}:${id}`;
                    if(!textured.has(key))textured.set(key,{level,texture:id,chunks:[]});
                    textured.get(key).chunks.push(vertices);totalFloats+=vertices.length;drawn ||=vertices.length>0;
                    if(vertices.length)pickParts.push(vertices);
                }
            }catch(error){errors.push({id:loc.id,x:loc.x,y:loc.y,reason:error.message});}
        }
        if(totalFloats>24_000_000)throw new Error("Scene mesh exceeds limit");
        if(drawn){
            rendered++;placements.push({id:loc.id,name:d.name,x:loc.x,y:loc.y,shape:loc.shape,rotation:loc.rotation});
            // Individual original geometry is retained for exact pixel-triangle
            // object picking, including textured-only locs, on mouse actions.
            pickMeshes.push({id:loc.id,name:d.name,x:loc.x,y:loc.y,plane:loc.plane,level,
                actions:d.actions??[],chunks:pickParts});
        }else skipped++;
        if((rendered+skipped)%100===0)onProgress({rendered,skipped,models:models.size});
    }
    if(!isCurrent())return null;
    const join=chunks=>{const out=new Float32Array(chunks.reduce((n,v)=>n+v.length,0));let at=0;for(const v of chunks){out.set(v,at);at+=v.length;}return out;};
    const levelCounts=meshes.map(chunks=>chunks.reduce((n,v)=>n+v.length/6,0));
    const vertices=join(meshes.flat()),texturedBatches=Array.from(textured.values(),b=>({level:b.level,texture:b.texture,vertices:join(b.chunks)}));
    errors.push(...textureSource.errors);
    return {vertices,levelCounts,texturedBatches,textures:textureSource.textures,placements,rendered,skipped,omittedFaces,models:models.size,definitions:decoded.size,
        locations:source.locations.length,upperPlaneLocations:source.locations.filter(l=>l.plane>0).length,
        locationGroup:source.group,keyUsed:source.keyUsed,errors,
        pickMeshes:pickMeshes.map(({chunks,...loc})=>({...loc,vertices:join(chunks)}))};
}
