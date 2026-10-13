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
import { ByteBuffer } from "./cache-reader.mjs";
// OSRS branch of pinned BSD TSPS LocType, with strict terminators and bounds.
export function decodeObjectDefinition(bytes,id){
    const b=new ByteBuffer(bytes);
    if(bytes.length>65536)throw new Error("Object definition exceeds limit");
    const d={id,name:"null",models:[],types:null,sizeX:1,sizeY:1,isRotated:false,
        modelSizeX:128,modelSizeHeight:128,modelSizeY:128,offsetX:0,offsetHeight:0,offsetY:0,
        ambient:0,contrast:0,contour: -1,seqId:-1,transforms:null,decorDisplacement:16,
        recolors:[],retextures:[],actions:[],mergeNormals:false,clipped:true,transformVarbit:-1,transformVarp:-1};
    const pairs=()=>Array.from({length:b.readUnsignedByte()},()=>[b.readUnsignedShort(),b.readUnsignedShort()]);
    for(let count=0;count<4096;count++){
        const op=b.readUnsignedByte();
        if(op===0){if(b.offset!==b.length)throw new Error("Trailing object definition bytes");return d;}
        if(op===1){
            const n=b.readUnsignedByte(),models=[],types=[];
            for(let i=0;i<n;i++){models.push(b.readUnsignedShort());types.push(b.readUnsignedByte());}
            if(!d.models.length){d.models=models;d.types=types;}
        }else if(op===5){
            const models=Array.from({length:b.readUnsignedByte()},()=>b.readUnsignedShort());
            if(!d.models.length){d.models=models;d.types=null;}
        }else if(op===6||op===7){
            d.models=[];d.types=op===6?[]:null;
            const n=b.readUnsignedByte();
            for(let i=0;i<n;i++){d.models.push(b.readInt()>>>0);if(d.types)d.types.push(b.readUnsignedByte());}
        }else if(op===2)d.name=b.readString();
        else if(op===3)b.readString();
        else if(op>=30&&op<=38||op>=150&&op<=154){
            const slot=op>=150?op-150:op-30,label=b.readString();
            if(slot<5)d.actions[slot]=label.toLowerCase()==="hidden"?null:label;
        }
        else if(op===14)d.sizeX=b.readUnsignedByte();
        else if(op===15)d.sizeY=b.readUnsignedByte();
        else if(op===21)d.contour=0;
        else if(op===22)d.mergeNormals=true;
        else if(op===24){d.seqId=b.readUnsignedShort();if(d.seqId===65535)d.seqId=-1;}
        else if(op===28)d.decorDisplacement=b.readUnsignedByte();
        else if(op===29)d.ambient=b.readByte();
        else if(op===39)d.contrast=b.readByte()*25;
        else if(op===40)d.recolors=pairs();
        else if(op===41)d.retextures=pairs();
        else if(op===62)d.isRotated=true;
        else if(op===64)d.clipped=false;
        else if(op===65)d.modelSizeX=b.readUnsignedShort();
        else if(op===66)d.modelSizeHeight=b.readUnsignedShort();
        else if(op===67)d.modelSizeY=b.readUnsignedShort();
        else if(op===70)d.offsetX=b.readShort();
        else if(op===71)d.offsetHeight=b.readShort();
        else if(op===72)d.offsetY=b.readShort();
        else if(op===77||op===92){
            const varbit=b.readUnsignedShort(),varp=b.readUnsignedShort();
            d.transformVarbit=varbit===65535?-1:varbit;d.transformVarp=varp===65535?-1:varp;
            const fallback=op===92?b.readUnsignedShort():65535;
            d.transforms=Array.from({length:b.readUnsignedByte()+1},()=>b.readUnsignedShort());d.transforms.push(fallback);
        }else if(op===78){b.readUnsignedShort();b.readUnsignedByte();b.readUnsignedByte();}
        else if(op===79){b.readUnsignedShort();b.readUnsignedShort();b.readUnsignedByte();b.readUnsignedByte();
            for(let n=b.readUnsignedByte();n>0;n--)b.readUnsignedShort();}
        else if(op===81)d.contour=b.readUnsignedByte()*256;
        else if(op===93){b.readUnsignedByte();b.readUnsignedShort();b.readUnsignedByte();b.readUnsignedShort();}
        else if(op===249){
            for(let n=b.readUnsignedByte();n>0;n--){const string=b.readUnsignedByte();b.readMedium();if(string)b.readString();else b.readInt();}
        }else if([19,69,75,91,95,96,104].includes(op))b.readUnsignedByte();
        else if([42,44,45,60,61,68,82,107,167].includes(op))b.readUnsignedShort();
        else if([17,18,23,25,27,73,74,88,89,90,94,97,98,103,105,168,169,177].includes(op)){}
        else throw new Error("Unsupported revision-240 object opcode "+op);
    }
    throw new Error("Object definition opcode limit exceeded");
}
