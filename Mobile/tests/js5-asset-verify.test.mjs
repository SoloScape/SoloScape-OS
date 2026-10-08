import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as createTcpServer } from "node:net";
import { test } from "node:test";
import { crc32, gzipSync } from "node:zlib";
import { decodeReferenceTableGroupCrcs } from "../gateway/js5-reference-header.mjs";
import { verifyArchive0GroupCrc } from "../gateway/js5-asset-verify.mjs";
import { fetchJs5Archive0Group, fetchJs5IndexGroup, fetchJs5MasterIndex } from "../gateway/js5-cache.mjs";
import { verifyReferenceTableCrc } from "../gateway/js5-reference-verify.mjs";
import { verifyReferenceRevision } from "../gateway/js5-reference-header.mjs";
import { createGateway } from "../gateway/server.mjs";

const REVISION = 1790003854;
function container(payload, compression = 0) {
    const bytes = compression === 2 ? gzipSync(payload) : payload;
    const head = Buffer.alloc(compression === 2 ? 9 : 5);
    head[0] = compression;
    head.writeUInt32BE(bytes.length, 1);
    if (compression === 2) head.writeUInt32BE(payload.length, 5);
    return Buffer.concat([head, bytes]);
}
function table(groups, { flags = 1, referenceRevision = REVISION } = {}) {
    const header = Buffer.alloc(8);
    header[0] = 7;
    header.writeUInt32BE(referenceRevision, 1);
    header[5] = flags;
    header.writeUInt16BE(groups.length, 6);
    let previous = 0;
    const ids = groups.map(x => {
        const d = x.group - previous;
        previous = x.group;
        const b = Buffer.alloc(2);
        b.writeUInt16BE(d);
        return b;
    });
    const names = (flags & 1) ? Buffer.alloc(groups.length * 4, 0xa5) : Buffer.alloc(0);
    const checks = Buffer.alloc(groups.length * 4);
    groups.forEach((x, i) => checks.writeUInt32BE(x.crc32, i * 4));
    return container(Buffer.concat([header, ...ids, names, checks]), 2);
}
function groupObj(archive, group, body) {
    return {
        archive, group, container: body,
        compression: body[0],
        uncompressedBytes: body[0] === 0 ? body.readUInt32BE(1) : body.readUInt32BE(5),
    };
}
function js5Wire(archive, group, payload) {
    const raw = Buffer.concat([Buffer.from([archive, group >>> 8, group & 255]), payload]);
    const out = [raw.subarray(0, 512)];
    for (let offset = 512; offset < raw.length; offset += 511) {
        out.push(Buffer.from([0xff]), raw.subarray(offset, offset + 511));
    }
    return Buffer.concat(out);
}
const asset = container(Buffer.alloc(1800, 0x7f));
const catalogRows = [
    { group: 0, crc32: crc32(asset) },
    { group: 5, crc32: 0x12345678 },
    { group: 201, crc32: 0x01234567 },
];
const reference = table(catalogRows);
const masterPayload = Buffer.alloc(8);
masterPayload.writeUInt32BE(crc32(reference), 0);
masterPayload.writeUInt32BE(REVISION, 4);
const master = container(masterPayload);

test("extracts catalog CRC rows in reference-table ID order and skips optional group names", () => {
    const result = decodeReferenceTableGroupCrcs(groupObj(255, 0, reference));
    assert.equal(result.format, 7);
    assert.equal(result.revision, REVISION);
    assert.equal(result.archiveCount, 3);
    assert.deepEqual(result.groups, catalogRows);
    const unnamed = table(catalogRows, { flags: 0 });
    assert.deepEqual(decodeReferenceTableGroupCrcs(groupObj(255, 0, unnamed)).groups, catalogRows);
});

test("archive group CRC validates only when group metadata and payload match", () => {
    assert.deepEqual(verifyArchive0GroupCrc(groupObj(255, 0, reference), groupObj(0, 0, asset), 0), {
        archive: 0, group: 0, crc32: crc32(asset), bytes: asset.length,
        referenceRevision: REVISION, matched: true,
    });
    const modified = Buffer.from(asset);
    modified[modified.length - 1] ^= 0x80;
    assert.throws(() => verifyArchive0GroupCrc(groupObj(255, 0, reference), groupObj(0, 0, modified), 0), /CRC32 mismatch/);
    assert.throws(() => verifyArchive0GroupCrc(groupObj(255, 0, reference), groupObj(0, 1, asset), 0), /Mismatched/);
    assert.throws(() => verifyArchive0GroupCrc(groupObj(255, 0, reference), groupObj(0, 2, asset), 2), /missing from/);
    assert.throws(() => verifyArchive0GroupCrc(groupObj(255, 0, reference), groupObj(0, 0, asset), -1), /range/);
});

test("catalog CRC extraction rejects truncated or unsupported metadata", () => {
    const short = container(Buffer.from([7,0,0,0,0,1,0,1,0,0]));
    assert.throws(() => decodeReferenceTableGroupCrcs(groupObj(255, 0, short)), /Truncated/);
    const unknown = table(catalogRows, { flags: 0x40 });
    assert.throws(() => decodeReferenceTableGroupCrcs(groupObj(255, 0, unknown)), /flag bits/);
    const missing = table(catalogRows, { flags: 1 });
    const corrupt = Buffer.from(missing);
    // Decompression and metadata length constraints should reject corrupt gzip
    corrupt[corrupt.length - 1] ^= 0xff;
    assert.throws(() => decodeReferenceTableGroupCrcs(groupObj(255, 0, corrupt)), /incorrect|invalid|checksum|data|unexpected|end of file/i);
});

test("asset fetch is restricted to archive 0 groups and validates group IDs", () => {
    assert.throws(() => fetchJs5Archive0Group({ group: -1, revision: 240 }), /group ID/);
    assert.throws(() => fetchJs5Archive0Group({ group: 65536, revision: 240 }), /group ID/);
    assert.throws(() => fetchJs5Archive0Group({ group: 0.5, revision: 240 }), /group ID/);
    assert.throws(() => fetchJs5Archive0Group({ group: 0, revision: 0 }), /revision/);
});

async function mockCache({ corruptAsset = false } = {}) {
    const sockets = new Set();
    const requests = [];
    const tcp = createTcpServer(socket => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let data = Buffer.alloc(0), state = "handshake";
        socket.on("data", incoming => {
            data = Buffer.concat([data, incoming]);
            if (state === "handshake" && data.length >= 21) {
                assert.equal(data[0], 15);
                assert.equal(data.readUInt32BE(1), 240);
                data = data.subarray(21);
                state = "urgent";
                socket.write(Buffer.from([0]));
            }
            if (state === "urgent" && data.length >= 4) {
                assert.equal(data[0], 1);
                const a = data[1], g = data.readUInt16BE(2);
                requests.push(`${a}:${g}`);
                assert.ok((a === 255 && (g === 255 || g === 0)) || (a === 0 && g === 0));
                data = data.subarray(4);
                state = "done";
                const damaged = Buffer.from(asset);
                if (corruptAsset) damaged[damaged.length - 1] ^= 0x80;
                const payload = a === 0 ? damaged : g === 255 ? master : reference;
                const wire = js5Wire(a, g, payload);
                // Simulate real TCP segments that do not align with JS5 or WS frames.
                socket.write(wire.subarray(0, 145));
                setTimeout(() => { if (!socket.destroyed) socket.write(wire.subarray(145, 512)); }, 5);
                setTimeout(() => { if (!socket.destroyed) socket.write(wire.subarray(512)); }, 10);
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
        url: `ws://127.0.0.1:${httpServer.address().port}/`, requests,
        async close() {
            await close();
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => tcp.close(resolve));
        },
    };
}

test("end-to-end WS-to-native TCP: verify master, table and single asset group", { timeout: 15000 }, async () => {
    const world = await mockCache();
    try {
        const options = { url: world.url, revision: 240 };
        const masterResponse = await fetchJs5MasterIndex(options);
        const referenceResponse = await fetchJs5IndexGroup({ ...options, index: 0 });
        const metadata = verifyReferenceTableCrc(masterResponse, referenceResponse, 0);
        const catalog = decodeReferenceTableGroupCrcs(referenceResponse);
        assert.equal(verifyReferenceRevision(catalog, metadata.referenceTableVersion), true);
        const groupResponse = await fetchJs5Archive0Group({ ...options, group: catalog.groups[0].group });
        assert.equal(verifyArchive0GroupCrc(referenceResponse, groupResponse, 0).matched, true);
        assert.deepEqual(groupResponse.container, asset);
        assert.deepEqual(world.requests, ["255:255", "255:0", "0:0"]);
    } finally {
        await world.close();
    }
});

test("corrupted archive payload is rejected after successful metadata checks", { timeout: 15000 }, async () => {
    const world = await mockCache({ corruptAsset: true });
    try {
        const options = { url: world.url, revision: 240 };
        const masterResponse = await fetchJs5MasterIndex(options);
        const referenceResponse = await fetchJs5IndexGroup({ ...options, index: 0 });
        assert.equal(verifyReferenceTableCrc(masterResponse, referenceResponse, 0).matched, true);
        const groupResponse = await fetchJs5Archive0Group({ ...options, group: 0 });
        assert.throws(() => verifyArchive0GroupCrc(referenceResponse, groupResponse, 0), /CRC32 mismatch/);
        assert.deepEqual(world.requests, ["255:255", "255:0", "0:0"]);
    } finally {
        await world.close();
    }
});

test("single group request honours fixed WS Origin allowlist", { timeout: 15000 }, async () => {
    const world = await mockCache();
    try {
        await assert.rejects(() => fetchJs5Archive0Group({
            url: world.url, revision: 240, group: 0, origin: "https://untrusted.test",
        }), /403/);
        assert.deepEqual(world.requests, []);
    } finally {
        await world.close();
    }
});
