import { fetchJs5IndexGroup, fetchJs5MasterIndex } from "./js5-cache.mjs";
import { verifyReferenceTableCrc } from "./js5-reference-verify.mjs";
import { decodeReferenceTableHeader, verifyReferenceRevision } from "./js5-reference-header.mjs";

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
    const options = { url, origin, revision };
    console.log(`[cache-verify] Checking master-index CRC for archive reference table 255:0 through ${url} (revision ${revision}, no credentials)`);
    const master = await fetchJs5MasterIndex(options);
    const referenceTable = await fetchJs5IndexGroup({ ...options, index: 0 });
    const result = verifyReferenceTableCrc(master, referenceTable, 0);
    console.log(`[cache-verify] Archive ${result.archive} reference-table CRC32 verified: 0x${result.crc32.toString(16).padStart(8, "0")}, ${result.referenceTableBytes} bytes.`);
    const header = decodeReferenceTableHeader(referenceTable);
    verifyReferenceRevision(header, result.referenceTableVersion);
    console.log(`[cache-verify] Reference-table format ${header.format}; archive 0 revision ${header.revision} verified against master index.`);
    console.log(`[cache-verify] Archive 0 catalog header: ${header.archiveCount} archive groups (first ${header.firstArchiveId ?? "none"}, last ${header.lastArchiveId ?? "none"}), ${header.decodedBytes} decoded bytes.`);
    console.log("[cache-verify] No cache data saved. CRC32 integrity is not cryptographic authenticity; native login, assets and rendering NOT verified.");
} catch (error) {
    console.error("[cache-verify]", error.message);
    process.exitCode = 1;
}
