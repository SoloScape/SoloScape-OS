import { probeGameHandshake } from "./game-probe.mjs";

function readPort(value) {
    if (!/^\d+$/.test(String(value ?? "")) ||
        Number(value) < 1 || Number(value) > 65535) {
        throw new Error("SOLOSCAPE_GAME_TCP_PORT must be an integer from 1 to 65535");
    }
    return Number(value);
}

try {
    const host = process.env.SOLOSCAPE_GAME_TCP_HOST || "127.0.0.1";
    const port = readPort(process.env.SOLOSCAPE_GAME_TCP_PORT);
    console.log(`[game-probe] Checking ${host}:${port} (opcode 14; no credentials)`);
    const result = await probeGameHandshake({ host, port });
    if (result.accepted && result.sessionIdPresent) {
        console.log("[game-probe] Native game-init accepted (response 0 + session ID). No login was attempted.");
    } else {
        console.error(`[game-probe] Native game-init rejected (response ${result.responseCode}).`);
        process.exitCode = 1;
    }
} catch (error) {
    console.error("[game-probe]", error.message);
    process.exitCode = 1;
}
