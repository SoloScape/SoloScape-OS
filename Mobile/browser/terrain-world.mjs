// OSRS revision-240 native JS5 map terrain loader. Derived from the
// terrain layout documented in TSPS SceneBuilder / Dat2MapIndex (BSD-2-Clause).
// This is a real world-mesh loader; floor colours remain approximations until
// the cache underlay/overlay definitions and full TSPS renderer are integrated.
import { decodeCacheContainer } from "./native-js5.mjs";

const SIDE = 64;
const PLANES = 4;
const MAX_MAP_REFERENCE = 16 * 1024 * 1024;
const MAX_FILE_IDS = 2_000_000;

function readU32(bytes, off) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(off, false);
}
function requireBytes(bytes, offset, size) {
    if (!Number.isInteger(offset) || size < 0 || offset + size > bytes.length) {
        throw new Error("Truncated native OSRS map data");
    }
}
export function djb2(name) {
    let n = 0;
    for (let i = 0; i < name.length; i++) n = (Math.imul(n, 31) + name.charCodeAt(i)) | 0;
    return n;
}

/** Parse only the checked index-5 table metadata needed to resolve mX_Y. */
export function mapRegionCatalog(data) {
    if (!(data instanceof Uint8Array) || data.length < 8 || data.length > MAX_MAP_REFERENCE) {
        throw new Error("Unsupported native map index reference table");
    }
    let at = 0;
    const need = n => { requireBytes(data, at, n); const off = at; at += n; return off; };
    const u8 = () => data[need(1)];
    const u16 = () => { const i = need(2); return data[i] << 8 | data[i + 1]; };
    const u32 = () => readU32(data, need(4));
    const smart = version => {
        if (version < 7) return u16();
        requireBytes(data, at, 1);
        if (data[at] & 128) return u32() & 0x7fffffff;
        const value = u16();
        if (value === 32767) throw new Error("Unsupported map reference sentinel");
        return value;
    };
    const format = u8();
    if (format < 5 || format > 7) throw new Error("Unsupported map reference-table version");
    const revision = format > 5 ? u32() : null;
    const flags = u8();
    if (flags & ~15) throw new Error("Unsupported map reference-table flags");
    const count = smart(format);
    if (count > 100000 || count * 2 > data.length - at) throw new Error("Unsafe map reference count");
    const ids = [];
    let id = 0;
    for (let i = 0; i < count; i++) {
        const delta = smart(format);
        if (i && delta === 0) throw new Error("Duplicate map archive ID");
        id += delta;
        if (id > 65535) throw new Error("Map archive ID exceeds JS5 group limit");
        ids.push(id);
    }
    const names = new Map();
    if (flags & 1) {
        for (const group of ids) names.set(u32() | 0, group);
    }
    need(count * 4); // group CRCs already validated by NativeJs5Cache
    if (flags & 8) need(count * 4); // OSRS uncompressed CRC extension
    if (flags & 2) need(count * 64); // optional Whirlpool digests
    if (flags & 4) need(count * 8); // compressed/uncompressed sizes
    need(count * 4); // revisions
    const counts = [];
    let totalFiles = 0;
    for (let i = 0; i < count; i++) {
        const c = smart(format);
        totalFiles += c;
        if (totalFiles > MAX_FILE_IDS || totalFiles > data.length) {
            throw new Error("Unsafe map archive file count");
        }
        counts.push(c);
    }
    const fileIdForGroup = new Map();
    for (let i = 0; i < count; i++) {
        let fileId = 0;
        for (let f = 0; f < counts[i]; f++) {
            const delta = smart(format);
            if (f && !delta) throw new Error("Duplicate file ID");
            fileId += delta;
            if (fileId > 0x7fffffff) throw new Error("Map archive file ID overflow");
        }
        if (counts[i] === 1) fileIdForGroup.set(ids[i], fileId);
    }
    if (flags & 1) need(totalFiles * 4);
    if (at !== data.length) throw new Error("Unsupported trailing map reference metadata");
    return { format, revision, ids, names, fileIdForGroup };
}

export function getTerrainGroup(catalog, mapX, mapY) {
    if (!Number.isInteger(mapX) || !Number.isInteger(mapY) ||
        mapX < 0 || mapX > 255 || mapY < 0 || mapY > 255) {
        throw new RangeError("Map region coordinates must be 0..255");
    }
    const requested = `m${mapX}_${mapY}`;
    const group = catalog.names.size ?
        catalog.names.get(djb2(requested)) : ((mapX << 8) | mapY);
    if (group === undefined || !catalog.fileIdForGroup.has(group)) {
        throw new Error(`No single-file terrain map group for region ${mapX},${mapY}`);
    }
    return group;
}

const cosine = new Int32Array(2048);
for (let i = 0; i < cosine.length; i++) {
    cosine[i] = Math.floor(65536 * Math.cos(i * Math.PI * 2 / 2048));
}
function noise(x, y) {
    let n = Math.imul(y, 57) + x;
    n = (n << 13) ^ n;
    const square = Math.imul(n, n);
    const value = (Math.imul(n, Math.imul(Math.imul(square, 15731) + 789221, 1)) + 1376312589) & 0x7fffffff;
    return (value >> 19) & 255;
}
function smoothNoise(x, y) {
    const corners = noise(x-1,y-1)+noise(x+1,y-1)+noise(x-1,y+1)+noise(x+1,y+1);
    const sides = noise(x-1,y)+noise(x+1,y)+noise(x,y-1)+noise(x,y+1);
    return (noise(x,y) >> 2) + (sides >> 3) + (corners >> 4);
}
function interpolate(a,b,offset,freq) {
    const factor = (65536 - cosine[offset*1024/freq]) >> 1;
    return ((Math.imul(factor,b) >> 16) + (Math.imul(65536-factor,a) >> 16));
}
function interpolatedNoise(x,y,freq) {
    const ix = (x/freq)|0, iy = (y/freq)|0;
    const dx = x & (freq-1), dy = y & (freq-1);
    return interpolate(
        interpolate(smoothNoise(ix,iy),smoothNoise(ix+1,iy),dx,freq),
        interpolate(smoothNoise(ix,iy+1),smoothNoise(ix+1,iy+1),dx,freq),
        dy,freq,
    );
}
export function baseTileHeight(x,y) {
    let v = interpolatedNoise(x+45365,y+91923,4)-128 +
        ((interpolatedNoise(x+10294,y+37821,2)-128)>>1) +
        ((interpolatedNoise(x,y,1)-128)>>2);
    v = ((.3*v)|0)+35;
    return Math.min(60,Math.max(10,v));
}

/** Decode all 4 planes so tile opcodes stay correctly aligned; show plane 0. */
export function decodeTerrainRegion(data,mapX,mapY) {
    if (!(data instanceof Uint8Array) || data.length > 16*1024*1024) {
        throw new Error("Unsafe terrain region data");
    }
    const heights = new Int32Array(PLANES*SIDE*SIDE);
    const underlays = new Uint16Array(SIDE*SIDE);
    const overlays = new Int16Array(SIDE*SIDE);
    let at = 0;
    const value = () => { requireBytes(data,at,2); const n=(data[at]<<8)|data[at+1]; at+=2; return n; };
    const heightByte = () => {requireBytes(data,at,1);return data[at++];};
    for(let plane=0;plane<PLANES;plane++)for(let x=0;x<SIDE;x++)for(let y=0;y<SIDE;y++){
        const loc = plane*SIDE*SIDE+x*SIDE+y;
        for(let opCount=0;opCount<64;opCount++){
            const op=value();
            if(op===0){
                heights[loc]=plane===0 ? -8*baseTileHeight(mapX*64+x+932731,mapY*64+y+556238) :
                    heights[loc-SIDE*SIDE]-240;
                break;
            }
            if(op===1){
                let h=heightByte();if(h===1)h=0;
                heights[loc]=plane===0 ? -h*8 : heights[loc-SIDE*SIDE]-h*8;
                break;
            }
            if(op<=49){
                let overlay=value();if(overlay&0x8000)overlay-=65536;
                if(plane===0)overlays[x*SIDE+y]=overlay;
            } else if(op>81){
                if(plane===0)underlays[x*SIDE+y]=op-81;
            }
            if(opCount===63)throw new Error("Malformed terrain tile with excessive opcodes");
        }
    }
    if(at!==data.length)throw new Error("Unexpected trailing terrain bytes");
    return {mapX,mapY,side:SIDE,heights:heights.subarray(0,SIDE*SIDE),
        underlays,overlays,sourceBytes:data.length};
}

/** One selected unencrypted map tile group; no object/loc/XTEA download. */
export async function loadNativeTerrain(cache,mapX=50,mapY=50) {
    const index=await cache.loadIndex(5);
    const reference=cache.referenceContainers.get(5);
    if(!(reference instanceof Uint8Array))throw new Error("Verified map reference table missing");
    const meta=await decodeCacheContainer({
        container:reference,
        uncompressedBytes:reference[0]===0?readU32(reference,1):readU32(reference,5),
    });
    const catalog=mapRegionCatalog(meta);
    if(catalog.revision!==index.revision)throw new Error("Map reference revision mismatch");
    const group=getTerrainGroup(catalog,mapX,mapY);
    const container=await cache.loadGroup(5,group); // CRC-verified by native client
    const payload=await decodeCacheContainer({
        container,
        uncompressedBytes:container[0]===0?readU32(container,1):readU32(container,5),
    });
    const terrain=decodeTerrainRegion(payload,mapX,mapY);
    return {...terrain,group,containerBytes:container.length};
}
