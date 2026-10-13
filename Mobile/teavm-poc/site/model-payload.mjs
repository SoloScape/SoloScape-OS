/**
 * Convert a VERIFIED, DECODED revision-240 JS5 model to a compact, numeric
 * protocol for the TeaVM Java model view. No fake geometry is created here.
 */
export function serializeModel(model,palette) {
    const MAX_FACES=4500, MAX_VERTICES=12000;
    if(!model||!Number.isInteger(model.verticesCount)||!Number.isInteger(model.faceCount)
        ||model.verticesCount<3||model.verticesCount>MAX_VERTICES
        ||model.faceCount<1||model.faceCount>65535)
        throw new Error("Model geometry exceeds browser-safe limits");
    if(!palette||palette.length!==65536)throw new Error("Rev-240 palette unavailable");
    const vertices=[];
    for(let i=0;i<model.verticesCount;i++){
        const xyz=[model.verticesX[i],model.verticesY[i],model.verticesZ[i]];
        if(xyz.some(n=>!Number.isInteger(n)||Math.abs(n)>1000000))throw new Error("Invalid model vertex");
        vertices.push(...xyz);
    }
    const faces=[];
    let skipped=0;
    for(let i=0;i<model.faceCount;i++){
        if(model.faceRenderTypes?.[i]>1 || (model.faceAlphas?.[i]??0)!==0
            || (model.faceTextures?.[i]??-1)!==-1){skipped++;continue;}
        const color=palette[model.faceColors[i]&65535];
        if(!Number.isInteger(color))throw new Error("Invalid model HSL color");
        const a=model.indices1[i],b=model.indices2[i],c=model.indices3[i];
        if(![a,b,c].every(v=>Number.isInteger(v)&&v>=0&&v<model.verticesCount))
            throw new Error("Model face index invalid");
        faces.push(a,b,c,color&0xffffff);
        if(faces.length/4>MAX_FACES)throw new Error("Model has too many visible faces for the TeaVM pilot");
    }
    if(faces.length<4)throw new Error("Model has no supported untextured opaque triangles");
    return {vertices:vertices.join(","),faces:faces.join(","),renderedFaces:faces.length/4,
        skippedFaces:skipped,vertexCount:model.verticesCount};
}
