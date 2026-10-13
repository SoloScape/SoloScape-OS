import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer as createTcpServer } from "node:net";
import { test } from "node:test";
import { crc32, gzipSync } from "node:zlib";
import { fetchJs5IndexGroup, fetchJs5MasterIndex } from "../gateway/js5-cache.mjs";
import { createGateway } from "../gateway/server.mjs";
import { verifyReferenceTableCrc } from "../gateway/js5-reference-verify.mjs";

function container(payload, compression = 0, uncompressedLength = payload.length) {
    const prefix = Buffer.alloc(compression === 0 ? 5 : 9);
    prefix[0] = compression;
    prefix.writeUInt32BE(payload.length, 1);
    if (compression !== 0) prefix.writeUInt32BE(uncompressedLength, 5);
    return Buffer.concat([prefix, payload]);
}

function wrapJs5Group(data, group) {
    const raw = Buffer.concat([Buffer.from([255, group >> 8, group & 255]), data]);
    const parts = [raw.subarray(0, Math.min(raw.length, 512))];
    for (let offset = 512; offset < raw.length; offset += 511) {
        parts.push(Buffer.from([255]), raw.subarray(offset, offset + 511));
    }
    return Buffer.concat(parts);
}

const bytes = Buffer.concat(
    Array.from({ length: 80 }, (_, i) => createHash("sha256").update(String(i)).digest()),
);
const referenceContainer = container(gzipSync(bytes), 2, bytes.length);
const masterPayload = Buffer.alloc(200);
masterPayload.writeUInt32BE(crc32(referenceContainer), 0);
masterPayload.writeUInt32BE(41, 4);
const masterContainer = container(masterPayload);

function groupFor(index, contents) {
    return {
        archive: 255, group: index,
        compression: contents[0],
        uncompressedBytes: contents[0] ? contents.readUInt32BE(5) : contents.readUInt32BE(1),
        container: contents,
    };
}

test("Node CRC32 matches canonical test vector", () => {
    assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("archive-0 reference-table CRC matches the master index without decompressing or persisting files", () => {
    const result = verifyReferenceTableCrc(groupFor(255, masterContainer), groupFor(0, referenceContainer), 0);
    assert.deepEqual(result, {
        archive: 0,
        crc32: crc32(referenceContainer),
        referenceTableVersion: 41,
        referenceTableBytes: referenceContainer.length,
        matched: true,
    });
});

test("reference-table validation rejects checksum mismatch and wrong archive", () => {
    const corrupt = Buffer.from(referenceContainer);
    corrupt[corrupt.length - 1] ^= 0x80;
    assert.throws(() => verifyReferenceTableCrc(groupFor(255, masterContainer), groupFor(0, corrupt)), /CRC32 mismatch/);
    assert.throws(() => verifyReferenceTableCrc(groupFor(255, masterContainer), groupFor(1, referenceContainer)), /mismatched/);
    assert.throws(() => verifyReferenceTableCrc(groupFor(255, masterContainer), groupFor(0, referenceContainer), 25), /not in the master-index/);
    assert.throws(() => verifyReferenceTableCrc(groupFor(255, masterContainer), groupFor(0, referenceContainer), -1), /not in the master-index/);
});

test("JS5 index request limits read to metadata index-255 groups", () => {
    assert.throws(() => fetchJs5IndexGroup({ revision: 240, index: 256 }), /index ID/);
    assert.throws(() => fetchJs5IndexGroup({ revision: 240, index: -1 }), /index ID/);
    assert.throws(() => fetchJs5IndexGroup({ revision: 240, index: 0.5 }), /index ID/);
    assert.throws(() => fetchJs5IndexGroup({ revision: 0, index: 0 }), /revision/);
});

async function mockMetadataCache({ corrupted = false } = {}) {
    const received = [];
    const sockets = new Set();
    const tcp = createTcpServer(socket => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let receivedBytes = Buffer.alloc(0);
        let stage = "handshake";
        socket.on("data", data => {
            receivedBytes = Buffer.concat([receivedBytes, data]);
            if (stage === "handshake" && receivedBytes.length >= 21) {
                const handshake = receivedBytes.subarray(0, 21);
                assert.equal(handshake[0], 15);
                assert.equal(handshake.readUInt32BE(1), 240);
                receivedBytes = receivedBytes.subarray(21);
                stage = "group";
                socket.write(Buffer.from([0]));
            }
            if (stage === "group" && receivedBytes.length >= 4) {
                assert.equal(receivedBytes[0], 1);
                assert.equal(receivedBytes[1], 255);
                const group = receivedBytes.readUInt16BE(2);
                assert.ok(group === 255 || group === 0);
                received.push(group);
                receivedBytes = receivedBytes.subarray(4);
                stage = "complete";
                const reference = Buffer.from(referenceContainer);
                if (corrupted) reference[reference.length - 1] ^= 0x80;
                const payload = group === 255 ? masterContainer : reference;
                const wire = wrapJs5Group(payload, group);
                socket.write(wire.subarray(0, 128));
                setTimeout(() => {
                    if (socket.destroyed) return;
                    socket.write(wire.subarray(128, 450));
                    // Schedule the next fragment only after this one has been queued.
                    setTimeout(() => {
                        if (!socket.destroyed) socket.write(wire.subarray(450));
                    }, 5);
                }, 5);
            }
        });
    });
    tcp.listen(0, "127.0.0.1");
    await once(tcp, "listening");
    const { httpServer, close } = createGateway({
        tcpHost: "127.0.0.1", tcpPort: tcp.address().port,
        allowedOrigins: new Set(["http://localhost:3001"]),
    });
    httpServer.listen(0, "127.0.0.1");
    await once(httpServer, "listening");
    return {
        received,
        url: `ws://127.0.0.1:${httpServer.address().port}/`,
        async close() {
            await close();
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => tcp.close(resolve));
        },
    };
}

test("two real native group requests cross WebSocket gateway and pass reference-table CRC32", { timeout: 10000 }, async () => {
    const mock = await mockMetadataCache();
    try {
        const options = { url: mock.url, revision: 240 };
        const master = await fetchJs5MasterIndex(options);
        const reference = await fetchJs5IndexGroup({ ...options, index: 0 });
        assert.deepEqual(master.container, masterContainer);
        assert.deepEqual(reference.container, referenceContainer);
        assert.equal(verifyReferenceTableCrc(master, reference, 0).matched, true);
        assert.deepEqual(mock.received, [255, 0]);
    } finally {
        await mock.close();
    }
});

test("gateway cache reference verification refuses corrupted archive reference table", { timeout: 10000 }, async () => {
    const mock = await mockMetadataCache({ corrupted: true });
    try {
        const options = { url: mock.url, revision: 240 };
        const master = await fetchJs5MasterIndex(options);
        const reference = await fetchJs5IndexGroup({ ...options, index: 0 });
        assert.throws(() => verifyReferenceTableCrc(master, reference, 0), /CRC32 mismatch/);
        assert.deepEqual(mock.received, [255, 0]);
    } finally {
        await mock.close();
    }
});

test("reference-table request enforces gateway origin allowlist", { timeout: 10000 }, async () => {
    const mock = await mockMetadataCache();
    try {
        await assert.rejects(() => fetchJs5IndexGroup({
            url: mock.url, origin: "https://untrusted.test", revision: 240, index: 0,
        }), /403/);
        assert.deepEqual(mock.received, []);
    } finally {
        await mock.close();
    }
});
