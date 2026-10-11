// RuneLite GPU vert.glsl entityTint: interpolate lit HSL components by amount/128.
// Untextured meshes reserve their UV attributes for the tint target and amount.
// Targets retain signed cache bytes; the shader converts fractional HSL to RGB.
export function activeActorTint(tint,elapsed){
    if(!tint||!Number.isFinite(elapsed)||elapsed<0||!Number.isInteger(tint.start)||!Number.isInteger(tint.end)||
        elapsed<tint.start*20||elapsed>=tint.end*20||!Number.isInteger(tint.weight)||tint.weight<=0)return null;
    if(![tint.hue,tint.saturation,tint.lightness].every(n=>Number.isInteger(n)&&n>=-128&&n<=127)||tint.weight>255)
        throw new Error("Invalid actor HSL tint");
    return {target:((tint.hue&255)<<16)|((tint.saturation&255)<<8)|(tint.lightness&255),amount:tint.weight};
}
export function actorTintKey(tint){return tint?`${tint.target}:${tint.amount}`:"";}
function tintedVertices(source,tint){
    const vertices=source.slice();
    for(let i=0;i<vertices.length;i+=6){vertices[i+4]=tint.target;vertices[i+5]=tint.amount;}
    return vertices;
}
export function tintActorMesh(mesh,tint){
    if(!tint)return mesh;
    return {...mesh,vertices:tintedVertices(mesh.vertices,tint),
        transparentBatches:mesh.transparentBatches.map(batch=>batch.texture<0?
            {...batch,vertices:tintedVertices(batch.vertices,tint)}:batch)};
}
