import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { encodeJs5Handshake, probeJs5 } from "../gateway/js5-probe.mjs";

test("JS5 handshake contains exactly opcode 15 and the 32-bit big-endian revision", () => {
    assert.deepEqual(encodeJs5Handshake(240), Buffer.from([15, 0, 0, 0, 240]));
    assert.deepEqual(encodeJs5Handshake(241), Buffer.from([15, 0, 0, 0, 241]));
    for (const revision of [0, -1, 1.5, 2 ** 32, NaN]) {
        assert.throws(() => encodeJs5Handshake(revision), /revision/);
    }
});

async function mockJs5(code) {
    const srv = createServer((socket) => {
        socket.once("data", (data) => {
            assert.deepEqual(data, encodeJs5Handshake(240));
            if (code !== null) socket.end(Buffer.from([code]));
        });
    });
    srv.listen(0, "127.0.0.1");
    await once(srv, "listening");
    return { srv, port: srv.address().port };
}

test("JS5 probe accepts a success response without credentials", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(0);
    try {
        assert.deepEqual(await probeJs5({ port, revision: 240 }), {
            revision: 240,
            responseCode: 0,
            accepted: true,
        });
    } finally {
        await new Promise(resolve => srv.close(resolve));
    }
});

test("JS5 probe detects rejection without attempting to log in", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(6);
    try {
        assert.deepEqual(await probeJs5({ port, revision: 240 }), {
            revision: 240,
            responseCode: 6,
            accepted: false,
        });
    } finally {
        await new Promise(resolve => srv.close(resolve));
    }
});

test("JS5 probe times out when target does not respond", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(null);
    try {
        await assert.rejects(() => probeJs5({ port, revision: 240, timeoutMs: 150 }), /timed out/);
    } finally {
        // Probe closes the socket on timeout; no leaked connection.
        await new Promise(resolve => srv.close(resolve));
    }
});
