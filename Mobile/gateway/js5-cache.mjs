import WebSocket from "ws";
import { encodeJs5Handshake } from "./js5-probe.mjs";
import { validateGatewayEndpoint } from "./gateway-probe.mjs";
import { encodeJs5UrgentRequest, Js5GroupAssembler } from "./js5-group.mjs";

/**
 * Download one INDEX METADATA group (255:<index>, or master index 255:255)
 * from the native JS5 server through the WebSocket gateway.
 * This deliberately rejects arbitrary archive payload/group requests.
 * Returned containers are in-memory only; no cache assets are persisted.
 */
export function fetchJs5IndexGroup({
    url = "ws://127.0.0.1:43595/",
    origin = "http://localhost:3001",
    revision,
    index = 255,
    timeoutMs = 10000,
} = {}) {
    validateGatewayEndpoint(url, origin);
    if (!Number.isInteger(index) || index < 0 || index > 255) {
        throw new RangeError("JS5 index ID must be an integer from 0 to 255");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
        throw new Error("timeoutMs must be between 100 and 30000");
    }
    const handshake = encodeJs5Handshake(revision);
    const urgent = encodeJs5UrgentRequest(255, index);
    const assembler = new Js5GroupAssembler({ archive: 255, group: index });

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, {
            origin, handshakeTimeout: timeoutMs, perMessageDeflate: false,
            maxPayload: 64 * 1024,
        });
        let stage = "handshake";
        let completed = false;
        const finish = (error, group) => {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            ws.terminate();
            if (error) reject(error);
            else resolve(group);
        };
        const timer = setTimeout(() => finish(new Error(`Cache index group 255:${index} request timed out`)), timeoutMs);
        ws.once("open", () => ws.send(handshake, { binary: true }, (error) => {
            if (error) finish(error);
        }));
        ws.on("message", (data, isBinary) => {
            if (completed) return;
            if (!isBinary) {
                finish(new Error("Cache response must be binary"));
                return;
            }
            const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (chunk.length === 0) return;
            if (stage === "handshake") {
                if (chunk.length !== 1) {
                    finish(new Error("Unexpected bytes in native JS5 handshake response"));
                    return;
                }
                if (chunk[0] !== 0) {
                    finish(new Error(`Native JS5 handshake rejected (response ${chunk[0]})`));
                    return;
                }
                stage = "master-index";
                ws.send(urgent, { binary: true }, (error) => {
                    if (error) finish(error);
                });
                return;
            }
            try {
                const group = assembler.push(chunk);
                if (group !== null) finish(null, group);
            } catch (error) {
                finish(error);
            }
        });
        ws.once("error", (error) => finish(error));
        ws.once("close", (code, reason) => {
            if (!completed) finish(new Error(`Cache stream closed early (code ${code}: ${String(reason)})`));
        });
    });
}

/** Keep existing master-index API stable for clients and smoke tests. */
export function fetchJs5MasterIndex(options = {}) {
    return fetchJs5IndexGroup({ ...options, index: 255 });
}
