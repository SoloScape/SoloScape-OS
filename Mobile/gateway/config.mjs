import { isIP } from "node:net";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

function port(raw, key, fallback) {
    const value = String(raw ?? fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error(`${key} must be an integer from 1 to 65535`);
    }
    return Number(value);
}

function hostname(raw, key) {
    if (typeof raw !== "string" || !raw.trim() || raw.includes("/") || raw.includes("@") || raw.includes(" ")) {
        throw new Error(`${key} must be a hostname or IP address`);
    }
    const h = raw.trim();
    if (!(isIP(h) || /^[a-z0-9.-]+$/i.test(h))) throw new Error(`${key} must be a hostname or IP address`);
    return h;
}

function origins(raw) {
    if (!raw || !raw.trim()) throw new Error("SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS is required");
    const allowed = new Set();
    for (const token of raw.split(",")) {
        const value = token.trim();
        if (!value || value === "*" || value === "null") throw new Error("Explicit allowed origins only (no wildcard or null)");
        let url;
        try { url = new URL(value); } catch { throw new Error(`Invalid gateway allowed origin: ${value}`); }
        if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password) {
            throw new Error(`Invalid gateway allowed origin: ${value}`);
        }
        allowed.add(url.origin);
    }
    return allowed;
}

/**
 * Native OSRS network stream bridge only: DOES NOT implement the TSPS
 * high-level binary protocol, login negotiation, OSRS crypto or cache.
 */
export function parseGatewayEnvironment(env) {
    if (env.SOLOSCAPE_GATEWAY_ENABLE_NATIVE !== "1") {
        throw new Error("Native raw-TCP forwarding is opt-in. Set SOLOSCAPE_GATEWAY_ENABLE_NATIVE=1 only for compatible OSRS clients.");
    }
    const listenHost = hostname(env.SOLOSCAPE_GATEWAY_HOST || "127.0.0.1", "SOLOSCAPE_GATEWAY_HOST");
    const tcpHost = hostname(env.SOLOSCAPE_GAME_TCP_HOST || "127.0.0.1", "SOLOSCAPE_GAME_TCP_HOST");
    if (!LOOPBACK.has(listenHost) && env.SOLOSCAPE_GATEWAY_ALLOW_LAN !== "1") {
        throw new Error("Non-loopback bind requires SOLOSCAPE_GATEWAY_ALLOW_LAN=1 and a trusted LAN or TLS reverse proxy");
    }
    return {
        listenHost,
        listenPort: port(env.SOLOSCAPE_GATEWAY_PORT, "SOLOSCAPE_GATEWAY_PORT", 43595),
        tcpHost,
        tcpPort: port(env.SOLOSCAPE_GAME_TCP_PORT, "SOLOSCAPE_GAME_TCP_PORT", undefined),
        allowedOrigins: origins(env.SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS),
    };
}
