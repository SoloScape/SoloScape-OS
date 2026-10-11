import { crc32 } from "node:zlib";
import { decodeReferenceTableGroupCrcs } from "./js5-reference-header.mjs";

/**
 * Compare an in-memory archive-0 JS5 container (with 2-byte sector version
 * suffix removed by the OpenRune provider) against the CRC32 metadata in
 * archive-0's verified reference table. CRC32 is not authentication.
 */
export function verifyArchive0GroupCrc(referenceTable, archiveGroup, groupId) {
    if (!Number.isInteger(groupId) || groupId < 0 || groupId > 65535) {
        throw new RangeError("Archive 0 group ID is out of range");
    }
    if (!archiveGroup || archiveGroup.archive !== 0 || archiveGroup.group !== groupId ||
        !Buffer.isBuffer(archiveGroup.container)) {
        throw new Error("Mismatched archive-0 group response");
    }
    const { groups, revision } = decodeReferenceTableGroupCrcs(referenceTable);
    const row = groups.find(entry => entry.group === groupId);
    if (!row) throw new Error(`Archive 0 group ${groupId} is missing from the reference catalog`);
    const actual = crc32(archiveGroup.container) >>> 0;
    if (actual !== row.crc32) {
        throw new Error(`Archive 0 group ${groupId} CRC32 mismatch: expected 0x${row.crc32.toString(16).padStart(8, "0")}, received 0x${actual.toString(16).padStart(8, "0")}`);
    }
    return {
        archive: 0,
        group: groupId,
        crc32: actual,
        bytes: archiveGroup.container.length,
        referenceRevision: revision,
        matched: true,
    };
}
