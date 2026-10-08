// Revision-240 layouts checked against the installed rsprot and local rsprox decoders.
// See ../licenses/rsprox-MIT.txt and ../licenses/rsprot-MIT.txt.
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
