// Revision-240 rsprot OPNPC*_V2 client wire layouts (subop 0 = primary action).
// Opcodes and field permutations match osrs-240 OpNpc1..5V2Decoder.
export const NPC_OPCODES=Object.freeze([59,87,43,35,73]);
export function encodeNpcInteraction(index,slot,{controlKey=false,subop=0}={}){
    if(!Number.isInteger(index)||index<0||index>=65535)throw new Error("Invalid NPC index");
    if(!Number.isInteger(slot)||slot<0||slot>4)throw new Error("Invalid NPC action slot");
    if(!Number.isInteger(subop)||subop<0||subop>255)throw new Error("Invalid NPC suboption");
    if(typeof controlKey!=="boolean")throw new Error("Invalid NPC control flag");
    const low=index&255,high=index>>>8,c=Number(controlKey);
    switch(slot){
        case 0:return {opcode:NPC_OPCODES[0],payload:Uint8Array.of(low,high,subop,c+128)};
        case 1:return {opcode:NPC_OPCODES[1],payload:Uint8Array.of(low,high,subop+128,128-c)};
        case 2:return {opcode:NPC_OPCODES[2],payload:Uint8Array.of(low,high,128-c,-subop)};
        case 3:return {opcode:NPC_OPCODES[3],payload:Uint8Array.of(128-c,subop,high,low+128)};
        case 4:return {opcode:NPC_OPCODES[4],payload:Uint8Array.of(subop,-c,high,low)};
    }
}
// Slot identity, rather than label sorting, determines the outgoing opcode.
// A server-issued visibility update replaces the default five available slots.
export function npcActionOptions(definition,npc){
    if(!Array.isArray(definition?.actions)||definition.isInteractable===false||!npc)return [];
    return definition.actions.slice(0,5).flatMap((label,slot)=>{
        if(typeof label!=="string"||!label.trim()||label.trim().toLowerCase()==="hidden")return [];
        if(npc.visibleOps!==undefined&&(npc.visibleOps&(1<<slot))===0)return [];
        return [{slot,label:label.trim()}];
    });
}
