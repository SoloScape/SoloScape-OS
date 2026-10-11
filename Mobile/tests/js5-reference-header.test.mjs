import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import {
    decodeReferenceTableHeader,
    verifyReferenceRevision,
} from "../gateway/js5-reference-header.mjs";

function smart(n) {
    if (n < 0 || n > 0x7fffffff) throw new Error("test fixture overflow");
    if (n < 32767) {
        const b = Buffer.alloc(2);
        b.writeUInt16BE(n);
        return b;
    }
    const b = Buffer.alloc(4);
    b.writeUInt32BE((n | 0x80000000) >>> 0);
    return b;
}

function makeTable({ format = 7, revision = 1790003854, flags = 1,
    archives = [0, 4, 9], compression = 2 } = {}) {
    const intro = Buffer.alloc(format >= 6 ? 6 : 2);
    intro[0] = format;
    if (format >= 6) intro.writeUInt32BE(revision >>> 0, 1);
    intro[intro.length - 1] = flags;
    const count = format >= 7 ? smart(archives.length) : Buffer.from([archives.length >> 8, archives.length & 255]);
    let oldId = 0;
    const deltas = archives.map(id => {
        const delta = id - oldId;
        oldId = id;
        return format >= 7 ? smart(delta) : Buffer.from([delta >> 8, delta & 255]);
    });
    const bytes = Buffer.concat([intro, count, ...deltas]);
    const compressed = compression === 2 ? gzipSync(bytes) : bytes;
    const header = Buffer.alloc(compression === 2 ? 9 : 5);
    header[0] = compression;
    header.writeUInt32BE(compressed.length, 1);
    if (compression === 2) header.writeUInt32BE(bytes.length, 5);
    const container = Buffer.concat([header, compressed]);
    return {
        archive: 255, group: 0, compression,
        uncompressedBytes: bytes.length, container,
    };
}

test("decode gzip-compressed v7 archive reference-table header and verify revision", () => {
    const group = makeTable();
    const result = decodeReferenceTableHeader(group);
    assert.deepEqual(result, {
        format: 7, revision: 1790003854, flags: 1, archiveCount: 3,
        firstArchiveId: 0, lastArchiveId: 9,
        compressedBytes: group.container.length - 9,
        decodedBytes: group.uncompressedBytes,
    });
    assert.equal(verifyReferenceRevision(result, 1790003854), true);
    assert.throws(() => verifyReferenceRevision(result, 240), /revision mismatch/);
});

test("uncompressed v6 reference table uses u16 archive ID deltas", () => {
    const result = decodeReferenceTableHeader(makeTable({
        format: 6, revision: 13, archives: [1, 3, 8], flags: 0, compression: 0,
    }));
    assert.equal(result.format, 6);
    assert.equal(result.archiveCount, 3);
    assert.equal(result.firstArchiveId, 1);
    assert.equal(result.lastArchiveId, 8);
    assert.equal(verifyReferenceRevision(result, 13), true);
});

test("v7 big-smart ID can be read without truncating archive IDs", () => {
    const result = decodeReferenceTableHeader(makeTable({
        archives: [1, 40000, 40010], revision: 7,
    }));
    assert.equal(result.lastArchiveId, 40010);
    assert.equal(result.archiveCount, 3);
});

test("v5 reference table may decode but has no revision to cross-check", () => {
    const result = decodeReferenceTableHeader(makeTable({ format: 5, archives: [1], compression: 0 }));
    assert.equal(result.format, 5);
    assert.equal(result.revision, null);
    assert.throws(() => verifyReferenceRevision(result, 25), /lacks a revision/);
});

test("reject malformed gzip, incompatible declared lengths and unsupported compression", () => {
    const normal = makeTable();
    const damaged = { ...normal, container: Buffer.from(normal.container) };
    damaged.container[damaged.container.length - 1] ^= 0xff;
    assert.throws(() => decodeReferenceTableHeader(damaged), /incorrect|invalid|checksum|data|end of file|unexpected/i);

    const wrongLength = { ...normal, container: Buffer.from(normal.container) };
    wrongLength.container.writeUInt32BE(99, 5);
    wrongLength.uncompressedBytes = 99;
    assert.throws(() => decodeReferenceTableHeader(wrongLength), /does not match header/);

    const tooShort = { ...normal, container: normal.container.subarray(0, -1) };
    assert.throws(() => decodeReferenceTableHeader(tooShort), /cache-container length/);

    const type1 = makeTable({ compression: 0 });
    type1.compression = 1;
    type1.container = Buffer.from(type1.container);
    type1.container[0] = 1;
    assert.throws(() => decodeReferenceTableHeader(type1), /Only uncompressed and gzip/);
});

test("bounded gzip decoding rejects decompression bombs and unsupported formats", () => {
    const inflated = makeTable({ compression: 2 });
    assert.throws(() => decodeReferenceTableHeader(inflated, { maxDecodedBytes: 9 }), /length/);
    const tooMany = makeTable({ archives: Array.from({ length: 1000 }, (_, i) => i) });
    assert.throws(() => decodeReferenceTableHeader(tooMany, { maxDecodedBytes: 50 }), /length/);
    const badFormat = makeTable({ format: 8, compression: 0 });
    assert.throws(() => decodeReferenceTableHeader(badFormat), /Unsupported reference-table format/);
});

test("reject wrong group, duplicate IDs, truncation, sentinel and invalid revision checks", () => {
    const normal = makeTable();
    assert.throws(() => decodeReferenceTableHeader({ ...normal, group: 255 }), /255:0..254/);
    assert.throws(() => decodeReferenceTableHeader(makeTable({ archives: [1, 1] })), /not increasing/);
    assert.throws(() => decodeReferenceTableHeader(makeTable({ archives: [1, 40000] }).container.subarray(0, 7)), /255:0..254/);
    const sentinel = makeTable({ archives: [1], compression: 0 });
    const modified = Buffer.from(sentinel.container);
    // v7 header: 5-byte container, version, revision(4), flags, count(2), id(2)
    modified[5 + 1 + 4 + 1 + 2] = 0x7f;
    modified[5 + 1 + 4 + 1 + 2 + 1] = 0xff;
    assert.throws(() => decodeReferenceTableHeader({ ...sentinel, container: modified }), /sentinel/);
    assert.throws(() => verifyReferenceRevision(null, 1), /Invalid/);
    assert.throws(() => verifyReferenceRevision({ revision: 1 }, -1), /Invalid/);
});
