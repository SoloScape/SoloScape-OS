import { crc32 } from './Js5Crc32';
import {
  formatCrc,
  type Js5ArchiveMetadata,
} from './Js5MasterIndex';
import type { Js5ReferenceTable } from './Js5ReferenceTable';

export interface Js5ReferenceTableValidation {
  archive: number;
  crc: number;
  version: number;
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
