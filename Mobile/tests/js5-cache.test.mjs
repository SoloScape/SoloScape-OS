import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer as createTcpServer } from "node:net";
import { test } from "node:test";
import { createGateway } from "../gateway/server.mjs";
import { encodeJs5UrgentRequest, Js5GroupAssembler } from "../gateway/js5-group.mjs";
import { fetchJs5MasterIndex } from "../gateway/js5-cache.mjs";

function makeContainer(data, compression = 0, uncompressedBytes = data.length) {
    const container = Buffer.alloc((compression === 0 ? 5 : 9) + data.length);
    container[0] = compression;
    container.writeUInt32BE(data.length, 1);
    if (compression !== 0) container.writeUInt32BE(uncompressedBytes, 5);
    data.copy(container, compression === 0 ? 5 : 9);
    return container;
}

function wrapGroup(container, archive = 255, group = 255) {
    const head = Buffer.from([archive, group >> 8, group & 255]);
    const raw = Buffer.concat([head, container]);
    const parts = [raw.subarray(0, Math.min(512, raw.length))];
    for (let offset = 512; offset < raw.length; offset += 511) {
        parts.push(Buffer.from([255]));
        parts.push(raw.subarray(offset, offset + 511));
    }
    return Buffer.concat(parts);
}

const PAYLOAD = Buffer.from("soloscape-cache-test-group");
const CONTAINER = makeContainer(PAYLOAD);

test("native JS5 urgent group request encodes archive 255, group 255", () => {
    assert.deepEqual(encodeJs5UrgentRequest(), Buffer.from([1, 255, 0, 255]));
    assert.deepEqual(encodeJs5UrgentRequest(12, 345), Buffer.from([1, 12, 1, 89]));
    for (const [archive, group] of [[-1, 0], [256, 0], [0, -1], [0, 65536], [NaN, 0]]) {
        assert.throws(() => encodeJs5UrgentRequest(archive, group), /range/);
    }
});

test("JS5 group assembler reconstructs fragmented group without writing cache files", () => {
    const group = new Js5GroupAssembler();
    const raw = wrapGroup(CONTAINER);
    assert.equal(group.push(raw.subarray(0, 5)), null);
    assert.equal(group.push(raw.subarray(5, 8)), null);
    assert.equal(group.push(raw.subarray(8, 14)), null);
    const result = group.push(raw.subarray(14));
    assert.deepEqual(result, {
        archive: 255, group: 255, compression: 0,
        compressedBytes: PAYLOAD.length, uncompressedBytes: PAYLOAD.length,
        container: CONTAINER,
    });
    assert.equal(
        createHash("sha256").update(result.container).digest("hex"),
        createHash("sha256").update(CONTAINER).digest("hex"),
    );
    assert.throws(() => group.push(Buffer.from([0])), /completed/);
});

test("JS5 group reassembly removes 512-byte block terminators safely", () => {
    const data = Buffer.alloc(2200, 0x56);
    const cache = makeContainer(data, 2, 4096);
    const wrapped = wrapGroup(cache);
    assert.equal(wrapped[512], 255);
    assert.equal(wrapped[1024], 255);
    const assembler = new Js5GroupAssembler();
    let result = null;
    for (let pos = 0; pos < wrapped.length; pos += 113) {
        result = assembler.push(wrapped.subarray(pos, pos + 113)) ?? result;
    }
    assert.deepEqual(result.container, cache);
    assert.equal(result.compression, 2);
    assert.equal(result.uncompressedBytes, 4096);
});

test("JS5 group parser rejects unsafe lengths, mismatched IDs and invalid terminators", () => {
    const tooLarge = wrapGroup(makeContainer(Buffer.alloc(2048)));
    assert.throws(() => new Js5GroupAssembler({ maxContainerBytes: 100 }).push(tooLarge), /limit/);
    assert.throws(() => new Js5GroupAssembler().push(wrapGroup(CONTAINER, 10, 5)), /identifier/);

    const invalidCompression = wrapGroup(makeContainer(PAYLOAD));
    invalidCompression[3] = 9;
    assert.throws(() => new Js5GroupAssembler().push(invalidCompression), /compression/);

    const invalidMarker = wrapGroup(makeContainer(Buffer.alloc(600, 3)));
    invalidMarker[512] = 0;
    assert.throws(() => new Js5GroupAssembler().push(invalidMarker), /separator/);

    assert.throws(() => new Js5GroupAssembler().push(Buffer.concat([wrapGroup(CONTAINER), Buffer.from([0])])), /trailing/);
    assert.throws(() => new Js5GroupAssembler().push(wrapGroup(makeContainer(Buffer.alloc(8), 2, 65 * 1024 * 1024))), /unsafe decompressed/);
});

async function startMockGateway(reply) {
    const sockets = new Set();
    const received = [];
    const tcpServer = createTcpServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let data = Buffer.alloc(0);
        let stage = "handshake";
        socket.on("data", (part) => {
            data = Buffer.concat([data, part]);
            if (stage === "handshake" && data.length >= 21) {
                const request = data.subarray(0, 21);
                assert.equal(request[0], 15);
                assert.equal(request.readUInt32BE(1), 240);
                assert.equal(request.length, 21);
                received.push("native-js5");
                data = data.subarray(21);
                stage = "group";
                socket.write(Buffer.from([0]));
            }
            if (stage === "group" && data.length >= 4) {
                assert.deepEqual(data, Buffer.from([1, 255, 0, 255]));
                received.push("urgent-master-index");
                data = Buffer.alloc(0);
                stage = "finished";
                if (reply) {
                    socket.write(reply.subarray(0, Math.min(307, reply.length)));
                    setTimeout(() => {
                        if (!socket.destroyed) socket.write(reply.subarray(Math.min(307, reply.length)));
                    }, 10);
                }
            }
        });
    });
    tcpServer.listen(0, "127.0.0.1");
    await once(tcpServer, "listening");
    const { httpServer, close } = createGateway({
        tcpHost: "127.0.0.1",
        tcpPort: tcpServer.address().port,
        allowedOrigins: new Set(["http://localhost:3001"]),
    });
    httpServer.listen(0, "127.0.0.1");
    await once(httpServer, "listening");
    return {
        url: `ws://127.0.0.1:${httpServer.address().port}/`,
        received,
        async close() {
            await close();
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => tcpServer.close(resolve));
        },
    };
}

test("cache master-index request passes native gateway and assembles cache response", { timeout: 10000 }, async () => {
    const data = Buffer.alloc(1200, 0x7e);
    const container = makeContainer(data);
    const mock = await startMockGateway(wrapGroup(container));
    try {
        const result = await fetchJs5MasterIndex({ url: mock.url, revision: 240 });
        assert.deepEqual(result.container, container);
        assert.deepEqual(mock.received, ["native-js5", "urgent-master-index"]);
    } finally {
        await mock.close();
    }
});

test("cache probe requires allowed origin before requesting group", { timeout: 10000 }, async () => {
    const mock = await startMockGateway(wrapGroup(CONTAINER));
    try {
        await assert.rejects(() => fetchJs5MasterIndex({
            url: mock.url, origin: "http://malicious.test", revision: 240,
        }), /403/);
        assert.deepEqual(mock.received, []);
    } finally {
        await mock.close();
    }
});

test("cache probe times out when JS5 group request is unanswered", { timeout: 10000 }, async () => {
    const mock = await startMockGateway(null);
    try {
        await assert.rejects(() => fetchJs5MasterIndex({
            url: mock.url, revision: 240, timeoutMs: 150,
        }), /timed out/);
        assert.deepEqual(mock.received, ["native-js5", "urgent-master-index"]);
    } finally {
        await mock.close();
    }
});

test("cache probe rejects bad revision, timeout and insecure URLs", () => {
    assert.throws(() => fetchJs5MasterIndex({ revision: 0 }), /revision/);
    assert.throws(() => fetchJs5MasterIndex({ revision: 240, timeoutMs: 0 }), /timeout/);
    assert.throws(() => fetchJs5MasterIndex({ url: "ws://example.com/", revision: 240 }), /loopback/);
});
