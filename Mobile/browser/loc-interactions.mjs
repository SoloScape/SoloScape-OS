// Revision-240 OPLOC encoders ported from pinned TSPS MenuAction.ts.
// Keep action-slot identity: Open/Close/etc are cache-defined, not hard-coded.
export const LOC_OPCODES=Object.freeze([96,28,42,38,51]);
export const LOC_EXAMINE_OPCODE=85;
const short=n=>[(n>>>8)&255,n&255];
const shortLE=n=>[n&255,(n>>>8)&255];
const shortAdd=n=>[(n>>>8)&255,(n+128)&255];
const shortAddLE=n=>[(n+128)&255,(n>>>8)&255];
const check=(n,label,max=65535)=>{
    if(!Number.isInteger(n)||n<0||n>max)throw new Error("Invalid "+label);
};
export function objectActionOptions(def){
    return (def?.actions??[]).slice(0,5).flatMap((label,slot)=>
        typeof label==="string"&&label.trim()&&label.toLowerCase()!=="hidden"?
            [{slot,label:label.trim()}]:[]);
}
export function encodeLocInteraction(id,worldX,worldY,slot,{controlKey=false}={}){
    check(id,"location id");check(worldX,"world X",16383);check(worldY,"world Y",16383);
    check(slot,"location action slot",4);
    const ctrl=Number(Boolean(controlKey));
    let data;
    switch(slot){
        case 0:data=[...shortAdd(worldX),...shortLE(worldY),(-ctrl)&255,...shortAddLE(id)];break;
        case 1:data=[...shortAddLE(worldX),...shortAddLE(worldY),(128-ctrl)&255,...short(id)];break;
        case 2:data=[...shortLE(worldY),...shortLE(id),...shortAddLE(worldX),(128-ctrl)&255];break;
        case 3:data=[...shortAdd(worldX),...shortLE(id),...shortAdd(worldY),(-ctrl)&255];break;
        case 4:data=[...short(worldX),(ctrl+128)&255,...shortAdd(worldY),...shortAdd(id)];break;
    }
    return {opcode:LOC_OPCODES[slot],payload:Uint8Array.from(data)};
}
export function encodeLocExamine(id){
    check(id,"location id");
    return {opcode:LOC_EXAMINE_OPCODE,payload:Uint8Array.from(shortAddLE(id))};
}
