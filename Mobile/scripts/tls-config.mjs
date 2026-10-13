import { readFileSync } from "node:fs";

export function loadTlsEnvironment(env) {
    const cert = env.SOLOSCAPE_TLS_CERT_FILE;
    const key = env.SOLOSCAPE_TLS_KEY_FILE;
    if (!cert && !key) return undefined;
    if (!cert || !key) throw new Error("Set both SOLOSCAPE_TLS_CERT_FILE and SOLOSCAPE_TLS_KEY_FILE");
    return { cert: readFileSync(cert), key: readFileSync(key), minVersion: "TLSv1.2" };
}

export function previewEnvironment(env) {
    const host = env.SOLOSCAPE_PREVIEW_HOST || "127.0.0.1";
    const port = Number(env.SOLOSCAPE_PREVIEW_PORT ?? 3001);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid SOLOSCAPE_PREVIEW_PORT");
    const tls = loadTlsEnvironment(env);
    if (!["127.0.0.1", "localhost", "::1"].includes(host) && !tls) {
        throw new Error("LAN preview requires a TLS certificate and key");
    }
    if (tls && !env.SOLOSCAPE_NATIVE_GATEWAY_URL?.startsWith("wss://")) {
        throw new Error("HTTPS preview requires SOLOSCAPE_NATIVE_GATEWAY_URL=wss://...");
    }
    return { host, port, tls };
}
