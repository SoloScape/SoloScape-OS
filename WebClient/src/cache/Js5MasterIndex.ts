export interface Js5ArchiveMetadata {
  archive: number;
  crc: number;
  version: number;
}

export interface Js5MasterIndex {
  entries: Js5ArchiveMetadata[];
}

/**
 * OSRS JS5 master-index payload.
 *
 * The master index is a flat sequence of 8-byte archive records:
 *
 *   crc:     u32
 *   version: u32
 *
 * Record position is the archive id.
 */
export function parseJs5MasterIndex(payload: Uint8Array): Js5MasterIndex {
  if (payload.length === 0 || payload.length % 8 !== 0) {
    throw new Error(
      'Invalid JS5 master index length ' + payload.length +
      '; expected a non-zero multiple of 8 bytes.',
    );
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  );
  const entries: Js5ArchiveMetadata[] = [];

  for (
    let offset = 0, archive = 0;
    offset < payload.length;
    offset += 8, archive += 1
  ) {
    entries.push({
      archive,
      crc: view.getUint32(offset, false),
      version: view.getUint32(offset + 4, false),
    });
  }

  return { entries };
}

/**
 * Empty archive slots are encoded in the master index as crc=0/version=0.
 * They are addressable positions, but there is no 255:<archive> reference
 * table for the server to return.
 */
export function isJs5ArchivePresent(
  entry: Js5ArchiveMetadata,
): boolean {
  return entry.crc !== 0 || entry.version !== 0;
}

export function presentJs5Archives(
  index: Js5MasterIndex,
): Js5ArchiveMetadata[] {
  return index.entries.filter(isJs5ArchivePresent);
}

export function formatCrc(crc: number): string {
  return '0x' + crc.toString(16).padStart(8, '0');
}
