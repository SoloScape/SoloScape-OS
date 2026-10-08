import { createConnection } from "node:net";

const JS5_HANDSHAKE = 15;
const MAX_TIMEOUT_MS = 30_000;

export function encodeJs5Handshake(revision) {
    if (!Number.isInteger(revision) || revision < 1 || revision > 0x7fffffff) {
        throw new RangeError("JS5 revision must be a positive 32-bit integer");
    }
    const bytes = Buffer.alloc(5);
    bytes[0] = JS5_HANDSHAKE;
    bytes.writeUInt32BE(revision, 1);
    return bytes;
}

/**
 * Minimal public/revision preflight. NO login, usernames, passwords, keys or
 * account tokens. A response code 0 means this JS5 handshake was accepted;
 * it does not prove a complete cache transfer or the ability to play.
 */
export function probeJs5({ host = "127.0.0.1", port, revision, timeoutMs = 5000 }) {
    if (typeof host !== "string" || !host.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("A fixed TCP host and port are required");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error("timeoutMs must be between 100 and 30000");
    }
    const handshake = encodeJs5Handshake(revision);
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
        tcp.setTimeout(timeoutMs, () => settle(new Error("JS5 handshake timed out")));
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
