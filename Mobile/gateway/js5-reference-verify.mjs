import { crc32 } from "node:zlib";
import { decodeCrcVersionMasterIndex } from "./js5-master-index.mjs";

/**
 * Verify the raw (compressed or uncompressed) archive reference-table sector
 * supplied as JS5 group 255:<index>. The OpenRune provider forwards the
 * full index-255 sector without stripping a 2-byte version trailer.
 * The CRC/version master index stores CRC32 of exactly those sector bytes.
 * CRC32 is an integrity/error-detection checksum, NOT an authenticity check.
 */
export function verifyReferenceTableCrc(masterIndex, referenceTable, index = 0) {
    const { entries } = decodeCrcVersionMasterIndex(masterIndex);
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
        throw new RangeError("Selected archive index is not in the master-index metadata");
    }
    if (!referenceTable || referenceTable.archive !== 255 || referenceTable.group !== index ||
        !Buffer.isBuffer(referenceTable.container) || referenceTable.container.length < 5) {
        throw new Error("Invalid or mismatched archive reference-table group");
    }
    const { crc: expectedCrc, version } = entries[index];
    const actualCrc = crc32(referenceTable.container) >>> 0;
    if (actualCrc !== expectedCrc) {
        throw new Error(
            `Archive ${index} reference-table CRC32 mismatch: expected 0x${expectedCrc.toString(16).padStart(8, "0")}, received 0x${actualCrc.toString(16).padStart(8, "0")}`,
        );
    }
    return {
        archive: index,
        crc32: actualCrc,
        referenceTableVersion: version,
        referenceTableBytes: referenceTable.container.length,
        matched: true,
    };
}
