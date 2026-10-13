import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as createTcpServer } from "node:net";
import { test } from "node:test";
import { createGateway } from "../gateway/server.mjs";
import { probeGateway } from "../gateway/gateway-probe.mjs";

const SESSION = Buffer.from("0123456789abcdef", "hex");

async function createMockNativeWorld() {
    const connections = [];
    const sockets = new Set();
    const tcp = createTcpServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let data = Buffer.alloc(0);
        socket.on("data", (chunk) => {
            data = Buffer.concat([data, chunk]);
            if (data[0] === 15 && data.length >= 21) {
                assert.equal(data.length, 21);
                assert.equal(data.readUInt32BE(1), 240);
                connections.push("js5");
                socket.write(Buffer.from([0]));
            } else if (data[0] === 14 && data.length >= 1) {
                assert.deepEqual(data, Buffer.from([14]));
                connections.push("game");
                socket.write(Buffer.from([0]));
                setTimeout(() => {
                    if (!socket.destroyed) socket.write(SESSION);
                }, 10);
            }
        });
    });
    tcp.listen(0, "127.0.0.1");
    await once(tcp, "listening");
    const { httpServer, close } = createGateway({
        tcpHost: "127.0.0.1",
        tcpPort: tcp.address().port,
        allowedOrigins: new Set(["http://localhost:3001"]),
    });
    httpServer.listen(0, "127.0.0.1");
    await once(httpServer, "listening");
    return {
        connections,
        url: `ws://127.0.0.1:${httpServer.address().port}/`,
        async close() {
            await close();
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => tcp.close(resolve));
        },
    };
}

test("gateway carries JS5 and native game-init handshake end to end, but never exposes the session ID", { timeout: 10000 }, async () => {
    const world = await createMockNativeWorld();
    try {
        assert.deepEqual(await probeGateway({ url: world.url, mode: "js5", revision: 240 }), {
            mode: "js5", responseCode: 0, accepted: true,
        });
        const result = await probeGateway({ url: world.url, mode: "game" });
        assert.deepEqual(result, { mode: "game", responseCode: 0, accepted: true });
        assert.equal(JSON.stringify(result).includes(SESSION.toString("hex")), false);
        assert.deepEqual(world.connections, ["js5", "game"]);
    } finally {
        await world.close();
    }
});

test("gateway probe requires explicit exact allowed origin", { timeout: 10000 }, async () => {
    const world = await createMockNativeWorld();
    try {
        await assert.rejects(() => probeGateway({
            url: world.url, origin: "https://untrusted.test", mode: "js5", revision: 240,
        }), /403/);
        assert.deepEqual(world.connections, []);
    } finally {
        await world.close();
    }
});

test("gateway probe rejects invalid URL/mode and plaintext non-loopback URLs", () => {
    assert.throws(() => probeGateway({ url: "ws://example.com/", mode: "game" }), /loopback/);
    assert.throws(() => probeGateway({ url: "wss://u:p@example.com/", mode: "game" }), /without credentials/);
    assert.throws(() => probeGateway({ mode: "login" }), /mode/);
    assert.throws(() => probeGateway({ mode: "js5" }), /revision/);
    assert.throws(() => probeGateway({ mode: "game", origin: "null" }), /valid URLs/);
});
