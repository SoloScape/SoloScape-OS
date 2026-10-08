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
// SpriteTextureLoader format/palette pipeline from pinned BSD-2-Clause TSPS.
import {ByteBuffer} from "./cache-reader.mjs";
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeIndexedSprites} from "./sprite-preview.mjs";
import {brightenRgb} from "./floor-lighting.mjs";

export function decodeTextureDefinition(bytes,id,revision=240){
    if(revision>=233){
        const b=new ByteBuffer(bytes),spriteId=b.readUnsignedShort(),averageHsl=b.readUnsignedShort(),opaque=b.readUnsignedByte();
        const animationDirection=b.readUnsignedByte(),animationSpeed=b.readUnsignedByte();
        if(b.offset!==b.length||opaque>1||animationDirection>4)throw new Error("Malformed simplified texture definition");
        return {id,averageHsl,opaque:!!opaque,spriteIds:[spriteId],spriteTypes:[],unused:[],transforms:[0],animationDirection,animationSpeed};
    }
    const b=new ByteBuffer(bytes),averageHsl=b.readUnsignedShort(),opaque=b.readUnsignedByte();
    const count=b.readUnsignedByte();
    if(opaque>1||count<1||count>4)throw new Error("Invalid texture definition");
    const spriteIds=Array.from({length:count},()=>b.readUnsignedShort());
    const spriteTypes=Array.from({length:count-1},()=>b.readUnsignedByte());
    const unused=Array.from({length:count-1},()=>b.readUnsignedByte());
    const transforms=Array.from({length:count},()=>b.readInt());
    const animationDirection=b.readUnsignedByte(),animationSpeed=b.readUnsignedByte();
    if(b.offset!==b.length||animationDirection>4)throw new Error("Malformed texture definition");
    return {id,averageHsl,opaque:!!opaque,spriteIds,spriteTypes,unused,transforms,animationDirection,animationSpeed};
}

/** Normalize sprite offsets and apply cache grayscale tint and client brightness.
 * Multi-sprite definitions use their first frame, as the pinned sprite loader does at rest.
 */
export function texturePixels(def,frame,brightness=.8){
    const size=frame.sheetWidth;
    if((size!==64&&size!==128)||frame.sheetHeight!==size)throw new Error("Unsupported texture sprite dimensions");
    const pixels=new Uint8Array(size*size*4),transform=def.transforms[0];
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
        const src=(y*frame.width+x)*4,dst=((y+frame.y)*size+x+frame.x)*4;
        let rgb=frame.rgba[src]<<16|frame.rgba[src+1]<<8|frame.rgba[src+2];
        if((transform&0xff000000)===0x03000000&&(rgb>>>8)===(rgb&65535)){
            const blue=rgb&255;
            rgb=(((transform&0xff00ff)*blue>>8)&0xff00ff)|(((transform>>>8&255)*blue)&0xff00);
        }
        rgb=brightenRgb(rgb,brightness);
        pixels.set([rgb>>>16&255,rgb>>>8&255,rgb&255,frame.rgba[src+3]],dst);
    }
    return {id:def.id,size,pixels,opaque:def.opaque,animationDirection:def.animationDirection,animationSpeed:def.animationSpeed};
}

/** One scene's lazy, CRC-verified texture/sprite loads; failures never invent a material. */
export class SceneTextures {
    constructor(cache,{isCurrent=()=>true}={}){this.cache=cache;this.isCurrent=isCurrent;this.textures=new Map();this.errors=[];this.failed=new Set();this.sprites=new Map();}
    async definitions(){
        if(!this.pending)this.pending=(async()=>{
            const table=await verifiedCatalog(this.cache,9),ids=table.fileIdsForGroup.get(0);
            if(!ids)throw new Error("Texture definition group 9:0 is missing");
            const files=unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(9,0)),ids,new Set(ids));
            return files;
        })();
        return this.pending;
    }
    async load(id){
        if(this.textures.has(id))return this.textures.get(id);
        if(this.failed.has(id)||!this.isCurrent())return null;
        try{
            if(this.textures.size+this.failed.size>=512)throw new Error("Scene texture count exceeds limit");
            const bytes=(await this.definitions()).get(id);
            if(!bytes)throw new Error("Texture definition is missing");
            const def=decodeTextureDefinition(bytes,id,this.cache.revision),spriteId=def.spriteIds[0];
            let frame=this.sprites.get(spriteId);
            if(!frame){
                const table=await verifiedCatalog(this.cache,8),ids=table.fileIdsForGroup.get(spriteId);
                if(!ids?.includes(0))throw new Error("Texture sprite file is missing");
                const files=unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(8,spriteId)),ids,new Set([0]));
                frame=decodeIndexedSprites(files.get(0))[0];
                this.sprites.set(spriteId,frame);
            }
            if(!this.isCurrent())return null;
            const texture=texturePixels(def,frame);this.textures.set(id,texture);return texture;
        }catch(error){this.failed.add(id);this.errors.push({texture:id,reason:error.message});return null;}
    }
}
