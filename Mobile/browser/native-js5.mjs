// Browser-native SoloScape OSRS revision-240 JS5 cache transport.
// No Node Buffer, npm modules or account credentials. Verified public
// containers may be cached with the browser's origin-scoped CacheStorage.
// This is a renderer-facing cache service, NOT a TSPS packet adapter.
import {BrowserJs5Storage} from "./js5-persistent.mjs";

const MAX_CONTAINER = 2 * 1024 * 1024;
const MAX_DECODED = 16 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    let crc = n;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    return crc >>> 0;
});

export function crc32(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new TypeError("CRC input must be bytes");
    let crc = 0xffffffff;
    for (const n of bytes) crc = crcTable[(crc ^ n) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function u32(bytes, offset) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function checkNumber(n, max, name) {
    if (!Number.isInteger(n) || n < 0 || n > max) throw new RangeError(name + " is out of range");
}

export function encodeJs5Handshake(revision = 240) {
    checkNumber(revision, 0x7fffffff, "Revision");
    if (revision === 0) throw new RangeError("Revision must be positive");
    const packet = new Uint8Array(21);
    const view = new DataView(packet.buffer);
    packet[0] = 15;
    view.setUint32(1, revision, false);
    const random = new Uint8Array(16);
    crypto.getRandomValues(random);
    packet.set(random, 5);
    return packet;
}

export function encodeUrgentRequest(archive, group) {
    checkNumber(archive, 255, "Archive");
    checkNumber(group, 65535, "Group");
    return Uint8Array.of(1, archive, group >>> 8, group & 255);
}

export function validateNativeGatewayUrl(raw) {
    const endpoint = new URL(raw);
    if (!["ws:", "wss:"].includes(endpoint.protocol) ||
        endpoint.username || endpoint.password || endpoint.pathname !== "/" ||
        endpoint.search || endpoint.hash) {
        throw new Error("Native gateway must be a WebSocket URL with path / and no credentials");
    }
    if (endpoint.protocol === "ws:" && !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)) {
        throw new Error("Insecure WebSocket traffic is allowed for loopback only");
    }
    return endpoint.toString();
}

export class Js5GroupReader {
    constructor(archive, group) {
        encodeUrgentRequest(archive, group);
        this.archive = archive;
        this.group = group;
        this.parts = [];
        this.length = 0;
        this.expected = null;
        this.uncompressedBytes = 0;
        this.compression = 0;
        this.done = false;
    }

    push(bytes) {
        if (this.done) throw new Error("Group already completed");
        if (!(bytes instanceof Uint8Array)) throw new TypeError("Expected JS5 byte stream");
        if (bytes.byteLength === 0) return null;
        this.parts.push(bytes);
        this.length += bytes.length;
        if (this.length > MAX_CONTAINER + 4096) throw new Error("JS5 group too large");
        // The first 8 wire bytes are archive, group, compression, compressed length.
        if (this.expected === null && this.length >= 8) {
            const first = new Uint8Array(8);
            let offset = 0;
            for (const part of this.parts) {
                const amount = Math.min(8 - offset, part.length);
                first.set(part.subarray(0, amount), offset);
                offset += amount;
                if (offset === 8) break;
            }
            if (first[0] !== this.archive || (first[1] << 8 | first[2]) !== this.group) {
                throw new Error("JS5 response group ID mismatch");
            }
            this.compression = first[3];
            if (![0, 2].includes(this.compression)) throw new Error("Unsupported JS5 compression");
            const compressedLength = u32(first, 4);
            const containerLength = compressedLength + (this.compression === 0 ? 5 : 9);
            if (containerLength > MAX_CONTAINER || containerLength < (this.compression === 0 ? 5 : 9)) {
                throw new Error("JS5 compressed group exceeds 2 MiB limit");
            }
            const rawLength = containerLength + 3;
            this.expected = rawLength + (rawLength > 512 ? Math.ceil((rawLength - 512) / 511) : 0);
        }
        if (this.expected === null || this.length < this.expected) return null;
        if (this.length !== this.expected) throw new Error("Unexpected extra JS5 bytes");
        const wire = new Uint8Array(this.length);
        let n = 0;
        for (const chunk of this.parts) { wire.set(chunk, n); n += chunk.length; }
        const raw = new Uint8Array(this.expected - (this.expected > 512 ? Math.ceil((this.expected - 512) / 512) : 0));
        let src = 0, dst = 0;
        while (src < wire.length) {
            if (src !== 0 && wire[src++] !== 255) throw new Error("Invalid JS5 continuation marker");
            const take = Math.min(src === 0 ? 512 : 511, wire.length - src);
            raw.set(wire.subarray(src, src + take), dst);
            dst += take;
            src += take;
        }
        if (dst !== raw.length) throw new Error("Bad JS5 block boundaries");
        const container = raw.slice(3);
        // Index-5 XTEA begins at byte 5, including the expansion-length word.
        // Defer that bound to decodeCacheContainer after CRC verification and
        // optional decryption; the clear compressed size remains bounded here.
        this.uncompressedBytes = this.archive===5&&this.compression!==0 ? null :
            (this.compression === 0 ? u32(container, 1) : u32(container, 5));
        if (this.uncompressedBytes > MAX_DECODED) throw new Error("Unsafe uncompressed group size");
        this.done = true;
        this.parts = [];
        return {
            archive: this.archive,
            group: this.group,
            container,
            compression: this.compression,
            uncompressedBytes: this.uncompressedBytes,
        };
    }
}

export function decodeMasterIndex(result) {
    if (result.archive !== 255 || result.group !== 255 || result.compression !== 0) {
        throw new Error("Expected uncompressed JS5 master index");
    }
    const bytes = result.container;
    if (bytes.length < 13 || bytes[0] !== 0 || u32(bytes, 1) !== bytes.length - 5 ||
        (bytes.length - 5) % 8 !== 0 || bytes.length > 5 + 255 * 8) {
        throw new Error("Invalid master-index CRC/version entries");
    }
    const entries = [];
    for (let i = 5; i < bytes.length; i += 8) {
        entries.push({ archive: (i - 5) / 8, crc: u32(bytes, i), revision: u32(bytes, i + 4) });
    }
    return entries;
}

export async function decodeCacheContainer(result, maxDecodedBytes = MAX_DECODED) {
    const bytes = result.container;
    const compression = bytes[0];
    if (![0, 2].includes(compression) || bytes.length < (compression === 2 ? 9 : 5)) {
        throw new Error("Unsupported cache container");
    }
    const start = compression === 0 ? 5 : 9;
    if (u32(bytes, 1) !== bytes.length - start) throw new Error("Cache container size mismatch");
    const expected = compression === 0 ? bytes.length - start : u32(bytes, 5);
    if (expected > maxDecodedBytes || expected !== result.uncompressedBytes) {
        throw new Error("Unsafe cache expansion length");
    }
    if (compression === 0) return bytes.subarray(5);
    if (typeof DecompressionStream !== "function") {
        throw new Error("This browser lacks gzip DecompressionStream support");
    }
    const stream = new Blob([bytes.subarray(9)]).stream().pipeThrough(new DecompressionStream("gzip"));
    const reader = stream.getReader();
    const parts = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxDecodedBytes || total > expected) throw new Error("Gzip output exceeds limit");
            parts.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    if (total !== expected) throw new Error("Gzip result size mismatch");
    const output = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
}

export function decodeReferenceCatalog(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 8) throw new Error("Truncated reference table");
    let at = 0;
    const requireBytes = count => {
        if (at + count > bytes.length) throw new Error("Truncated reference table");
    };
    const readU8 = () => { requireBytes(1); return bytes[at++]; };
    const readU16 = () => { requireBytes(2); const v = bytes[at] << 8 | bytes[at + 1]; at += 2; return v; };
    const readU32 = () => { requireBytes(4); const v = u32(bytes, at); at += 4; return v; };
    const readSmart = (version) => {
        if (version < 7) return readU16();
        requireBytes(1);
        if ((bytes[at] & 0x80) !== 0) return readU32() & 0x7fffffff;
        const n = readU16();
        if (n === 32767) throw new Error("Unsupported bigsmart sentinel");
        return n;
    };
    const version = readU8();
    if (version < 5 || version > 7) throw new Error("Unsupported reference table version");
    const revision = version >= 6 ? readU32() : null;
    const flags = readU8();
    if (flags & ~15) throw new Error("Unknown reference-table flags");
    const count = readSmart(version);
    if (count > 200000 || count > (bytes.length - at) / 2) throw new Error("Unsafe archive count");
    const ids = [];
    let id = 0;
    for (let i = 0; i < count; i++) {
        const delta = readSmart(version);
        if (i && !delta) throw new Error("Duplicate group ID");
        id += delta;
        if (id > 65535) throw new Error("Group ID exceeds native JS5 u16 limit");
        ids.push(id);
    }
    if (flags & 1) { requireBytes(count * 4); at += count * 4; }
    requireBytes(count * 4);
    const groups = new Map();
    for (const group of ids) groups.set(group, readU32());
    return { version, revision, flags, groups };
}

export class NativeJs5Cache {
    constructor({ url = "ws://127.0.0.1:43595/", revision = 240,
        WebSocketClass = globalThis.WebSocket, timeoutMs = 10000,persistentStore=undefined } = {}) {
        this.url = validateNativeGatewayUrl(url);
        checkNumber(revision, 0x7fffffff, "Revision");
        if (revision === 0) throw new Error("Revision must be positive");
        if (typeof WebSocketClass !== "function") throw new Error("Browser WebSocket support is missing");
        if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
            throw new Error("Invalid socket timeout");
        }
        this.WebSocketClass = WebSocketClass;
        this.revision = revision;
        this.timeoutMs = timeoutMs;
        this.persistent=persistentStore===undefined?new BrowserJs5Storage({revision}):persistentStore;
        this.master = null;
        this.indices = new Map();
        // Full validated index-255 reference table cache containers for TSPS's
        // CacheIndexDat2.fromStore() -> store.read(255, indexId) path.
        this.referenceContainers = new Map();
        this.groups = new Map();
        // Coalesce concurrent verified requests (e.g. nearby regions and actor models).
        this.masterPending=null;this.indicesPending=new Map();this.groupsPending=new Map();
    }

    fetchRawGroup(archive, group) {
        const handshake = encodeJs5Handshake(this.revision);
        const request = encodeUrgentRequest(archive, group);
        const reader = new Js5GroupReader(archive, group);
        const WebSocketClass = this.WebSocketClass;
        return new Promise((resolve, reject) => {
            const socket = new WebSocketClass(this.url);
            socket.binaryType = "arraybuffer";
            let finished = false, stage = "init";
            const finish = (error, value) => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                socket.close();
                if (error) reject(error);
                else resolve(value);
            };
            const timer = setTimeout(() => finish(new Error("JS5 request timed out")), this.timeoutMs);
            socket.addEventListener("open", () => socket.send(handshake));
            socket.addEventListener("message", event => {
                if (finished) return;
                try {
                    if (!(event.data instanceof ArrayBuffer)) throw new Error("Expected binary JS5 response");
                    const chunk = new Uint8Array(event.data);
                    if (stage === "init") {
                        if (chunk.length !== 1 || chunk[0] !== 0) {
                            throw new Error("Native JS5 handshake rejected");
                        }
                        stage = "group";
                        socket.send(request);
                    } else {
                        const result = reader.push(chunk);
                        if (result) finish(null, result);
                    }
                } catch (error) { finish(error); }
            });
            socket.addEventListener("error", () => finish(new Error("Native JS5 WebSocket failed")));
            socket.addEventListener("close", () => {
                if (!finished) finish(new Error("Native JS5 connection closed before group completed"));
            });
        });
    }

    async persistedContainer(index,group,expectedCrc){
        const bytes=await this.persistent?.get?.(index,group,expectedCrc);
        if(!bytes)return null;
        if(bytes instanceof Uint8Array&&bytes.length>=5&&bytes.length<=MAX_CONTAINER&&crc32(bytes)===expectedCrc)return bytes;
        // Do not consume a stale, damaged or incorrect container. Re-fetch
        // from the authenticated JS5 gateway and replace the cache entry.
        void Promise.resolve(this.persistent?.remove?.(index,group,expectedCrc)).catch(()=>{});
        return null;
    }
    persistContainer(index,group,crc,container){
        void Promise.resolve(this.persistent?.put?.(index,group,crc,container)).catch(()=>{});
    }
    async loadMaster() {
        if(this.master)return this.master;
        if(!this.masterPending){
            this.masterPending=(async()=>{
                const result=await this.fetchRawGroup(255,255);
                this.master=decodeMasterIndex(result);
                return this.master;
            })().finally(()=>{this.masterPending=null;});
        }
        return this.masterPending;
    }

    async loadIndex(index) {
        checkNumber(index,254,"Archive index");
        if(this.indices.has(index))return this.indices.get(index);
        if(!this.indicesPending.has(index)){
            const pending=(async()=>{
                const master=await this.loadMaster(),entry=master[index];
                if(!entry)throw new Error("Index is absent from the master index");
                const stored=await this.persistedContainer(255,index,entry.crc);
                const ref=stored?{container:stored}:await this.fetchRawGroup(255,index);
                if(crc32(ref.container)!==entry.crc)throw new Error("Reference-table CRC mismatch");
                const data=await decodeCacheContainer(ref),catalog=decodeReferenceCatalog(data);
                if(catalog.revision!==entry.revision)throw new Error("Reference-table revision mismatch");
                const result={index,revision:catalog.revision,groups:catalog.groups};
                this.referenceContainers.set(index,ref.container.slice());
                this.indices.set(index,result);
                if(!stored)this.persistContainer(255,index,entry.crc,ref.container);
                return result;
            })().finally(()=>this.indicesPending.delete(index));
            this.indicesPending.set(index,pending);
        }
        return this.indicesPending.get(index);
    }

    async loadGroup(index, group) {
        checkNumber(index,254,"Archive index");
        checkNumber(group,65535,"Group");
        const key=index+":"+group;
        if(this.groups.has(key))return this.groups.get(key);
        if(!this.groupsPending.has(key)){
            const pending=(async()=>{
                const catalog=await this.loadIndex(index),expectedCrc=catalog.groups.get(group);
                if(expectedCrc===undefined)throw new Error("Group is absent from reference table");
                const stored=await this.persistedContainer(index,group,expectedCrc);
                const payload=stored?{container:stored}:await this.fetchRawGroup(index,group);
                if(crc32(payload.container)!==expectedCrc)throw new Error("Archive group CRC mismatch");
                this.groups.set(key,payload.container);
                if(!stored)this.persistContainer(index,group,expectedCrc,payload.container);
                return payload.container;
            })().finally(()=>this.groupsPending.delete(key));
            this.groupsPending.set(key,pending);
        }
        return this.groupsPending.get(key);
    }
}
