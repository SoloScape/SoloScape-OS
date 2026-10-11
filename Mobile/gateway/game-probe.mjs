import { createConnection } from "node:net";

// Native OSRS/rsprot pre-auth game handshake, revision 240.
// LoginClientProt.INIT_GAME_CONNECTION = 14 with zero payload bytes.
// SuccessfulLoginResponseEncoder writes opcode 0 then 8-byte session ID.
// NO username/password, login packet, XTEA, ISAAC or account data is sent.
const INIT_GAME_CONNECTION = 14;
const GAME_SUCCESS = 0;
const SUCCESS_RESPONSE_BYTES = 9;
const MAX_TIMEOUT_MS = 30_000;

export function encodeGameHandshake() {
    return Buffer.from([INIT_GAME_CONNECTION]);
}

/**
 * Probe the native game channel *before authentication*.
 *
 * A successful response is 0x00 + 8 opaque bytes (the server's session ID).
 * This module intentionally does not return, print, or persist that ID.
 * Acceptance DOES NOT mean the client can log in or send game packets.
 */
export function probeGameHandshake({ host = "127.0.0.1", port, timeoutMs = 5000 } = {}) {
    if (typeof host !== "string" || !host.trim() ||
        !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("A fixed TCP host and port are required");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error("timeoutMs must be between 100 and 30000");
    }

    return new Promise((resolve, reject) => {
        const tcp = createConnection({ host, port });
        let finished = false;
        let response = Buffer.alloc(0);

        const settle = (error, result) => {
            if (finished) return;
            finished = true;
            response.fill(0);
            tcp.destroy();
            if (error) reject(error);
            else resolve(result);
        };

        tcp.setTimeout(timeoutMs, () => settle(new Error("Native game handshake timed out")));
        tcp.once("connect", () => tcp.write(encodeGameHandshake()));
        tcp.on("data", (chunk) => {
            if (finished || chunk.length === 0) return;
            // Bound buffered material to precisely the expected response.
            const remaining = SUCCESS_RESPONSE_BYTES - response.length;
            if (remaining > 0) {
                response = Buffer.concat([response, chunk.subarray(0, remaining)]);
            }
            if (response.length === 0) return;
            const code = response[0];
            if (code !== GAME_SUCCESS) {
                settle(null, { responseCode: code, accepted: false, sessionIdPresent: false });
                return;
            }
            if (response.length === SUCCESS_RESPONSE_BYTES) {
                settle(null, { responseCode: code, accepted: true, sessionIdPresent: true });
            }
        });
        tcp.once("error", (error) => settle(error));
        tcp.once("end", () => settle(new Error("Server closed before complete game handshake response")));
        tcp.once("close", () => {
            if (!finished) settle(new Error("Connection closed before complete game handshake response"));
        });
    });
}
