// Revision-240 layouts checked against the installed rsprot and local rsprox decoders.
// See ../licenses/rsprox-MIT.txt and ../licenses/rsprot-MIT.txt.
import {PacketReader} from "./player-sync.mjs";
export const MOVE_GAMECLICK=102,MAP_BUILD_COMPLETE=27,WINDOW_STATUS=44;
export function encodeMoveDestination(x,y,{run=false}={}){
    if(![x,y].every(n=>Number.isInteger(n)&&n>=0&&n<=16383))throw new Error("Invalid movement destination");
    // g2Alt3, g1Alt2, g2Alt3. Opcode/length and ISAAC belong to the session.
    return Uint8Array.of(y+128,y>>>8,run?-1:0,x+128,x>>>8);
}
export function encodeWindowStatus(width,height){
    if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=65535))throw new Error("Invalid window dimensions");
    return Uint8Array.of(2,width>>>8,width,height>>>8,height);
}
export function decodeRebuild(payload,sync){
    if(!(payload instanceof Uint8Array))throw new Error("Invalid rebuild bytes");
    const initial=payload.length>=4614;
    const at=initial?sync.initialize(payload):0;
    if(payload.length!==at+6)throw new Error("Unexpected revision-240 rebuild layout");
    const alt3=n=>((payload[n]-128)&255)|(payload[n+1]<<8);
    const zoneY=alt3(at),worldArea=alt3(at+2)<<16>>16,zoneX=alt3(at+4);
    if(zoneX>2047||zoneY>2047)throw new Error("Invalid rebuild coordinates");
    return {initial,zoneX,zoneY,worldArea,baseX:(zoneX-6)*8,baseY:(zoneY-6)*8};
}

/** Revision-240 REBUILD_REGION_V2; the normal rebuild initializes GPI separately. */
export function decodeInstanceRebuild(payload){
    if(!(payload instanceof Uint8Array))throw new Error("Invalid instanced rebuild bytes");
    const r=new PacketReader(payload),zoneY=r.u16(2),zoneX=r.u16(1),reload=r.u8(1)===1;
    const distinctCount=r.u16();
    if(zoneX<6||zoneY<6||zoneX>2047||zoneY>2047||distinctCount>676)
        throw new Error("Invalid instanced rebuild coordinates or map count");
    const templates=[];
    for(let plane=0;plane<4;plane++)for(let x=0;x<13;x++)for(let y=0;y<13;y++){
        if(!r.bits(1))continue;
        const packed=r.bits(26);
        templates.push({plane,x,y,packed,sourcePlane:packed>>>24&3,
            sourceZoneX:packed>>>14&1023,sourceZoneY:packed>>>3&2047,rotation:packed>>>1&3});
    }
    r.align();
    if(r.remaining)throw new Error("Unexpected instanced rebuild bytes");
    const distinct=new Set(templates.map(t=>`${t.sourceZoneX>>>3},${t.sourceZoneY>>>3}`));
    if(distinct.size!==distinctCount)throw new Error("Instanced rebuild map count mismatch");
    return {instance:true,initial:false,zoneX,zoneY,reload,distinctCount,templates,
        baseX:(zoneX-6)*8,baseY:(zoneY-6)*8};
}
