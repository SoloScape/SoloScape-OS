import { randomBytes } from "node:crypto";
import { createConnection } from "node:net";

// rsprot OSRS revision 240: LoginClientProt.INIT_JS5REMOTE_CONNECTION
// is opcode 15 plus 20 bytes of payload: revision (4) + seed (4 * 4).
// See blurite/rsprot at protocol/osrs-240/osrs-240-shared/...
// loginprot/incoming/codec/InitJs5RemoteConnectionDecoder.kt.
const JS5_HANDSHAKE = 15;
const JS5_SEED_BYTES = 16;
const JS5_HANDSHAKE_BYTES = 1 + 4 + JS5_SEED_BYTES;
const MAX_TIMEOUT_MS = 30_000;

export function encodeJs5Handshake(revision, seed = randomBytes(JS5_SEED_BYTES)) {
    if (!Number.isInteger(revision) || revision < 1 || revision > 0x7fffffff) {
        throw new RangeError("JS5 revision must be a positive signed 32-bit integer");
    }
    if (!Buffer.isBuffer(seed) || seed.length !== JS5_SEED_BYTES) {
        throw new RangeError("JS5 seed must be exactly 16 bytes (four 32-bit values)");
    }
    const bytes = Buffer.alloc(JS5_HANDSHAKE_BYTES);
    bytes[0] = JS5_HANDSHAKE;
    bytes.writeUInt32BE(revision, 1);
    seed.copy(bytes, 5);
    return bytes;
}

/**
 * Minimal public/revision preflight. NO login, usernames, passwords, keys or
 * account tokens. A response code 0 means this JS5 handshake was accepted;
 * it does not prove a complete cache transfer or the ability to play.
 *
 * The cryptographically random seed is used only for the native JS5 handshake.
 */
export function probeJs5({ host = "127.0.0.1", port, revision, timeoutMs = 5000, seed } = {}) {
    if (typeof host !== "string" || !host.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("A fixed TCP host and port are required");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error("timeoutMs must be between 100 and 30000");
    }
    const handshake = encodeJs5Handshake(revision, seed);
    return new Promise((resolve, reject) => {
        const tcp = createConnection({ host, port });
        let complete = false;
        const settle = (error, code) => {
            if (complete) return;
            complete = true;
            tcp.destroy();
            if (error) reject(error);
            else resolve({ revision, responseCode: code, accepted: code === 0 });
        };
        tcp.setTimeout(timeoutMs, () => settle(new Error("JS5 handshake timed out after sending full 21-byte request")));
        tcp.once("connect", () => tcp.write(handshake));
        tcp.on("data", (data) => {
            if (!complete && data.length > 0) settle(null, data[0]);
        });
        tcp.once("error", (error) => settle(error));
        tcp.once("end", () => settle(new Error("Server closed before JS5 response")));
        tcp.once("close", () => {
            if (!complete) settle(new Error("Connection closed before JS5 response"));
        });
    });
}
