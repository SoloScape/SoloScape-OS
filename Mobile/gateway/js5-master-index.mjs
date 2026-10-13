/**
 * Interpret an uncompressed JS5 master-index payload in the legacy
 * eight-byte CRC/version layout. Each pair corresponds to archive 0, 1, ...
 * This is metadata parsing, NOT verification: callers must download the
 * archive reference table and check its CRC/version before trusting entries.
 * Formats with Whirlpool digests, lengths or compression are unsupported.
 */
export function decodeCrcVersionMasterIndex(group) {
    if (!group || group.archive !== 255 || group.group !== 255) {
        throw new Error("Expected JS5 master index group 255:255");
    }
    if (group.compression !== 0) {
        throw new Error("This master-index parser supports uncompressed containers only");
    }
    const container = group.container;
    if (!Buffer.isBuffer(container) || container.length < 13 ||
        container[0] !== 0 || group.uncompressedBytes !== container.length - 5 ||
        container.readUInt32BE(1) !== container.length - 5) {
        throw new Error("Invalid uncompressed JS5 master-index container");
    }
    const bytes = container.subarray(5);
    if (bytes.length === 0 || bytes.length % 8 !== 0 || bytes.length > 256 * 8) {
        throw new Error("Master index is not a bounded eight-byte CRC/version table");
    }
    const entries = [];
    for (let offset = 0; offset < bytes.length; offset += 8) {
        entries.push({
            archive: offset / 8,
            crc: bytes.readUInt32BE(offset),
            version: bytes.readUInt32BE(offset + 4),
        });
    }
    return { format: "crc-version-8", entries };
}
