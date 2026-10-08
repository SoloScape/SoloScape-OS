// Small, browser-native OSRS indexed-sprite decoder for the first visible
// SoloScape graphic. Based on TSPS client/rs/sprite/SpriteLoader.ts (BSD-2-Clause).
// This is an isolated Canvas preview, not the TSPS WebGL game renderer.
import { decodeCacheContainer, NativeJs5Cache } from "./native-js5.mjs";

const MAX_SPRITES = 512;
const MAX_DIMENSION = 2048;
const MAX_TOTAL_PIXELS = 4 * 1024 * 1024;
const MAX_CATALOG_FILES = 2 * 1024 * 1024;
function u16(data, offset) {
    return (data[offset] << 8) | data[offset + 1];
}
function u32(data, offset) {
    return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, false);
}
function requireRange(data, offset, size, end = data.length) {
    if (!Number.isInteger(offset) || !Number.isInteger(size) ||
        offset < 0 || size < 0 || offset + size > end) {
        throw new Error("Truncated or inconsistent OSRS sprite/cache metadata");
    }
}

/** Find single-file groups without loading any sprites into memory yet. */
export function decodeReferenceSingleFileGroups(data) {
    if (!(data instanceof Uint8Array)) throw new TypeError("Expected reference-table bytes");
    let at = 0;
    const take = n => {
        requireRange(data, at, n);
        const offset = at;
        at += n;
        return offset;
    };
    const read8 = () => data[take(1)];
    const read16 = () => u16(data, take(2));
    const read32 = () => u32(data, take(4));
    const readSmart = format => {
        if (format < 7) return read16();
        requireRange(data, at, 1);
        if (data[at] & 0x80) return read32() & 0x7fffffff;
        const num = read16();
        if (num === 32767) throw new Error("Unsupported reference-table sentinel");
        return num;
    };
    const format = read8();
    if (format < 5 || format > 7) throw new Error("Unsupported reference-table format");
    const revision = format >= 6 ? read32() : null;
    const flags = read8();
    if (flags & ~15) throw new Error("Unsupported reference-table flags");
    const count = readSmart(format);
    if (count > 200000 || count * 2 > data.length - at) throw new Error("Unsafe reference-table archive count");
    const ids = [];
    let id = 0;
    for (let i = 0; i < count; i++) {
        const delta = readSmart(format);
        if (i && delta === 0) throw new Error("Duplicate reference-table archive ID");
        id += delta;
        if (id > 65535) throw new Error("Archive ID outside native JS5 group range");
        ids.push(id);
    }
    // Order matches OpenRune-FileStore's ReadOnlyCache.archiveData().
    if (flags & 1) take(count * 4);  // archive name hashes
    take(count * 4);                  // group CRC32s, checked by NativeJs5Cache
    if (flags & 8) take(count * 4);  // uncompressed CRC32s
    if (flags & 2) take(count * 64); // Whirlpool hashes
    if (flags & 4) take(count * 8);  // compressed/uncompressed lengths
    take(count * 4);                  // group revisions
    const fileCounts = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        const n = readSmart(format);
        total += n;
        if (total > MAX_CATALOG_FILES || total > data.length) {
            throw new Error("Reference-table file count is unsafe");
        }
        fileCounts.push(n);
    }
    const singleFile = [];
    for (let i = 0; i < count; i++) {
        let fileId = 0;
        for (let j = 0; j < fileCounts[i]; j++) {
            const delta = readSmart(format);
            if (j && delta === 0) throw new Error("Duplicate file ID in archive");
            fileId += delta;
            if (fileId > 0x7fffffff) throw new Error("File ID overflow");
        }
        if (fileCounts[i] === 1) singleFile.push({ group: ids[i], fileId });
    }
    if (flags & 1) take(total * 4); // file name hashes
    if (at !== data.length) throw new Error("Reference table has unexpected trailing metadata");
    return { format, revision, groupCount: count, singleFile };
}

/**
 * TSPS SpriteLoader.load() indexed palette sprite format, with strict bounds.
 * Returns all decoded frame pixels as RGBA image data (no canvas needed).
 */
export function decodeIndexedSprites(data) {
    if (!(data instanceof Uint8Array) || data.length < 8) {
        throw new Error("Invalid OSRS indexed sprite file");
    }
    const count = u16(data, data.length - 2);
    if (count < 1 || count > MAX_SPRITES) throw new Error("Unsupported sprite count");
    const metadata = data.length - 7 - count * 8;
    requireRange(data, metadata, count * 8 + 5, data.length - 2);
    const canvasWidth = u16(data, metadata);
    const canvasHeight = u16(data, metadata + 2);
    const paletteCount = data[metadata + 4] + 1;
    if (canvasWidth < 1 || canvasWidth > MAX_DIMENSION ||
        canvasHeight < 1 || canvasHeight > MAX_DIMENSION) {
        throw new Error("Unsafe sprite sheet dimensions");
    }
    const paletteOffset = metadata - (paletteCount - 1) * 3;
    requireRange(data, paletteOffset, (paletteCount - 1) * 3, metadata);
    const palette = new Uint32Array(paletteCount);
    for (let p = 1; p < paletteCount; p++) {
        const offset = paletteOffset + (p - 1) * 3;
        palette[p] = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
        if (palette[p] === 0) palette[p] = 1;
    }
    const offsets = [];
    for (let i = 0; i < count; i++) {
        const x = u16(data, metadata + 5 + i * 2);
        const y = u16(data, metadata + 5 + count * 2 + i * 2);
        const width = u16(data, metadata + 5 + count * 4 + i * 2);
        const height = u16(data, metadata + 5 + count * 6 + i * 2);
        if (!width || !height || x + width > canvasWidth || y + height > canvasHeight) {
            throw new Error("Invalid OSRS sprite frame coordinates");
        }
        offsets.push({ x, y, width, height });
    }
    let at = 0;
    let totalPixels = 0;
    const sprites = [];
    for (const frame of offsets) {
        const pixelsCount = frame.width * frame.height;
        totalPixels += pixelsCount;
        if (totalPixels > MAX_TOTAL_PIXELS) throw new Error("Sprite pixel budget exceeded");
        requireRange(data, at, 1, paletteOffset);
        const flags = data[at++];
        if ((flags & ~3) !== 0) throw new Error("Unsupported indexed-sprite storage layout");
        const column = (flags & 1) !== 0;
        const withAlpha = (flags & 2) !== 0;
        requireRange(data, at, pixelsCount * (withAlpha ? 2 : 1), paletteOffset);
        const indices = new Uint8Array(pixelsCount);
        for (let i = 0; i < pixelsCount; i++) {
            const x = column ? Math.floor(i / frame.height) : i % frame.width;
            const y = column ? i % frame.height : Math.floor(i / frame.width);
            indices[y * frame.width + x] = data[at++];
        }
        const alphas = withAlpha ? new Uint8Array(pixelsCount) : null;
        if (alphas) {
            for (let i = 0; i < pixelsCount; i++) {
                const x = column ? Math.floor(i / frame.height) : i % frame.width;
                const y = column ? i % frame.height : Math.floor(i / frame.width);
                alphas[y * frame.width + x] = data[at++];
            }
        }
        const rgba = new Uint8ClampedArray(pixelsCount * 4);
        for (let i = 0; i < pixelsCount; i++) {
            const idx = indices[i];
            if (idx >= paletteCount) throw new Error("Sprite palette index out of range");
            const rgb = palette[idx];
            rgba[i * 4] = (rgb >>> 16) & 255;
            rgba[i * 4 + 1] = (rgb >>> 8) & 255;
            rgba[i * 4 + 2] = rgb & 255;
            rgba[i * 4 + 3] = alphas ? alphas[i] : idx === 0 ? 0 : 255;
        }
        sprites.push({ ...frame, sheetWidth: canvasWidth, sheetHeight: canvasHeight, rgba });
    }
    if (at !== paletteOffset) throw new Error("Sprite pixels do not align with palette metadata");
    return sprites;
}

export function drawIndexedSprite(canvas, frame) {
    if (!canvas || typeof canvas.getContext !== "function") throw new TypeError("Canvas is required");
    canvas.width = frame.sheetWidth;
    canvas.height = frame.sheetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D Canvas is not supported");
    const pixels = context.createImageData(frame.width, frame.height);
    pixels.data.set(frame.rgba);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(pixels, frame.x, frame.y);
}

/**
 * Load one verified revision-240 sprite group from archive/index 8 and turn
 * the first sprite frame into a drawable RGBA image. Select only reference-
 * catalog entries containing ONE file to avoid misdecoding multi-file groups.
 *
 * maxAttempts is an explicit small ceiling, not bulk asset download.
 */
export async function loadFirstSprite(cache, { maxAttempts = 8 } = {}) {
    if (!(cache instanceof NativeJs5Cache)) throw new TypeError("NativeJs5Cache required");
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 16) {
        throw new RangeError("Invalid bounded sprite selection limit");
    }
    const index = await cache.loadIndex(8);
    const refContainer = cache.referenceContainers.get(8);
    if (!(refContainer instanceof Uint8Array)) throw new Error("Verified sprite reference table missing");
    const rawReference = await decodeCacheContainer({
        container: refContainer,
        uncompressedBytes: refContainer[0] === 0 ? u32(refContainer, 1) : u32(refContainer, 5),
    });
    const files = decodeReferenceSingleFileGroups(rawReference);
    if (files.revision !== index.revision) throw new Error("Sprite reference-table revision mismatch");
    let attempted = 0;
    let lastError;
    for (const candidate of files.singleFile) {
        if (!index.groups.has(candidate.group)) continue;
        if (++attempted > maxAttempts) break;
        try {
            const container = await cache.loadGroup(8, candidate.group);
            const decoded = await decodeCacheContainer({
                container,
                uncompressedBytes: container[0] === 0 ? u32(container, 1) : u32(container, 5),
            });
            const sprites = decodeIndexedSprites(decoded);
            return {
                archive: 8, group: candidate.group, fileId: candidate.fileId,
                frameCount: sprites.length, frame: sprites[0],
                decodedBytes: decoded.length,
            };
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`No supported single-file sprite could be rendered in ${Math.min(attempted, maxAttempts)} candidates: ${lastError?.message || "none present"}`);
}
