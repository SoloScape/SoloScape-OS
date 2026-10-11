import { probeGateway } from "./gateway-probe.mjs";

try {
    const url = process.env.SOLOSCAPE_GATEWAY_URL || "ws://127.0.0.1:43595/";
    const origin = process.env.SOLOSCAPE_GATEWAY_ORIGIN || "http://localhost:3001";
    const revisionRaw = process.env.SOLOSCAPE_NATIVE_REVISION;
    if (!/^\d+$/.test(String(revisionRaw ?? "")) || Number(revisionRaw) < 1 ||
        Number(revisionRaw) > 0x7fffffff) {
        throw new Error("SOLOSCAPE_NATIVE_REVISION must be a positive integer");
    }
    const revision = Number(revisionRaw);
    console.log(`[gateway-probe] Testing ${url} with Origin ${origin} (no credentials)`);
    for (const mode of ["js5", "game"]) {
        const result = await probeGateway({ url, origin, mode, revision });
        if (!result.accepted) {
            console.error(`[gateway-probe] ${mode} handshake rejected (native response ${result.responseCode}).`);
            process.exitCode = 1;
            break;
        }
        console.log(`[gateway-probe] Native ${mode.toUpperCase()} handshake accepted through WebSocket gateway (response ${result.responseCode}).`);
    }
    if (process.exitCode !== 1) {
        console.log("[gateway-probe] Both pre-auth connections passed. Cache transfer, login and gameplay are NOT verified.");
    }
} catch (error) {
    console.error("[gateway-probe]", error.message);
    process.exitCode = 1;
}
