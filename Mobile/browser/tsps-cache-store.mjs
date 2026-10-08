import { NativeJs5Cache } from "./native-js5.mjs";

/**
 * Structural adapter for TSPS's CacheStore<ApiType.SYNC> contract:
 *
 *   read(indexId: number, archiveId: number): Int8Array
 *
 * TSPS CacheIndexDat2.fromStore(indexId, store) synchronously reads the
 * index-255 reference-table container via read(255, indexId). It then reads
 * individual archive-group containers with read(indexId, groupId).
 *
 * Native JS5 fetches are asynchronous. Preload and CRC/revision validate
 * every desired container first using preloadIndex/preloadGroup; read()
 * NEVER starts a network request or falls back to an unverified cache.
 *
 * This is a structural bridge only, not a TSPS renderer integration or
 * an assertion that revision-241 decoders understand revision-240 assets.
 */
export class TspsCacheStoreAdapter {
    constructor(nativeCache) {
        if (!(nativeCache instanceof NativeJs5Cache)) {
            throw new TypeError("TspsCacheStoreAdapter requires a NativeJs5Cache");
        }
        this.native = nativeCache;
    }

    async preloadIndex(indexId) {
        await this.native.loadIndex(indexId);
        return this;
    }

    async preloadGroup(indexId, groupId) {
        await this.native.loadGroup(indexId, groupId);
        return this;
    }

    /**
     * Return a COPY as signed bytes, just as TSPS's CacheStore.read() does.
     * TSPS Container.decode reads the compression header itself, so do not
     * decompress or strip the header here.
     */
    read(indexId, archiveId) {
        if (!Number.isInteger(indexId) || indexId < 0 || indexId > 255) {
            throw new RangeError("CacheStore indexId is out of range");
        }
        if (!Number.isInteger(archiveId) || archiveId < 0 || archiveId > 65535) {
            throw new RangeError("CacheStore archiveId is out of range");
        }
        const bytes = indexId === 255 ?
            this.native.referenceContainers.get(archiveId) :
            this.native.groups.get(`${indexId}:${archiveId}`);
        if (!(bytes instanceof Uint8Array)) {
            throw new Error(`CacheStore cache miss: ${indexId}:${archiveId}; preload verified container first`);
        }
        // Copy protects the original CRC-validated in-memory content from
        // mutations by TSPS's ByteBuffer/XTEA/Container decoding routines.
        return Int8Array.from(bytes);
    }
}
