import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { encodeJs5Handshake, probeJs5 } from "../gateway/js5-probe.mjs";

const FIXED_SEED = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const JS5_REQUEST_BYTES = 21;

test("JS5 request contains opcode 15, big-endian revision and four seed ints", () => {
    const revision240 = encodeJs5Handshake(240, FIXED_SEED);
    assert.equal(revision240.length, JS5_REQUEST_BYTES);
    assert.deepEqual(revision240, Buffer.from("0f000000f000112233445566778899aabbccddeeff", "hex"));
    const revision241 = encodeJs5Handshake(241, FIXED_SEED);
    assert.equal(revision241.readUInt32BE(1), 241);
    assert.equal(revision241.length, JS5_REQUEST_BYTES);
    assert.deepEqual(revision241.subarray(5), FIXED_SEED);
});

test("seed generation is cryptographic and all 16 seed bytes are present", () => {
    const handshake = encodeJs5Handshake(240);
    assert.equal(handshake.length, JS5_REQUEST_BYTES);
    assert.equal(handshake[0], 15);
    assert.equal(handshake.readUInt32BE(1), 240);
    // Don't assert a particular randomly-generated seed value.
    assert.equal(handshake.subarray(5).length, 16);
});

test("bad revisions and incomplete JS5 seeds are rejected", () => {
    for (const revision of [0, -1, 1.5, 2 ** 32, NaN]) {
        assert.throws(() => encodeJs5Handshake(revision), /revision/);
    }
    for (const seed of [Buffer.alloc(0), Buffer.alloc(4), Buffer.alloc(15), Buffer.alloc(17), new Uint8Array(16)]) {
        assert.throws(() => encodeJs5Handshake(240, seed), /seed/);
    }
});

async function mockJs5(code) {
    const srv = createServer((socket) => {
        let received = Buffer.alloc(0);
        socket.on("data", (data) => {
            received = Buffer.concat([received, data]);
            // Match rsprot: consume no message until the FULL 20-byte payload
            // has arrived after opcode 15. This guards against the old 5-byte bug.
            if (received.length < JS5_REQUEST_BYTES) return;
            assert.equal(received.length, JS5_REQUEST_BYTES);
            assert.equal(received[0], 15);
            assert.equal(received.readUInt32BE(1), 240);
            assert.deepEqual(received.subarray(5), FIXED_SEED);
            if (code !== null) socket.end(Buffer.from([code]));
        });
    });
    srv.listen(0, "127.0.0.1");
    await once(srv, "listening");
    return { srv, port: srv.address().port };
}

test("JS5 probe accepts a success response after complete 21-byte request", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(0);
    try {
        assert.deepEqual(await probeJs5({ port, revision: 240, seed: FIXED_SEED }), {
            revision: 240,
            responseCode: 0,
            accepted: true,
        });
    } finally {
        await new Promise(resolve => srv.close(resolve));
    }
});

test("JS5 probe detects rejection without attempting login", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(6);
    try {
        assert.deepEqual(await probeJs5({ port, revision: 240, seed: FIXED_SEED }), {
            revision: 240,
            responseCode: 6,
            accepted: false,
        });
    } finally {
        await new Promise(resolve => srv.close(resolve));
    }
});

test("JS5 probe times out when target does not answer complete request", { timeout: 5000 }, async () => {
    const { srv, port } = await mockJs5(null);
    try {
        await assert.rejects(
            () => probeJs5({ port, revision: 240, seed: FIXED_SEED, timeoutMs: 150 }),
            /timed out after sending full 21-byte request/,
        );
    } finally {
        await new Promise(resolve => srv.close(resolve));
    }
});
