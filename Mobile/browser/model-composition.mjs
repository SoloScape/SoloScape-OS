// BSD-2-Clause TSPS composition; see player-config.mjs for the licence.
// All body parts share skeleton pivots; weld BEFORE applying a frame.
export function mergePlayerModels(parts){
    const xyz=[[],[],[]],skins=[],faces=[[],[],[]],colors=[],textures=[],alphas=[],types=[],priorities=[],faceSkins=[],uvs=[],welded=new Map(),boneGroups=[],boneWeights=[];
    const skeletal=parts.some(part=>part.animMayaGroups);
    for(const part of parts){
        const mapping=[];
        for(let i=0;i<part.verticesCount;i++){
            const coords=[part.verticesX[i],part.verticesY[i],part.verticesZ[i]],skin=part.vertexSkins?.[i]??-1;
            const groups=part.animMayaGroups?.[i],weights=part.animMayaScales?.[i];
            const key=coords.join(",")+","+skin+(skeletal?"|"+(groups?.join(",")??"")+"|"+(weights?.join(",")??""):"");let vertex=welded.get(key);
            if(vertex===undefined){vertex=skins.length;welded.set(key,vertex);coords.forEach((n,k)=>xyz[k].push(n));skins.push(skin);
                if(skeletal){boneGroups.push(groups?.slice()??new Int32Array());boneWeights.push(weights?.slice()??new Int32Array());}}
            mapping.push(vertex);
        }
        for(let i=0;i<part.faceCount;i++){
            [part.indices1[i],part.indices2[i],part.indices3[i]].forEach((n,k)=>faces[k].push(mapping[n]));
            colors.push(part.faceColors[i]);textures.push(part.faceTextures?.[i]??-1);alphas.push(part.faceAlphas?.[i]??0);
            types.push(part.faceRenderTypes?.[i]??0);faceSkins.push(part.faceSkins?.[i]??-1);
            priorities.push(part.faceRenderPriorities?.[i]??part.priority??0);
            uvs.push(...(part.textureUvs?.subarray(i*6,i*6+6)??[0,0,0,0,0,0]));
        }
    }
    if(!skins.length||skins.length>65535||colors.length>65535)throw new Error("Invalid composed player model size");
    return {verticesCount:skins.length,faceCount:colors.length,...(skeletal?{animMayaGroups:boneGroups,animMayaScales:boneWeights}:{}),
        verticesX:Int32Array.from(xyz[0]),verticesY:Int32Array.from(xyz[1]),verticesZ:Int32Array.from(xyz[2]),vertexSkins:Int32Array.from(skins),
        indices1:Int32Array.from(faces[0]),indices2:Int32Array.from(faces[1]),indices3:Int32Array.from(faces[2]),
        faceColors:Uint16Array.from(colors),faceTextures:Int16Array.from(textures),faceAlphas:Int32Array.from(alphas),
        faceRenderTypes:Int8Array.from(types),faceRenderPriorities:Int8Array.from(priorities),faceSkins:Int32Array.from(faceSkins),textureUvs:Float32Array.from(uvs)};
}
