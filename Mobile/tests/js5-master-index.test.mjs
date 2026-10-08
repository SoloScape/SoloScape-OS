import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeCrcVersionMasterIndex } from "../gateway/js5-master-index.mjs";

function mockGroup(entries) {
    const data = Buffer.alloc(entries.length * 8);
    entries.forEach(({ crc, version }, index) => {
        data.writeUInt32BE(crc, index * 8);
        data.writeUInt32BE(version, index * 8 + 4);
    });
    const container = Buffer.alloc(5 + data.length);
    container.writeUInt32BE(data.length, 1);
    data.copy(container, 5);
    return {
        archive: 255, group: 255, compression: 0,
        uncompressedBytes: data.length,
        container,
    };
}

test("decode uncompressed JS5 legacy master-index CRC/version metadata", () => {
    const group = mockGroup([{ crc: 0xdeadbeef, version: 240 }, { crc: 0x00112233, version: 18 }]);
    assert.deepEqual(decodeCrcVersionMasterIndex(group), {
        format: "crc-version-8",
        entries: [
            { archive: 0, crc: 0xdeadbeef, version: 240 },
            { archive: 1, crc: 0x00112233, version: 18 },
        ],
    });
});

test("master-index parser supports the observed 200-byte data length as 25 metadata entries", () => {
    const records = Array.from({ length: 25 }, (_, archive) => ({ crc: archive * 97, version: archive + 1 }));
    const result = decodeCrcVersionMasterIndex(mockGroup(records));
    assert.equal(result.entries.length, 25);
    assert.deepEqual(result.entries.at(-1), { archive: 24, crc: 24 * 97, version: 25 });
});

test("master-index parser fails closed for wrong target, compression, and header lengths", () => {
    const group = mockGroup([{ crc: 100, version: 200 }]);
    assert.throws(() => decodeCrcVersionMasterIndex({ ...group, group: 0 }), /255:255/);
    assert.throws(() => decodeCrcVersionMasterIndex({ ...group, compression: 2 }), /uncompressed/);
    assert.throws(() => decodeCrcVersionMasterIndex({ ...group, uncompressedBytes: 100 }), /Invalid/);
    const corrupt = Buffer.from(group.container);
    corrupt.writeUInt32BE(3, 1);
    assert.throws(() => decodeCrcVersionMasterIndex({ ...group, container: corrupt }), /Invalid/);
    assert.throws(() => decodeCrcVersionMasterIndex({ ...group, container: new Uint8Array(group.container) }), /Invalid/);
});

test("master-index parser rejects unsupported entry widths and excessive archive counts", () => {
    const group = mockGroup([{ crc: 3, version: 9 }]);
    const wrong = Buffer.concat([group.container, Buffer.from([0])]);
    wrong.writeUInt32BE(9, 1);
    assert.throws(() => decodeCrcVersionMasterIndex({
        ...group, container: wrong, uncompressedBytes: 9,
    }), /CRC\/version table/);
    assert.throws(() => decodeCrcVersionMasterIndex(mockGroup([])), /Invalid|table/);
    assert.throws(() => decodeCrcVersionMasterIndex(mockGroup(Array.from({ length: 257 }, () => ({ crc: 1, version: 1 })))), /bounded/);
});
