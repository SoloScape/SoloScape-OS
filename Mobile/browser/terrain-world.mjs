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
    const fileIdsForGroup = new Map();
    for (let i = 0; i < count; i++) {
        let fileId = 0;
        const fileIds = [];
        for (let f = 0; f < counts[i]; f++) {
            const delta = smart(format);
            if (f && !delta) throw new Error("Duplicate file ID");
            fileId += delta;
            if (fileId > 0x7fffffff) throw new Error("Map archive file ID overflow");
            fileIds.push(fileId);
        }
        if (fileIds.length > 0) fileIdsForGroup.set(ids[i], fileIds);
        if (fileIds.length === 1) fileIdForGroup.set(ids[i], fileIds[0]);
    }
    if (flags & 1) need(totalFiles * 4);
    if (at !== data.length) throw new Error("Unsupported trailing map reference metadata");
    return { format, revision, ids, names, fileIdForGroup, fileIdsForGroup };
}

function validateRegion(mapX, mapY) {
    if (!Number.isInteger(mapX) || !Number.isInteger(mapY) ||
        mapX < 0 || mapX > 255 || mapY < 0 || mapY > 255) {
        throw new RangeError("Map region coordinates must be 0..255");
    }
}

function terrainFileIds(catalog, group) {
    const ids = catalog.fileIdsForGroup?.get(group);
    if (ids) return ids.length === 1 || ids.includes(0) ? ids : null;
    // Compatibility with the original one-file metadata parser.
    const one = catalog.fileIdForGroup?.get(group);
    return one === undefined ? null : [one];
}

function terrainGroupFor(catalog, mapX, mapY) {
    const group = catalog.names.size ?
        catalog.names.get(djb2(`m${mapX}_${mapY}`)) : ((mapX << 8) | mapY);
    return group === undefined || !terrainFileIds(catalog, group) ? undefined : group;
}

export function getTerrainGroup(catalog, mapX, mapY) {
    validateRegion(mapX, mapY);
    const group = terrainGroupFor(catalog, mapX, mapY);
    if (group === undefined) {
        throw new Error(`Terrain region m${mapX}_${mapY} is not present as a supported map archive in the verified cache`);
    }
    return group;
}

/**
 * Start at the selected map if it exists. For the INITIAL world view only,
 * locate the closest actual named mX_Y group instead of assuming Lumbridge
 * m50_50 exists in every custom cache. Never fabricate a region or group.
 */
export function resolveTerrainRegion(catalog, mapX, mapY, { allowFallback = false } = {}) {
    validateRegion(mapX, mapY);
    const direct = terrainGroupFor(catalog, mapX, mapY);
    if (direct !== undefined) {
        return { mapX, mapY, group: direct, fallback: false };
    }
    if (!allowFallback) return { mapX, mapY, group: getTerrainGroup(catalog, mapX, mapY), fallback: false };

    let chosen = null;
    const consider = (x, y, group) => {
        if (!terrainFileIds(catalog, group)) return;
        const distance = Math.abs(x - mapX) + Math.abs(y - mapY);
        if (!chosen || distance < chosen.distance) {
            chosen = { mapX: x, mapY: y, group, fallback: true, distance };
        }
    };
    if (catalog.names.size) {
        for (let x = 0; x < 256; x++) {
            for (let y = 0; y < 256; y++) {
                const group = catalog.names.get(djb2(`m${x}_${y}`));
                if (group !== undefined) consider(x, y, group);
            }
        }
    } else {
        for (const group of catalog.ids) consider(group >>> 8, group & 255, group);
    }
    if (!chosen) {
        throw new Error("Cache map index 5 has no supported, named terrain regions; the world cannot be rendered from this cache");
    }
    const { distance: _distance, ...result } = chosen;
    return result;
}

/** Extract terrain file 0 from a multi-file native JS5 archive container.
 * The end-of-archive chunk table is the same format used by TSPS
 * Archive.decode() and OpenRune ReadOnlyCache.readArchive().
 */
export function extractTerrainFile(data, fileIds) {
    if (!(data instanceof Uint8Array) || data.length > 16 * 1024 * 1024 ||
        !Array.isArray(fileIds) || fileIds.length < 1 || fileIds.length > 64) {
        throw new Error("Unsupported terrain archive file layout");
    }
    if (fileIds.length === 1) return data;
    const wanted = fileIds.indexOf(0);
    if (wanted < 0) throw new Error("Multi-file terrain archive has no file ID 0");
    requireBytes(data, data.length - 1, 1);
    const chunks = data[data.length - 1];
    const n = fileIds.length;
    if (chunks === 0 || chunks > 128) throw new Error("Invalid terrain archive chunk count");
    const tableStart = data.length - 1 - chunks * n * 4;
    if (tableStart < 0) throw new Error("Truncated terrain archive chunk table");
    const sizes = new Uint32Array(n);
    let offset = tableStart;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let chunk = 0; chunk < chunks; chunk++) {
        let partSize = 0;
        for (let file = 0; file < n; file++) {
            partSize += view.getInt32(offset, false);
            offset += 4;
            if (!Number.isSafeInteger(partSize) || partSize < 0 || partSize > tableStart) {
                throw new Error("Invalid terrain archive chunk length");
            }
            sizes[file] += partSize;
            if (sizes[file] > tableStart) throw new Error("Terrain archive file is too large");
        }
    }
    const target = new Uint8Array(sizes[wanted]);
    offset = tableStart;
    let sourceOffset = 0, targetOffset = 0;
    for (let chunk = 0; chunk < chunks; chunk++) {
        let partSize = 0;
        for (let file = 0; file < n; file++) {
            partSize += view.getInt32(offset, false);
            offset += 4;
            if (sourceOffset + partSize > tableStart) throw new Error("Terrain archive chunk overflow");
            if (file === wanted) {
                target.set(data.subarray(sourceOffset, sourceOffset + partSize), targetOffset);
                targetOffset += partSize;
            }
            sourceOffset += partSize;
        }
    }
    if (sourceOffset !== tableStart || targetOffset !== target.length) {
        throw new Error("Terrain archive chunk boundaries are inconsistent");
    }
    return target;
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

/**
 * TSPS SceneBuilder.decodeTerrain() parses 4*64*64 tiles but does NOT
 * require the tile stream to consume every source byte. Region files can
 * contain a suffix; do not treat that alone as a corrupt cache group.
 *
 * Rev 209+ clients use 16-bit opcodes/overlay IDs. Custom map archives can
 * retain the legacy 8-bit layout; accept that layout only when it consumes
 * the ENTIRE terrain stream, never based on a partial prefix.
 */
function decodeTerrainTiles(data,mapX,mapY,opcodeWidth) {
    const heights=new Int32Array(PLANES*SIDE*SIDE);
    const underlays=new Uint16Array(SIDE*SIDE);
    const overlays=new Int16Array(SIDE*SIDE);
    const overlayShapes=new Uint8Array(SIDE*SIDE);
    const overlayRotations=new Uint8Array(SIDE*SIDE);
    let at=0;
    const nextOpcode=()=>{
        requireBytes(data,at,opcodeWidth);
        if(opcodeWidth===1)return data[at++];
        const n=(data[at]<<8)|data[at+1];at+=2;return n;
    };
    const overlayValue=()=>{
        if(opcodeWidth===1){
            requireBytes(data,at,1);
            const n=data[at++];
            return n>127?n-256:n;
        }
        requireBytes(data,at,2);
        const n=(data[at]<<8)|data[at+1];at+=2;
        return n>32767?n-65536:n;
    };
    const heightByte=()=>{requireBytes(data,at,1);return data[at++];};
    for(let plane=0;plane<PLANES;plane++)for(let x=0;x<SIDE;x++)for(let y=0;y<SIDE;y++){
        const loc=plane*SIDE*SIDE+x*SIDE+y;
        let ended=false;
        for(let opCount=0;opCount<64;opCount++){
            const op=nextOpcode();
            if(op===0){
                heights[loc]=plane===0?
                    -8*baseTileHeight(mapX*SIDE+x+932731,mapY*SIDE+y+556238):
                    heights[loc-SIDE*SIDE]-240;
                ended=true;
                break;
            }
            if(op===1){
                let h=heightByte();if(h===1)h=0;
                heights[loc]=plane===0?-h*8:heights[loc-SIDE*SIDE]-h*8;
                ended=true;
                break;
            }
            if(op<=49){
                const overlay=overlayValue();
                if(plane===0){
                    overlays[x*SIDE+y]=overlay;
                    overlayShapes[x*SIDE+y]=(op-2)>>2;
                    overlayRotations[x*SIDE+y]=(op-2)&3;
                }
            }else if(op>81){
                if(plane===0)underlays[x*SIDE+y]=op-81;
            }
        }
        if(!ended)throw new Error("Malformed terrain tile with excessive opcodes");
    }
    return {
        mapX,mapY,side:SIDE,heights:heights.subarray(0,SIDE*SIDE),
        underlays,overlays,overlayShapes,overlayRotations,
        sourceBytes:data.length,consumedBytes:at,
        trailingBytes:data.length-at,terrainFormat:opcodeWidth===2?"u16":"u8",
    };
}

export function decodeTerrainRegion(data,mapX,mapY) {
    if(!(data instanceof Uint8Array)||data.length===0||data.length>16*1024*1024){
        throw new Error("Unsafe terrain region data");
    }
    // The documented revision-240 layout is u16. Use it whenever it
    // consumes the whole file. Test legacy u8 only for a full-file match.
    let modern=null,modernError=null;
    try{
        modern=decodeTerrainTiles(data,mapX,mapY,2);
        if(modern.trailingBytes===0)return modern;
    }catch(error){modernError=error;}
    try{
        const legacy=decodeTerrainTiles(data,mapX,mapY,1);
        if(legacy.trailingBytes===0)return legacy;
    }catch{
        // A custom map might only support the modern format.
    }
    // TSPS SceneBuilder does not insist the decoded tile data reaches EOF.
    // Only accept a fully completed 16-bit tile grid (already bounded and
    // verified by native JS5 CRC). Surface the exact suffix byte count in UI.
    if(modern)return modern;
    throw modernError??new Error("Terrain data does not contain a complete 4-plane tile grid");
}

/** One selected unencrypted map tile group; no object/loc/XTEA download. */
export async function loadNativeTerrain(cache,mapX=50,mapY=50,{allowFallback=false}={}) {
    const index=await cache.loadIndex(5);
    const reference=cache.referenceContainers.get(5);
    if(!(reference instanceof Uint8Array))throw new Error("Verified map reference table missing");
    const meta=await decodeCacheContainer({
        container:reference,
        uncompressedBytes:reference[0]===0?readU32(reference,1):readU32(reference,5),
    });
    const catalog=mapRegionCatalog(meta);
    if(catalog.revision!==index.revision)throw new Error("Map reference revision mismatch");
    const selected=resolveTerrainRegion(catalog,mapX,mapY,{allowFallback});
    const container=await cache.loadGroup(5,selected.group); // CRC-verified by native client
    const payload=await decodeCacheContainer({
        container,
        uncompressedBytes:container[0]===0?readU32(container,1):readU32(container,5),
    });
    const terrainBytes=extractTerrainFile(payload,terrainFileIds(catalog,selected.group));
    const terrain=decodeTerrainRegion(terrainBytes,selected.mapX,selected.mapY);
    return {...terrain,group:selected.group,containerBytes:container.length,
        requestedMapX:mapX,requestedMapY:mapY,fallback:selected.fallback};
}

/** Load the eight surrounding regions without substituting absent/corrupt data.
 * The selected region is already visible; optional failures stay local to an edge.
 */
export async function loadTerrainNeighbours(cache,terrain,{isCurrent=()=>true}={}) {
    const neighbours=new Map(), unavailable=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(!dx&&!dy)continue;
        if(!isCurrent())return null;
        const mapX=terrain.mapX+dx,mapY=terrain.mapY+dy;
        if(mapX<0||mapX>255||mapY<0||mapY>255){
            unavailable.push({mapX,mapY,reason:"Outside map coordinate range"});continue;
        }
        try{
            const region=await loadNativeTerrain(cache,mapX,mapY);
            neighbours.set(`${dx},${dy}`,region);
        }catch(error){
            unavailable.push({mapX,mapY,reason:error?.message??String(error)});
        }
    }
    return isCurrent()?{...terrain,neighbours,unavailableNeighbours:unavailable}:null;
}
