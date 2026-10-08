// Cache-backed flat floor colours for the native revision-240 WebGL scene.
// TSPS Dat2CacheLoaderFactory uses index 2, group 1 underlays, group 4
// overlays. Decoder behaviour mirrors pinned BSD-2-Clause TSPS sources.
// This is not blended floor lighting, texture UVs, or 3D world models.
import { decodeCacheContainer } from "./native-js5.mjs";
import { mapRegionCatalog } from "./terrain-world.mjs";

const MAX_FILES=4096;
const MAX_DATA=16*1024*1024;
const MAX_CHUNKS=128;
const u32=(bytes,off)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(off,false);

/** Unpack selected file IDs using the native JS5 chunk table (TSPS Archive.decode). */
export function unpackArchiveFiles(payload,fileIds,requested) {
    if(!(payload instanceof Uint8Array)||payload.length>MAX_DATA||
        !Array.isArray(fileIds)||fileIds.length<1||fileIds.length>MAX_FILES||
        fileIds.some((id,i)=>!Number.isInteger(id)||id<0||id>0x7fffffff||
            i>0&&id<=fileIds[i-1])){
        throw new Error("Invalid floor archive metadata");
    }
    const wanted=new Set(requested);
    const output=new Map();
    if(fileIds.length===1){
        if(wanted.has(fileIds[0]))output.set(fileIds[0],payload.slice());
        return output;
    }
    if(!payload.length)throw new Error("Empty multi-file floor archive");
    const chunks=payload[payload.length-1];
    if(chunks<1||chunks>MAX_CHUNKS)throw new Error("Unsupported archive chunk count");
    const n=fileIds.length;
    const tableStart=payload.length-1-chunks*n*4;
    if(tableStart<0)throw new Error("Truncated floor archive chunk table");
    const view=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
    const size=new Uint32Array(n);
    let offset=tableStart;
    for(let chunk=0;chunk<chunks;chunk++){
        let length=0;
        for(let file=0;file<n;file++){
            length+=view.getInt32(offset,false);offset+=4;
            if(length<0||length>tableStart||size[file]+length>tableStart) {
                throw new Error("Invalid floor archive chunk length");
            }
            size[file]+=length;
        }
    }
    for(let i=0;i<n;i++)if(wanted.has(fileIds[i])){
        output.set(fileIds[i],new Uint8Array(size[i]));
    }
    offset=tableStart;
    let readOffset=0;
    const writeOffsets=new Uint32Array(n);
    for(let chunk=0;chunk<chunks;chunk++){
        let length=0;
        for(let file=0;file<n;file++){
            length+=view.getInt32(offset,false);offset+=4;
            if(readOffset+length>tableStart)throw new Error("Floor chunk exceeds data");
            const buffer=output.get(fileIds[file]);
            if(buffer){
                buffer.set(payload.subarray(readOffset,readOffset+length),writeOffsets[file]);
                writeOffsets[file]+=length;
            }
            readOffset+=length;
        }
    }
    if(readOffset!==tableStart)throw new Error("Floor archive file boundaries mismatch");
    for(let i=0;i<n;i++)if(wanted.has(fileIds[i])&&writeOffsets[i]!==size[i]) {
        throw new Error("Floor archive output size mismatch");
    }
    return output;
}

/** Decode a single bounded underlay or overlay definition's relevant RGB. */
export function decodeFloorDefinition(bytes,type) {
    if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>16384||
        (type!=="underlay"&&type!=="overlay"))throw new Error("Invalid floor definition");
    let pos=0;
    const take=n=>{if(pos+n>bytes.length)throw new Error("Truncated floor opcode");const at=pos;pos+=n;return at;};
    const byte=()=>bytes[take(1)];
    const short=()=>{const p=take(2);return bytes[p]<<8|bytes[p+1];};
    const rgb=()=>{const p=take(3);return bytes[p]<<16|bytes[p+1]<<8|bytes[p+2];};
    const out={rgb:0,secondaryRgb:null,textureId:-1,hideUnderlay:true};
    let terminated=false;
    for(let opCount=0;opCount<512&&pos<bytes.length;opCount++){
        const op=byte();
        if(op===0){terminated=true;break;}
        if(type==="underlay"){
            if(op===1)out.rgb=rgb();
            else if(op===2){const value=short();out.textureId=value===65535?-1:value;}
            else if(op===3)short();
            else if(op!==4&&op!==5)throw new Error("Unsupported underlay opcode "+op);
        }else{
            if(op===1)out.rgb=rgb();
            else if(op===2)out.textureId=byte();
            else if(op===3){const value=short();out.textureId=value===65535?-1:value;}
            else if(op===5)out.hideUnderlay=false;
            else if(op===6){
                let found=false;
                for(let i=0;i<4096;i++)if(byte()===0){found=true;break;}
                if(!found)throw new Error("Floor name is too long");
            }else if(op===7)out.secondaryRgb=rgb();
            else if(op===8||op===10||op===12){}
            else if(op===9||op===15)short();
            else if(op===11||op===14||op===16)byte();
            else if(op===13)rgb();
            else throw new Error("Unsupported overlay opcode "+op);
        }
    }
    if(!terminated||pos!==bytes.length)throw new Error("Malformed floor definition terminator");
    return out;
}

function terrainIds(values,overlay=false) {
    const ids=new Set();
    for(const value of values){
        const id=(overlay?(value&0x7fff):value)-1;
        if(id>=0)ids.add(id);
    }
    return ids;
}
async function floorDefinitions(cache,table,group,wanted){
    const fileIds=table.fileIdsForGroup.get(group);
    if(!fileIds)throw new Error("Missing OSRS floor config group 2:"+group);
    const container=await cache.loadGroup(2,group);
    const decompressed=await decodeCacheContainer({
        container,uncompressedBytes:container[0]===0?u32(container,1):u32(container,5),
    });
    const files=unpackArchiveFiles(decompressed,fileIds,wanted);
    const result=new Map();
    for(const [id,bytes] of files){
        result.set(id,decodeFloorDefinition(bytes,group===1?"underlay":"overlay"));
    }
    return result;
}

/** Cache-derived visible RGB floors, fetching only groups 2:1 and 2:4 as needed. */
export async function loadFloorMaterials(cache,terrain) {
    if(terrain?.underlays?.length!==4096||terrain?.overlays?.length!==4096) {
        throw new Error("Invalid terrain floor tile IDs");
    }
    const u=terrainIds(terrain.underlays),o=terrainIds(terrain.overlays,true);
    const index=await cache.loadIndex(2);
    const ref=cache.referenceContainers.get(2);
    if(!ref)throw new Error("Floor configuration reference table is missing");
    const reference=await decodeCacheContainer({
        container:ref,uncompressedBytes:ref[0]===0?u32(ref,1):u32(ref,5),
    });
    const table=mapRegionCatalog(reference);
    if(table.revision!==index.revision)throw new Error("Floor configuration reference revision mismatch");
    const [underlays,overlays]=await Promise.all([
        u.size?floorDefinitions(cache,table,1,u):Promise.resolve(new Map()),
        o.size?floorDefinitions(cache,table,4,o):Promise.resolve(new Map()),
    ]);
    return {
        underlays,overlays,
        selectedUnderlays:u.size,selectedOverlays:o.size,
        loadedUnderlays:underlays.size,loadedOverlays:overlays.size,
    };
}
