// Revision-240 rsprot interface layouts, checked against pinned rsprot encoders
// and local rsprox decoders. See ../licenses/rsprot-MIT.txt and rsprox-MIT.txt.
import {ByteBuffer} from "./cache-reader.mjs";

const nil=n=>n===65535?-1:n;
class Reader extends ByteBuffer {
    u16(mode=0){
        const a=this.readUnsignedByte(),b=this.readUnsignedByte();
        return mode===1?a|(b<<8):mode===2?(a<<8)|((b-128)&255):
            mode===3?((a-128)&255)|(b<<8):(a<<8)|b;
    }
    uid(mode=0){
        const shifts=[[24,16,8,0],[0,8,16,24],[8,0,24,16],[16,24,0,8]][mode];
        let n=0;for(const shift of shifts)n|=this.readUnsignedByte()<<shift;
        return n>>>0;
    }
    text(){
        const start=this.offset;
        while(this.readUnsignedByte()!==0)if(this.offset-start>4096)throw new Error("Interface text exceeds limit");
        return new TextDecoder("windows-1252").decode(this.data.subarray(start,this.offset-1));
    }
    events(){
        const uid=this.uid(),flags=this.uid(3),start=nil(this.u16(2));
        const flags2=this.uid(1),end=nil(this.u16(1));
        if(start>end)throw new Error("Invalid interface event range");
        return {uid,start,end,flags,flags2};
    }
    varint(){
        let n=0;
        for(let shift=0;shift<35;shift+=7){const b=this.readUnsignedByte();
            if(shift===28&&(b&240))throw new Error("Invalid script varint");
            n|=(b&127)<<shift;if(!(b&128))return n>>>0;}
        throw new Error("Invalid script varint");
    }
}
export function decodeInterfacePacket({name,payload}){
    if(!INTERFACE_PACKETS.has(name))return null;
    const r=new Reader(payload);let result;
    switch(name){
        case "RUNCLIENTSCRIPT":{
            const types=r.text(),args=new Array(types.length);
            if(types.length>64)throw new Error("Script argument budget exceeded");
            for(let i=types.length-1;i>=0;i--){
                const type=types[i];
                if(type==="W"||type==="X"){
                    const count=r.varint();if(count>1024)throw new Error("Script array budget exceeded");
                    args[i]=Array.from({length:count},()=>{if(type==="X")return r.text();const n=r.varint();return (n>>>1)^-(n&1);});
                }else args[i]=type==="s"?r.text():type==="Ï"?(BigInt(r.readInt())<<32n)|BigInt(r.readInt()>>>0):r.readInt();
            }
            result={kind:"script",id:r.readInt(),args};break;
        }
        case "VARP_SMALL":result={kind:"varp",id:r.u16(2),value:(-r.readByte())<<24>>24};break;
        case "VARP_LARGE":result={kind:"varp",id:r.u16(3),value:r.uid(1)|0};break;
        case "IF_SETNPCHEAD":result={kind:"patch",uid:r.uid(2),patch:{modelKind:"npc",modelId:nil(r.u16(1))}};break;
        case "IF_SETNPCHEAD_ACTIVE":result={kind:"patch",uid:r.uid(1),patch:{modelKind:"npc-active",modelId:nil(r.u16(3))}};break;
        case "IF_SETPLAYERHEAD":result={kind:"patch",uid:r.uid(1),patch:{modelKind:"player",modelId:-1}};break;
        case "IF_SETANIM":result={kind:"patch",uid:r.uid(),patch:{sequenceId:r.u16(2)<<16>>16}};break;
        case "IF_OPENTOP":result={kind:"top",groupId:nil(r.u16(3))};break;
        case "IF_OPENSUB":{
            const type=r.readUnsignedByte(),groupId=r.u16(3),uid=r.uid(3);
            if(type>3||groupId===65535)throw new Error("Invalid interface mount");
            result={kind:"open",uid,groupId,type};break;
        }
        case "IF_CLOSESUB":result={kind:"close",uid:r.uid()};break;
        case "IF_MOVESUB":result={kind:"move",source:r.uid(3),destination:r.uid(3)};break;
        case "IF_RESYNC_V2":{
            const groupId=nil(r.u16()),count=r.u16(),mounts=[],events=[];
            if(count>128)throw new Error("Interface mount budget exceeded");
            const seen=new Set();
            for(let i=0;i<count;i++){
                const uid=r.uid(),id=r.u16(),type=r.readUnsignedByte();
                if(seen.has(uid)||id===65535||type>3)throw new Error("Invalid interface resync mount");
                seen.add(uid);mounts.push({uid,groupId:id,type});
            }
            while(r.offset<r.length){
                if(events.length>=4096)throw new Error("Interface event budget exceeded");
                const uid=r.uid(),start=nil(r.u16()),end=nil(r.u16()),flags=r.uid(),flags2=r.uid();
                if(start>end)throw new Error("Invalid interface event range");
                events.push({uid,start,end,flags,flags2});
            }
            result={kind:"resync",groupId,mounts,events};break;
        }
        case "IF_SETEVENTS_V2":result={kind:"events",...r.events()};break;
        case "IF_SETTEXT":result={kind:"patch",uid:r.uid(2),patch:{text:r.text()}};break;
        case "IF_SETHIDE":{
            const hidden=(128-r.readUnsignedByte())&255;
            if(hidden>1)throw new Error("Invalid widget visibility");
            result={kind:"patch",uid:r.uid(2),patch:{hidden:hidden===1}};break;
        }
        case "IF_SETCOLOUR":{
            const c=r.u16(3),color=((c>>>10&31)<<19)|((c>>>5&31)<<11)|((c&31)<<3);
            result={kind:"patch",uid:r.uid(1),patch:{color}};break;
        }
        case "IF_SETSCROLLPOS":result={kind:"patch",uid:r.uid(3),patch:{scrollY:r.u16()}};break;
        case "IF_SETPOSITION":{
            const x=r.u16(2)<<16>>16,y=r.u16(2)<<16>>16;
            result={kind:"patch",uid:r.uid(1),patch:{rawX:x,rawY:y,legacyX:x,legacyY:y,xPositionMode:0,yPositionMode:0}};break;
        }
    }
    if(r.offset!==r.length)throw new Error("Trailing interface packet bytes: "+name);
    return result;
}
export const INTERFACE_PACKETS=new Set(["IF_OPENTOP","IF_OPENSUB","IF_CLOSESUB","IF_MOVESUB","IF_RESYNC_V2",
    "IF_SETTEXT","IF_SETHIDE","IF_SETCOLOUR","IF_SETSCROLLPOS","IF_SETPOSITION","IF_SETEVENTS_V2",
    "RUNCLIENTSCRIPT","IF_SETNPCHEAD","IF_SETNPCHEAD_ACTIVE","IF_SETPLAYERHEAD","IF_SETANIM","VARP_SMALL","VARP_LARGE"]);

export function encodeInterfaceButton(widget,{op=1,sub=widget.childIndex??-1}={}){
    const uid=widget.uid;
    if(!Number.isInteger(uid)||uid<0||uid>0xffffffff||!Number.isInteger(sub)||sub< -1||sub>65534)
        throw new Error("Invalid interface button");
    const id=[uid>>>24,uid>>>16,uid>>>8,uid];
    if(!widget.isIf3){
        if(widget.buttonType===1)return {opcode:11,payload:Uint8Array.from(id)};
        if(widget.buttonType===3)return {opcode:98,payload:new Uint8Array()};
        if(widget.buttonType===6)return {opcode:82,payload:Uint8Array.from([...id,sub+128,sub>>>8])};
        return null;
    }
    if((widget.flags??0)&1)return {opcode:82,payload:Uint8Array.from([...id,sub+128,sub>>>8])};
    if(!Number.isInteger(op)||op<1||op>10||!widget.actions?.[op-1]||!((widget.flags??0)&(1<<op)))return null;
    return {opcode:1,payload:Uint8Array.from([...id,sub>>>8,sub,255,255,op])};
}
