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
import { decodeCacheContainer } from "./native-js5.mjs";
import { mapRegionCatalog, djb2 } from "./terrain-world.mjs";
import { unpackArchiveFiles } from "./floor-materials.mjs";

const u32=(bytes,at)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(at,false);
export async function decodeGroup(container){
    if(!(container instanceof Uint8Array)||container.length<5)throw new Error("Truncated cache container");
    return decodeCacheContainer({container,uncompressedBytes:container[0]===0?u32(container,1):u32(container,5)});
}
export async function verifiedCatalog(cache,index){
    const metadata=await cache.loadIndex(index),container=cache.referenceContainers.get(index);
    if(!container)throw new Error("Verified reference table missing for index "+index);
    const catalog=mapRegionCatalog(await decodeGroup(container));
    if(catalog.revision!==metadata.revision)throw new Error("Cache reference revision mismatch");
    return catalog;
}

/** XTEA decrypts complete blocks from container byte 5, leaving the tail alone.
 * Operates on a copy AFTER NativeJs5Cache has checked the encrypted group CRC.
 */
export function decryptLocationContainer(container,key){
    if(!Array.isArray(key)||key.length!==4||!key.every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=4294967295)){
        throw new Error("Invalid 128-bit region XTEA key");
    }
    const copy=container.slice();
    if(key.every(n=>n===0))return copy;
    const view=new DataView(copy.buffer,copy.byteOffset,copy.byteLength),delta=0x9e3779b9;
    for(let at=5;at+8<=copy.length;at+=8){
        let a=view.getInt32(at,false),b=view.getInt32(at+4,false),sum=Math.imul(delta,32);
        for(let round=0;round<32;round++){
            b=(b-((((a<<4)^(a>>>5))+a)^(sum+key[(sum>>>11)&3])))|0;
            sum=(sum-delta)|0;
            a=(a-((((b<<4)^(b>>>5))+b)^(sum+key[sum&3])))|0;
        }
        view.setInt32(at,a,false);view.setInt32(at+4,b,false);
    }
    return copy;
}

export function decodeLocations(bytes){
    const reader=new ByteBuffer(bytes),locations=[];
    if(bytes.length>16*1024*1024)throw new Error("Location stream exceeds limit");
    let id=-1,delta;
    while((delta=reader.readSmart3())!==0){
        id+=delta;if(id>0x7fffffff)throw new Error("Location ID overflow");
        let packed=0,positionDelta;
        while((positionDelta=reader.readUnsignedSmart())!==0){
            packed+=positionDelta-1;
            if(packed>=4*4096)throw new Error("Location position exceeds four planes");
            const info=reader.readUnsignedByte(),shape=info>>>2;
            if(shape>22)throw new Error("Unsupported location shape "+shape);
            locations.push({id,x:packed>>>6&63,y:packed&63,plane:packed>>>12,shape,rotation:info&3});
            if(locations.length>100000)throw new Error("Location count exceeds limit");
        }
    }
    if(reader.offset!==reader.length)throw new Error("Unexpected trailing location bytes");
    return locations;
}

export async function loadRegionLocations(cache,terrain,{key}={}){
    const table=await verifiedCatalog(cache,5);
    const named=table.names.get(djb2(`l${terrain.mapX}_${terrain.mapY}`));
    // SoloScape custom maps may put terrain file 0 and locations file 1 in mX_Y.
    const combined=table.fileIdsForGroup.get(terrain.group)?.includes(1);
    const group=named??(combined?terrain.group:undefined);
    if(group===undefined)throw new Error("No location archive for the selected region");
    const fileIds=table.fileIdsForGroup.get(group);
    if(!fileIds)throw new Error("Missing location file metadata");
    const target=named===undefined?1:(fileIds.includes(0)?0:fileIds[0]);
    const encrypted=await cache.loadGroup(5,group);
    let payload;
    try{payload=await decodeGroup(key?decryptLocationContainer(encrypted,key):encrypted);}
    catch(error){throw new Error(key?"Region XTEA key or location container is invalid":
        "Location container cannot be decoded; this region may require an XTEA key",{cause:error});}
    const files=unpackArchiveFiles(payload,fileIds,new Set([target]));
    if(!files.has(target))throw new Error("Location file is missing");
    return {group,locations:decodeLocations(files.get(target)),keyUsed:!!key?.some(n=>n!==0)};
}
