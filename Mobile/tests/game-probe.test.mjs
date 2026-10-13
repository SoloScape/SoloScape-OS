import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { encodeGameHandshake, probeGameHandshake } from "../gateway/game-probe.mjs";

const DUMMY_SESSION = Buffer.from("0123456789abcdef", "hex");

async function mockGameHandshake(chunks, { onConnect } = {}) {
    const sockets = new Set();
    const srv = createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.once("data", (data) => {
            assert.deepEqual(data, Buffer.from([14]));
            onConnect?.();
            if (!chunks) return;
            for (const [index, bytes] of chunks.entries()) {
                setTimeout(() => {
                    if (!socket.destroyed) {
                        if (index === chunks.length - 1) socket.end(bytes);
                        else socket.write(bytes);
                    }
                }, 10 + 20 * index);
            }
        });
    });
    srv.listen(0, "127.0.0.1");
    await once(srv, "listening");
    return {
        port: srv.address().port,
        async close() {
            for (const socket of sockets) socket.destroy();
            await new Promise((resolve) => srv.close(resolve));
        },
    };
}

test("native pre-auth game handshake is exactly opcode 14", () => {
    assert.deepEqual(encodeGameHandshake(), Buffer.from([14]));
});

test("accepts 0 + opaque eight-byte session ID, even across TCP frames", { timeout: 5000 }, async () => {
    const server = await mockGameHandshake([
        Buffer.from([0]),
        DUMMY_SESSION.subarray(0, 3),
        DUMMY_SESSION.subarray(3),
    ]);
    try {
        const result = await probeGameHandshake({ port: server.port });
        assert.deepEqual(result, { responseCode: 0, accepted: true, sessionIdPresent: true });
        assert.ok(!JSON.stringify(result).includes(DUMMY_SESSION.toString("hex")), "session ID must not leak");
    } finally {
        await server.close();
    }
});

test("rejects server refusal with just a response code", { timeout: 5000 }, async () => {
    const server = await mockGameHandshake([Buffer.from([16])]);
    try {
        assert.deepEqual(await probeGameHandshake({ port: server.port }), {
            responseCode: 16, accepted: false, sessionIdPresent: false,
        });
    } finally {
        await server.close();
    }
});

test("rejects truncated success response rather than treating one byte as success", { timeout: 5000 }, async () => {
    const server = await mockGameHandshake([Buffer.from([0, 1, 2])]);
    try {
        await assert.rejects(() => probeGameHandshake({ port: server.port }), /before complete/);
    } finally {
        await server.close();
    }
});

test("times out if the server does not reply", { timeout: 5000 }, async () => {
    const server = await mockGameHandshake(null);
    try {
        await assert.rejects(() => probeGameHandshake({ port: server.port, timeoutMs: 150 }), /timed out/);
    } finally {
        await server.close();
    }
});

test("rejects invalid port and timeout before connecting", () => {
    assert.throws(() => probeGameHandshake({ port: 0 }), /fixed TCP host and port/);
    assert.throws(() => probeGameHandshake({ port: 43594, timeoutMs: 10 }), /timeoutMs/);
});
