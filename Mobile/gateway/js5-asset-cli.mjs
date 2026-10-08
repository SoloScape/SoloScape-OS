import { fetchJs5Archive0Group, fetchJs5IndexGroup, fetchJs5MasterIndex } from "./js5-cache.mjs";
import { verifyReferenceTableCrc } from "./js5-reference-verify.mjs";
import {
    decodeReferenceTableGroupCrcs,
    verifyReferenceRevision,
} from "./js5-reference-header.mjs";
import { verifyArchive0GroupCrc } from "./js5-asset-verify.mjs";

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
    console.log(`[asset-probe] Checking archive 0 first group through ${url} (revision ${revision}; no login or disk writes)`);
    const master = await fetchJs5MasterIndex(options);
    const reference = await fetchJs5IndexGroup({ ...options, index: 0 });
    const meta = verifyReferenceTableCrc(master, reference, 0);
    const catalog = decodeReferenceTableGroupCrcs(reference);
    verifyReferenceRevision(catalog, meta.referenceTableVersion);
    if (catalog.groups.length === 0) throw new Error("Archive 0 has no catalogue groups");
    // Restrict to one existing group from the verified archive-0 metadata.
    const groupId = catalog.groups[0].group;
    console.log(`[asset-probe] Catalog verified: ${catalog.archiveCount} groups, checking only archive 0 group ${groupId}`);
    const group = await fetchJs5Archive0Group({ ...options, group: groupId });
    const result = verifyArchive0GroupCrc(reference, group, groupId);
    console.log(`[asset-probe] Archive ${result.archive} group ${result.group} CRC32 verified: 0x${result.crc32.toString(16).padStart(8, "0")}, ${result.bytes} bytes.`);
    console.log("[asset-probe] No asset data saved or rendered. CRC32 is not cryptographic authenticity; native login and gameplay NOT verified.");
} catch (error) {
    console.error("[asset-probe]", error.message);
    process.exitCode = 1;
}
