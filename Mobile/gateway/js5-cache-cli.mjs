import { createHash } from "node:crypto";
import { fetchJs5MasterIndex } from "./js5-cache.mjs";

function readRevision(value) {
    if (!/^\d+$/.test(String(value ?? "")) ||
        Number(value) < 1 || Number(value) > 0x7fffffff) {
        throw new Error("SOLOSCAPE_NATIVE_REVISION must be a positive integer");
    }
    return Number(value);
}

try {
    const url = process.env.SOLOSCAPE_GATEWAY_URL || "ws://127.0.0.1:43595/";
    const origin = process.env.SOLOSCAPE_GATEWAY_ORIGIN || "http://localhost:3001";
    const revision = readRevision(process.env.SOLOSCAPE_NATIVE_REVISION);
    console.log(`[cache-probe] Requesting cache master index 255:255 over ${url}, revision ${revision}`);
    const index = await fetchJs5MasterIndex({ url, origin, revision });
    const digest = createHash("sha256").update(index.container).digest("hex");
    console.log(`[cache-probe] Master index received: ${index.container.length} bytes, compression ${index.compression}, decoded size ${index.uncompressedBytes} bytes.`);
    console.log(`[cache-probe] In-memory compressed-container SHA-256: ${digest}`);
    console.log("[cache-probe] No cache files saved. Full cache loading and mobile rendering NOT verified.");
} catch (error) {
    console.error("[cache-probe]", error.message);
    process.exitCode = 1;
}
