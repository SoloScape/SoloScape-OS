import WebSocket from "ws";
import { encodeGameHandshake } from "./game-probe.mjs";
import { encodeJs5Handshake } from "./js5-probe.mjs";

const MAX_TIMEOUT_MS = 30_000;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateGatewayEndpoint(url, origin) {
    let wsUrl, originUrl;
    try {
        wsUrl = new URL(url);
        originUrl = new URL(origin);
    } catch {
        throw new Error("SOLOSCAPE_GATEWAY_URL and SOLOSCAPE_GATEWAY_ORIGIN must be valid URLs");
    }
    if (!["ws:", "wss:"].includes(wsUrl.protocol) || wsUrl.username || wsUrl.password ||
        wsUrl.pathname !== "/" || wsUrl.search || wsUrl.hash) {
        throw new Error("Gateway endpoint must be a ws:// or wss:// URL at / without credentials or query");
    }
    if (wsUrl.protocol === "ws:" && !LOOPBACK.has(wsUrl.hostname)) {
        throw new Error("Plain ws:// probing is permitted only for a loopback gateway; use wss:// remotely");
    }
    if (!["http:", "https:"].includes(originUrl.protocol) ||
        originUrl.origin !== origin || originUrl.username || originUrl.password) {
        throw new Error("SOLOSCAPE_GATEWAY_ORIGIN must be one exact http(s):// origin");
    }
}

export function probeGateway({ url = "ws://127.0.0.1:43595/", origin = "http://localhost:3001",
    mode, revision, timeoutMs = 5000 } = {}) {
    validateGatewayEndpoint(url, origin);
    if (!["js5", "game"].includes(mode)) {
        throw new Error("Probe mode must be js5 or game");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error("timeoutMs must be between 100 and 30000");
    }
    const request = mode === "js5" ? encodeJs5Handshake(revision) : encodeGameHandshake();
    const expectedLength = mode === "js5" ? 1 : 9;

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, { origin, handshakeTimeout: timeoutMs, perMessageDeflate: false });
        let done = false;
        let response = Buffer.alloc(0);
        const finish = (error, result) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            response.fill(0); // Do not retain, print or expose game session IDs.
            ws.terminate();
            if (error) reject(error);
            else resolve(result);
        };
        const timer = setTimeout(() => finish(new Error(`WebSocket ${mode} probe timed out`)), timeoutMs);
        ws.once("open", () => ws.send(request, { binary: true }, (error) => {
            if (error) finish(error);
        }));
        ws.on("message", (data, binary) => {
            if (done) return;
            if (!binary) {
                finish(new Error("Non-binary gateway handshake response"));
                return;
            }
            const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (chunk.length === 0) return;
            const remaining = expectedLength - response.length;
            if (chunk.length > remaining) {
                finish(new Error("Oversized or unexpected gateway handshake response"));
                return;
            }
            response = Buffer.concat([response, chunk]);
            const code = response[0];
            if (code !== 0) {
                finish(null, { mode, responseCode: code, accepted: false });
                return;
            }
            if (response.length === expectedLength) {
                finish(null, { mode, responseCode: code, accepted: true });
            }
        });
        ws.once("error", (error) => finish(error));
        ws.once("close", (code, reason) => {
            if (!done) finish(new Error(`Gateway connection closed before ${mode} response (code ${code}: ${String(reason)})`));
        });
    });
}
