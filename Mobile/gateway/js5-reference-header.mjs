import { gunzipSync } from "node:zlib";

const MAX_DECODED_REFERENCE_BYTES = 16 * 1024 * 1024;
const MAX_ARCHIVE_COUNT = 200_000;

/**
 * Decode only the header and archive-ID deltas of an index-255 reference
 * table. The returned object has no cache data or reference-table bytes.
 *
 * Based on OpenRune-FileStore ReadOnlyCache.archiveData:
 * version u8 (5-7), revision u32 (v6+), flags u8, archive count
 * smart (v7 bigsmart, otherwise u16), then delta-encoded archive IDs.
 * Bzip2 containers are intentionally unsupported.
 */
export function decodeReferenceTableHeader(group, {
    maxDecodedBytes = MAX_DECODED_REFERENCE_BYTES,
} = {}) {
    if (!group || group.archive !== 255 || !Number.isInteger(group.group) ||
        group.group < 0 || group.group > 254) {
        throw new Error("Expected one index-255 archive reference table (255:0..254)");
    }
    if (!Number.isInteger(maxDecodedBytes) || maxDecodedBytes < 8 ||
        maxDecodedBytes > MAX_DECODED_REFERENCE_BYTES) {
        throw new RangeError("Decoded reference-table byte limit is invalid");
    }
    const buf = group.container;
    if (!Buffer.isBuffer(buf) || buf.length < 5) {
        throw new Error("Missing reference-table cache container");
    }
    const compression = buf[0];
    if (compression !== group.compression) {
        throw new Error("JS5 reference-table compression metadata mismatch");
    }
    if (compression !== 0 && compression !== 2) {
        throw new Error("Only uncompressed and gzip reference tables are supported");
    }
    const compressedSize = buf.readUInt32BE(1);
    const payloadStart = compression === 0 ? 5 : 9;
    if (buf.length < payloadStart || compressedSize !== buf.length - payloadStart) {
        throw new Error("Invalid JS5 reference-table cache-container length");
    }
    const declaredDecodedSize = compression === 0 ?
        compressedSize : buf.readUInt32BE(5);
    if (declaredDecodedSize > maxDecodedBytes ||
        declaredDecodedSize !== group.uncompressedBytes) {
        throw new Error("Unsafe or inconsistent reference-table decompressed length");
    }
    const bytes = compression === 0 ? buf.subarray(5) :
        gunzipSync(buf.subarray(9), { maxOutputLength: maxDecodedBytes });
    if (bytes.length !== declaredDecodedSize) {
        throw new Error("Reference-table decompressed size does not match header");
    }

    let at = 0;
    const need = (size) => {
        if (size < 0 || at + size > bytes.length) {
            throw new Error("Truncated reference-table metadata");
        }
    };
    const u8 = () => {
        need(1);
        return bytes[at++];
    };
    const u16 = () => {
        need(2);
        const n = bytes.readUInt16BE(at);
        at += 2;
        return n;
    };
    const u32 = () => {
        need(4);
        const n = bytes.readUInt32BE(at);
        at += 4;
        return n;
    };
    const smart = (format) => {
        if (format < 7) return u16();
        need(1);
        if ((bytes[at] & 0x80) !== 0) return u32() & 0x7fffffff;
        const n = u16();
        if (n === 32767) throw new Error("Unsupported sentinel archive count or ID");
        return n;
    };

    const format = u8();
    if (format < 5 || format > 7) {
        throw new Error(`Unsupported reference-table format version: ${format}`);
    }
    const revision = format >= 6 ? u32() : null;
    const flags = u8();
    const archiveCount = smart(format);
    if (archiveCount > MAX_ARCHIVE_COUNT || archiveCount > Math.floor((bytes.length - at) / 2)) {
        throw new Error("Reference-table archive count exceeds safe bounds");
    }
    let id = 0;
    let firstArchiveId = null;
    for (let i = 0; i < archiveCount; i++) {
        const delta = smart(format);
        if (i > 0 && delta === 0) {
            throw new Error("Reference-table archive IDs are not increasing");
        }
        id += delta;
        if (id > 0x7fffffff) throw new Error("Reference-table archive ID overflow");
        if (firstArchiveId === null) firstArchiveId = id;
    }
    return {
        format,
        revision,
        flags,
        archiveCount,
        firstArchiveId,
        lastArchiveId: archiveCount ? id : null,
        compressedBytes: compressedSize,
        decodedBytes: bytes.length,
    };
}

/** Require an explicit equality check; never treat the CRC32 as a revision check. */
export function verifyReferenceRevision(header, expectedRevision) {
    if (!header || !Number.isInteger(expectedRevision) ||
        expectedRevision < 0 || expectedRevision > 0xffffffff) {
        throw new Error("Invalid reference-table revision metadata");
    }
    if (header.revision === null || header.revision === undefined) {
        throw new Error("Reference-table format lacks a revision to cross-check");
    }
    if (header.revision !== expectedRevision) {
        throw new Error(`Reference-table revision mismatch: master index ${expectedRevision}, reference table ${header.revision}`);
    }
    return true;
}
