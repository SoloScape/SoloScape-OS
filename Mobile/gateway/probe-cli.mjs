import { probeJs5 } from "./js5-probe.mjs";

function readPositiveInteger(value, key) {
    if (!/^\d+$/.test(String(value ?? "")) || Number(value) < 1 || Number(value) > 0x7fffffff) {
        throw new Error(`${key} must be a positive integer`);
    }
    return Number(value);
}

try {
    const host = process.env.SOLOSCAPE_GAME_TCP_HOST || "127.0.0.1";
    const port = readPositiveInteger(process.env.SOLOSCAPE_GAME_TCP_PORT, "SOLOSCAPE_GAME_TCP_PORT");
    const revision = readPositiveInteger(process.env.SOLOSCAPE_NATIVE_REVISION, "SOLOSCAPE_NATIVE_REVISION");
    console.log(`[js5-probe] Checking ${host}:${port} for native cache revision ${revision} (21-byte JS5 request; no credentials)`);
    const result = await probeJs5({ host, port, revision });
    if (result.accepted) {
        console.log("[js5-probe] Native JS5 handshake accepted (response 0); game login and cache transfer NOT verified.");
    } else {
        console.error(`[js5-probe] Native JS5 handshake rejected (response ${result.responseCode}); confirm revision and server settings.`);
        process.exitCode = 1;
    }
} catch (error) {
    console.error("[js5-probe]", error.message);
    process.exitCode = 1;
}
