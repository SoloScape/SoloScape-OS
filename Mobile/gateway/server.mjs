import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createConnection } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import {createGameLoginStatusObserver} from "./original-login-status.mjs";

const MAX_FRAME_BYTES = 64 * 1024;
const MAX_BUFFER_BYTES = 1024 * 1024;
const TCP_CONNECT_TIMEOUT_MS = 10_000;
// OSRS native handshakes are plain TCP, NOT TSPS's custom HELLO=200 / LOGIN=204.
// This is a protective compatibility gate, not an OSRS packet translator.
const NATIVE_FIRST_BYTES = new Set([14, 15, 16, 18]);

function forbidden(socket, status, message) {
    if (socket.destroyed) return;
    socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
}

export function createGateway({ tcpHost, tcpPort, allowedOrigins, tls, onActivity = () => {},
    isAllowedPeer=()=>true, requestHandler=null, allowedHost=null,
    maxConnections=Infinity, handshakeTimeoutMs=0 }) {
    if (!tcpHost || !Number.isInteger(tcpPort) || tcpPort < 1 || tcpPort > 65535) {
        throw new Error("A fixed TCP host and valid port are required");
    }
    if (!(allowedOrigins instanceof Set) || allowedOrigins.size === 0) {
        throw new Error("An explicit origin allowlist is required");
    }

    const handler = requestHandler ?? ((_request, response) => {
        response.writeHead(426, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        response.end("This endpoint accepts authorised WebSocket game streams only.\n");
    });
    const httpServer = tls ? createHttpsServer(tls, handler) : createHttpServer(handler);
    const wss = new WebSocketServer({
        noServer: true,
        clientTracking: true,
        perMessageDeflate: false,
        maxPayload: MAX_FRAME_BYTES,
    });

    httpServer.on("upgrade", (req, socket, head) => {
        let path;
        try { path = new URL(req.url || "/", "http://localhost").pathname; } catch { path = null; }
        const origin = req.headers.origin;
        if (!isAllowedPeer(socket.remoteAddress) || (allowedHost && req.headers.host !== allowedHost)) {
            forbidden(socket, "403 Forbidden", "Trusted local network required");
            return;
        }
        if (path !== "/" || (req.url !== "/" && req.url !== "")) {
            forbidden(socket, "404 Not Found", "Unknown gateway endpoint");
            return;
        }
        if (typeof origin !== "string" || !allowedOrigins.has(origin)) {
            forbidden(socket, "403 Forbidden", "Origin not allowed");
            return;
        }
        if(wss.clients.size>=maxConnections){
            forbidden(socket,"503 Service Unavailable","Game gateway full");return;
        }
        wss.handleUpgrade(req, socket, head, (client) => {
            wss.emit("connection", client, req);
        });
    });

    let sessionSequence=0;
    wss.on("connection", (ws) => {
        const session=++sessionSequence;
        onActivity("connected",0,session);
        let tcp = null;
        let queued = [];
        let queuedBytes = 0;
        let firstPacketAccepted = false;
        let ended = false;
        let gameStatus=null;
        const stop = (code = 1000, reason = "upstream closed") => {
            if (ended) return;
            ended = true;
            clearTimeout(handshakeTimer);
            // Only a fixed lifecycle reason and WebSocket status are reported.
            // Never inspect or record usernames, packet bytes or credentials.
            onActivity("closed:"+reason,code,session);
            queued = [];
            queuedBytes = 0;
            tcp?.destroy();
            if (ws.readyState === WebSocket.OPEN) ws.close(code, reason);
            else ws.terminate();
        };
        const handshakeTimer=handshakeTimeoutMs>0?
            setTimeout(()=>stop(1008,"Handshake timeout"),handshakeTimeoutMs):null;

        // Establish TCP only after we see a native OSRS handshake.
        // In particular, TSPS's high-level HELLO (opcode 200) must never reach
        // the native login parser, and TSPS credentials must never be forwarded.
        ws.on("message", (data, isBinary) => {
            if (ended) return;
            if (!isBinary) {
                stop(1003, "Binary OSRS packets required");
                return;
            }
            const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
            onActivity("upstreamBytes",bytes.length,session);
            // The observer only counts client frames; it never reads login
            // packet bodies, user IDs or encrypted credentials.
            gameStatus?.clientFrame();
            if (bytes.length === 0) {
                stop(1003, "Empty handshake");
                return;
            }
            if (!firstPacketAccepted) {
                if (!NATIVE_FIRST_BYTES.has(bytes[0])) {
                    stop(1003, "Incompatible protocol (TSPS adapter required)");
                    return;
                }
                firstPacketAccepted = true;
                clearTimeout(handshakeTimer);
                // Classify only the fixed, public handshake family. Never
                // report packet bytes, headers beyond this type or credentials.
                const family=bytes[0]===15?"JS5_CACHE":
                    bytes[0]===14?"GAME_INIT":
                    bytes[0]===16?"GAME_LOGIN":"GAME_RECONNECT";
                onActivity("handshake",family,session);
                if(family==="GAME_INIT")
                    gameStatus=createGameLoginStatusObserver((kind,value)=>
                        onActivity(kind,value,session));
                // Count the opening game-init frame too.
                gameStatus?.clientFrame();
                tcp = createConnection({ host: tcpHost, port: tcpPort });
                tcp.setNoDelay(true);
                tcp.setTimeout(TCP_CONNECT_TIMEOUT_MS, () => {
                    if (tcp?.connecting) stop(1011, "Upstream connection timeout");
                    else tcp.setTimeout(0);
                });
                tcp.on("connect", () => {
                    tcp.setTimeout(0);
                    for (const chunk of queued) {
                        if (!tcp.write(chunk)) ws.pause();
                    }
                    queued = [];
                    queuedBytes = 0;
                });
                tcp.on("drain", () => { if (!ended) ws.resume(); });
                tcp.on("data", (chunk) => {
                    onActivity("downstreamBytes",chunk.length,session);
                    // Process only the game's unencrypted result status.
                    // All opaque challenge bytes and account packets remain
                    // unexamined and are forwarded without modification.
                    gameStatus?.serverFrame(chunk);
                    if (ended || ws.readyState !== WebSocket.OPEN) return;
                    if (ws.bufferedAmount > MAX_BUFFER_BYTES) {
                        stop(1009, "Downstream too slow");
                        return;
                    }
                    ws.send(chunk, { binary: true, compress: false }, (error) => {
                        if (error) stop(1011, "WebSocket send failed");
                        else if (!ended) tcp.resume();
                    });
                    if (ws.bufferedAmount > MAX_BUFFER_BYTES / 2) tcp.pause();
                });
                tcp.on("error", () => stop(1011, "Upstream socket failed"));
                tcp.on("end", () => stop(1000, "Upstream closed"));
                tcp.on("close", () => stop(1000, "Upstream closed"));
            }
            if (tcp?.connecting) {
                queuedBytes += bytes.length;
                if (queuedBytes > MAX_BUFFER_BYTES) {
                    stop(1009, "Upstream queue full");
                    return;
                }
                queued.push(bytes);
            } else if (tcp && !tcp.destroyed && !tcp.write(bytes)) {
                ws.pause();
            }
        });
        ws.on("error", () => stop(1011, "WebSocket failed"));
        ws.on("close", () => stop(1000, "Browser closed"));
    });

    async function close() {
        for (const client of wss.clients) client.terminate();
        await new Promise((resolve, reject) => {
            httpServer.close((error) => error ? reject(error) : resolve());
            httpServer.closeAllConnections();
        });
        wss.close();
    }
    return { httpServer, close };
}
