// Native OSRS/rsprot revision-240 JS5 group wire parser.
// rsprot Js5Service.prepareJs5Buffer(): archive u8, group u16,
// cache container (compression u8, compressed length u32, optional raw length
// u32, group bytes); insert 0xFF separator after each 512-byte wire block.
// This module never decompresses or writes copyrighted cache bytes to disk.
const MAX_MASTER_INDEX_BYTES = 2 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

export function encodeJs5UrgentRequest(archive = 255, group = 255) {
    if (!Number.isInteger(archive) || archive < 0 || archive > 255 ||
        !Number.isInteger(group) || group < 0 || group > 65535) {
        throw new RangeError("JS5 archive and group IDs are out of range");
    }
    const request = Buffer.alloc(4);
    request[0] = 1; // Js5ClientProt.URGENT_REQUEST
    request[1] = archive;
    request.writeUInt16BE(group, 2);
    return request;
}

export class Js5GroupAssembler {
    constructor({ archive = 255, group = 255, maxContainerBytes = MAX_MASTER_INDEX_BYTES } = {}) {
        encodeJs5UrgentRequest(archive, group); // validate target
        if (!Number.isInteger(maxContainerBytes) || maxContainerBytes < 9 ||
            maxContainerBytes > MAX_MASTER_INDEX_BYTES) {
            throw new RangeError("JS5 group byte limit out of range");
        }
        this.archive = archive;
        this.group = group;
        this.maxContainerBytes = maxContainerBytes;
        this.parts = [];
        this.received = 0;
        this.expectedWireBytes = null;
        this.expectedRawBytes = null;
        this.completed = false;
    }

    push(chunk) {
        if (this.completed) throw new Error("JS5 group already completed");
        if (!Buffer.isBuffer(chunk)) throw new TypeError("JS5 group chunk must be a Buffer");
        if (chunk.length === 0) return null;
        const maxWireBytes = this.maxContainerBytes + 3 +
            Math.ceil((this.maxContainerBytes + 3) / 511);
        if (this.received + chunk.length > maxWireBytes) {
            throw new Error("JS5 group exceeds the configured byte limit");
        }
        this.parts.push(chunk);
        this.received += chunk.length;

        if (this.expectedWireBytes === null && this.received >= 8) {
            const first = Buffer.concat(this.parts, this.received);
            const receivedArchive = first[0];
            const receivedGroup = first.readUInt16BE(1);
            if (receivedArchive !== this.archive || receivedGroup !== this.group) {
                throw new Error("JS5 group response identifier does not match the request");
            }
            const compression = first[3];
            if (![0, 1, 2].includes(compression)) {
                throw new Error("JS5 group compression type is unsupported");
            }
            const compressedLength = first.readUInt32BE(4);
            const containerLength = (compression === 0 ? 5 : 9) + compressedLength;
            if (containerLength > this.maxContainerBytes) {
                throw new Error("JS5 group length exceeds the configured byte limit");
            }
            const rawBytes = containerLength + 3;
            const separators = rawBytes > 512 ? Math.ceil((rawBytes - 512) / 511) : 0;
            this.expectedRawBytes = rawBytes;
            this.expectedWireBytes = rawBytes + separators;
        }
        if (this.expectedWireBytes !== null && this.received > this.expectedWireBytes) {
            throw new Error("JS5 response has unexpected trailing bytes");
        }
        if (this.expectedWireBytes === null || this.received < this.expectedWireBytes) return null;

        const wire = Buffer.concat(this.parts, this.received);
        const raw = Buffer.alloc(this.expectedRawBytes);
        let src = 0;
        let dst = 0;
        while (src < wire.length) {
            if (src !== 0) {
                if (wire[src++] !== 0xFF) {
                    throw new Error("JS5 continuation block has an invalid separator");
                }
            }
            const limit = src === 0 ? 512 : 511;
            const length = Math.min(limit, wire.length - src);
            wire.copy(raw, dst, src, src + length);
            src += length;
            dst += length;
        }
        if (dst !== raw.length) throw new Error("Incomplete JS5 group after decoding block separators");
        const compression = raw[3];
        const compressedBytes = raw.readUInt32BE(4);
        const uncompressedBytes = compression === 0 ? compressedBytes : raw.readUInt32BE(8);
        if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
            throw new Error("JS5 group advertises an unsafe decompressed length");
        }
        this.completed = true;
        this.parts = [];
        return {
            archive: this.archive,
            group: this.group,
            compression,
            compressedBytes,
            uncompressedBytes,
            container: raw.subarray(3),
        };
    }
}
