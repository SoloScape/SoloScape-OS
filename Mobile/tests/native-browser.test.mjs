import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as createTcpServer } from "node:net";
import { test } from "node:test";
import { crc32 as nodeCrc32, gzipSync } from "node:zlib";
import WebSocket from "ws";
import { createGateway } from "../gateway/server.mjs";
import {
    crc32, decodeMasterIndex, decodeReferenceCatalog, decodeCacheContainer,
    encodeJs5Handshake, encodeUrgentRequest, Js5GroupReader,
    NativeJs5Cache, validateNativeGatewayUrl,
} from "../browser/native-js5.mjs";

function container(contents, compression = 0) {
    const body = compression === 2 ? gzipSync(contents) : contents;
    const header = Buffer.alloc(compression === 2 ? 9 : 5);
    header[0] = compression;
    header.writeUInt32BE(body.length, 1);
    if (compression === 2) header.writeUInt32BE(contents.length, 5);
    return Buffer.concat([header, body]);
}
function response(archive, group, contents) {
    const raw = Buffer.concat([Buffer.from([archive, group >> 8, group & 255]), contents]);
    const parts = [raw.subarray(0, 512)];
    for (let p = 512; p < raw.length; p += 511) parts.push(Buffer.from([255]), raw.subarray(p, p + 511));
    return Buffer.concat(parts);
}
const asset = container(Buffer.alloc(1800, 0x4b));
const header = Buffer.alloc(8);
header[0] = 7;
header.writeUInt32BE(1790003854, 1);
header[5] = 0;
header.writeUInt16BE(1, 6);
const crc = Buffer.alloc(4);
crc.writeUInt32BE(nodeCrc32(asset));
const reference = container(Buffer.concat([header, Buffer.from([0, 0]), crc]), 2);
const masterBytes = Buffer.alloc(8);
masterBytes.writeUInt32BE(nodeCrc32(reference), 0);
masterBytes.writeUInt32BE(1790003854, 4);
const master = container(masterBytes);

function group(archive, id, body) {
    return {
        archive, group: id, compression: body[0],
        uncompressedBytes: body[0] === 0 ? body.readUInt32BE(1) : body.readUInt32BE(5),
        container: Uint8Array.from(body),
    };
}
test("browser CRC32 matches Node CRC32, including bytes above 127", () => {
    for (const bytes of [Buffer.from("123456789"), Buffer.from([0, 255, 204, 240, 127]), asset]) {
        assert.equal(crc32(Uint8Array.from(bytes)), nodeCrc32(bytes));
    }
});
test("browser native JS5 handshake and urgent request are exact revision-240 binary frames", () => {
    const handshake = encodeJs5Handshake(240);
    assert.equal(handshake.length, 21);
    assert.equal(handshake[0], 15);
    assert.equal(new DataView(handshake.buffer).getUint32(1, false), 240);
    assert.deepEqual([...encodeUrgentRequest(0, 0)], [1, 0, 0, 0]);
    assert.deepEqual([...encodeUrgentRequest(255, 255)], [1, 255, 0, 255]);
    assert.throws(() => encodeUrgentRequest(256, 0), /Archive/);
    assert.throws(() => validateNativeGatewayUrl("ws://8.8.8.8:43595/"), /loopback/);
    assert.throws(() => validateNativeGatewayUrl("ws://user:pass@localhost:43595/"), /credentials/);
});
test("browser group reader reassembles 512-byte continuation blocks in arbitrary segments", () => {
    const wire = response(0, 0, asset);
    const reader = new Js5GroupReader(0, 0);
    let parsed = null;
    for (let p = 0; p < wire.length; p += 67) {
        parsed = reader.push(Uint8Array.from(wire.subarray(p, p + 67))) ?? parsed;
    }
    assert.deepEqual(Buffer.from(parsed.container), asset);
    assert.equal(parsed.archive, 0);
    assert.equal(parsed.group, 0);
});
test("browser master index and gzip reference catalog can be parsed without Node code", async () => {
    assert.deepEqual(decodeMasterIndex(group(255, 255, master)), [
        { archive: 0, crc: nodeCrc32(reference), revision: 1790003854 },
    ]);
    const refPayload = await decodeCacheContainer(group(255, 0, reference));
    const catalog = decodeReferenceCatalog(refPayload);
    assert.equal(catalog.version, 7);
    assert.equal(catalog.revision, 1790003854);
    assert.equal(catalog.groups.size, 1);
    assert.equal(catalog.groups.get(0), nodeCrc32(asset));
});
test("browser decoder rejects unsafe/invalid wire and malformed cache", () => {
    const wrong = response(0, 0, asset);
    wrong[0] = 10;
    assert.throws(() => new Js5GroupReader(0, 0).push(Uint8Array.from(wrong)), /group ID/);
    const badSep = response(0, 0, asset);
    badSep[512] = 42;
    assert.throws(() => new Js5GroupReader(0, 0).push(Uint8Array.from(badSep)), /marker/);
    const malformed = group(255, 255, master);
    malformed.container[1] = 0;
    malformed.container[2] = 0;
    malformed.container[3] = 0;
    malformed.container[4] = 99;
    assert.throws(() => decodeMasterIndex(malformed), /Invalid master-index/);
});

async function startMockWorld({ corruptAsset = false } = {}) {
    const received = [];
    const sockets = new Set();
    const tcp = createTcpServer(socket => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let input = Buffer.alloc(0);
        let stage = "init";
        socket.on("data", part => {
            input = Buffer.concat([input, part]);
            if (stage === "init" && input.length >= 21) {
                assert.equal(input[0], 15);
                assert.equal(input.readUInt32BE(1), 240);
                input = input.subarray(21);
                stage = "request";
                socket.write(Buffer.from([0]));
            }
            if (stage === "request" && input.length >= 4) {
                assert.equal(input[0], 1);
                const a = input[1], g = input.readUInt16BE(2);
                received.push(`${a}:${g}`);
                stage = "complete";
                input = input.subarray(4);
                assert.ok(a === 255 && (g === 255 || g === 0) || a === 0 && g === 0);
                const bad = Buffer.from(asset);
                if (corruptAsset) bad[bad.length - 1] ^= 0x80;
                const chunk = response(a, g, a === 255 ? (g === 255 ? master : reference) : bad);
                socket.write(chunk.subarray(0, 300));
                setTimeout(() => {
                    if (!socket.destroyed) socket.write(chunk.subarray(300));
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
    class BrowserTestWebSocket extends WebSocket {
        constructor(url) { super(url, { origin: "http://localhost:3001" }); }
    }
    return {
        url: `ws://127.0.0.1:${httpServer.address().port}/`,
        received, BrowserTestWebSocket,
        async close() {
            await close();
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => tcp.close(resolve));
        },
    };
}

test("browser cache service loads, validates and memoizes actual group from WS/native gateway", { timeout: 12000 }, async () => {
    const world = await startMockWorld();
    try {
        const cache = new NativeJs5Cache({ url: world.url, WebSocketClass: world.BrowserTestWebSocket });
        const index = await cache.loadIndex(0);
        assert.equal(index.groups.get(0), nodeCrc32(asset));
        const bytes = await cache.loadGroup(0, 0);
        assert.deepEqual(Buffer.from(bytes), asset);
        assert.equal(cache.groups.size, 1);
        assert.strictEqual(await cache.loadGroup(0, 0), bytes);
        assert.deepEqual(world.received, ["255:255", "255:0", "0:0"]);
        await assert.rejects(() => cache.loadGroup(0, 1), /absent/);
    } finally {
        await world.close();
    }
});

test("browser cache service refuses corrupted JS5 group even when metadata is valid", { timeout: 12000 }, async () => {
    const world = await startMockWorld({ corruptAsset: true });
    try {
        const cache = new NativeJs5Cache({ url: world.url, WebSocketClass: world.BrowserTestWebSocket });
        await assert.rejects(() => cache.loadGroup(0, 0), /CRC mismatch/);
        assert.equal(cache.groups.size, 0);
        assert.deepEqual(world.received, ["255:255", "255:0", "0:0"]);
    } finally {
        await world.close();
    }
});
