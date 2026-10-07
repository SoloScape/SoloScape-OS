import { crc32 } from './Js5Crc32';
import {
  formatCrc,
  type Js5ArchiveMetadata,
} from './Js5MasterIndex';
import type {
  Js5ReferenceGroup,
  Js5ReferenceTable,
} from './Js5ReferenceTable';

export interface Js5ReferenceTableValidation {
  archive: number;
  crc: number;
  version: number;
}

export interface Js5GroupValidation {
  archive: number;
  group: number;
  crc: number;
  version: number;
  trailerVersion: number;
}

/**
 * Validate an archive reference-table container against the metadata advertised
 * by the JS5 master index.
 *
 * Master-index CRCs cover the complete reconstructed cache container:
 * compression byte + size fields + compressed/stored payload.
 *
 * The master-index version must match the version embedded in the parsed
 * reference table.
 */
export function validateJs5ReferenceTable(
  archive: number,
  container: Uint8Array,
  table: Js5ReferenceTable,
  expected: Js5ArchiveMetadata,
): Js5ReferenceTableValidation {
  if (expected.archive !== archive) {
    throw new Error(
      'JS5 reference-table metadata mismatch: requested archive ' +
      archive + ', metadata belongs to archive ' + expected.archive + '.',
    );
  }

  const actualCrc = crc32(container);

  if (actualCrc !== expected.crc) {
    throw new Error(
      'JS5 reference table ' + archive +
      ' CRC mismatch: expected ' + formatCrc(expected.crc) +
      ', got ' + formatCrc(actualCrc) + '.',
    );
  }

  if (table.version !== expected.version) {
    throw new Error(
      'JS5 reference table ' + archive +
      ' version mismatch: expected ' + expected.version +
      ', got ' + table.version + '.',
    );
  }

  return {
    archive,
    crc: actualCrc,
    version: table.version,
  };
}

/**
 * Validate an ordinary archive group against its reference-table entry.
 *
 * SoloScape strips the two-byte disk-cache VersionTrailer before sending normal
 * JS5 groups, so the wire CRC covers only the reconstructed cache container.
 * The expected full group version remains in the parsed reference table.
 */
export function validateJs5Group(
  archive: number,
  group: number,
  container: Uint8Array,
  expected: Js5ReferenceGroup,
): Js5GroupValidation {
  if (expected.id !== group) {
    throw new Error(
      'JS5 group metadata mismatch: requested ' + archive + ':' + group +
      ', metadata belongs to group ' + expected.id + '.',
    );
  }

  const actualCrc = crc32(container);
  if (actualCrc !== expected.checksum) {
    throw new Error(
      'JS5 group ' + archive + ':' + group +
      ' CRC mismatch: expected ' + formatCrc(expected.checksum) +
      ', got ' + formatCrc(actualCrc) + '.',
    );
  }

  assertUint32(expected.version, 'JS5 group version');

  return {
    archive,
    group,
    crc: actualCrc,
    version: expected.version,
    trailerVersion: expected.version & 0xffff,
  };
}

/**
 * Restore the two-byte version trailer used by the on-disk cache format.
 *
 * The reference table carries a u32 version, while the disk sector trailer is
 * the low 16 bits, matching the OpenRS2-compatible cache code in this repo.
 */
export function appendJs5VersionTrailer(
  container: Uint8Array,
  version: number,
): Uint8Array {
  assertUint32(version, 'JS5 group version');

  const cacheFile = new Uint8Array(container.length + 2);
  cacheFile.set(container, 0);
  new DataView(cacheFile.buffer).setUint16(
    container.length,
    version & 0xffff,
    false,
  );
  return cacheFile;
}

export function validateJs5GroupVersionTrailer(
  cacheFile: Uint8Array,
  expectedVersion: number,
): number {
  assertUint32(expectedVersion, 'JS5 group version');

  if (cacheFile.length < 2) {
    throw new Error('JS5 cache group is too short to contain a version trailer.');
  }

  const actual = new DataView(
    cacheFile.buffer,
    cacheFile.byteOffset + cacheFile.length - 2,
    2,
  ).getUint16(0, false);
  const expected = expectedVersion & 0xffff;

  if (actual !== expected) {
    throw new Error(
      'JS5 group version trailer mismatch: expected ' +
      expected + ', got ' + actual + '.',
    );
  }

  return actual;
}

function assertUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(label + ' must be an unsigned 32-bit integer.');
  }
}
