// Revision-240 OPLOC V2 encoders checked against installed rsprot JVM decoders.
// Keep action-slot identity: Open/Close/etc are cache-defined, not hard-coded.
export const LOC_OPCODES=Object.freeze([74,90,8,69,77]);
export const LOC_EXAMINE_OPCODE=105;
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
export function encodeLocInteraction(id,worldX,worldY,slot,{controlKey=false,subop=0}={}){
    check(id,"location id");check(worldX,"world X",16383);check(worldY,"world Y",16383);
    check(slot,"location action slot",4);
    check(subop,"location suboption",255);
    const ctrl=Number(Boolean(controlKey));
    let data;
    switch(slot){
        case 0:data=[128-ctrl,...shortAddLE(worldY),subop,...shortAddLE(worldX),...shortAdd(id)];break;
        case 1:data=[...short(worldY),-subop,128-ctrl,...short(id),...shortLE(worldX)];break;
        case 2:data=[128-subop,128-ctrl,...shortAdd(worldY),...shortAddLE(id),...short(worldX)];break;
        case 3:data=[ctrl+128,...shortLE(id),...short(worldY),subop+128,...short(worldX)];break;
        case 4:data=[...shortLE(worldY),...short(worldX),subop+128,128-ctrl,...shortAddLE(id)];break;
    }
    return {opcode:LOC_OPCODES[slot],payload:Uint8Array.from(data)};
}
export function encodeLocExamine(id){
    check(id,"location id");
    return {opcode:LOC_EXAMINE_OPCODE,payload:Uint8Array.from(shortLE(id))};
}
