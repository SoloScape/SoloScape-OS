import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32 } from './Js5Crc32';
import {
  validateJs5ReferenceTable,
} from './Js5Validation';
import type { Js5ReferenceTable } from './Js5ReferenceTable';

test('computes the standard IEEE CRC-32 known vector', () => {
  const bytes = new TextEncoder().encode('123456789');

  assert.equal(crc32(bytes), 0xcbf43926);
});

test('validates a reference-table container CRC and version', () => {
  const container = new Uint8Array([0, 0, 0, 0, 1, 7]);
  const expectedCrc = crc32(container);
  const table = createTable(0x01020304);

  const result = validateJs5ReferenceTable(
    2,
    container,
    table,
    {
      archive: 2,
      crc: expectedCrc,
      version: 0x01020304,
    },
  );

  assert.deepEqual(result, {
    archive: 2,
    crc: expectedCrc,
    version: 0x01020304,
  });
});

test('rejects a reference-table CRC mismatch', () => {
  const container = new Uint8Array([1, 2, 3]);

  assert.throws(
    () => validateJs5ReferenceTable(
      7,
      container,
      createTable(10),
      {
        archive: 7,
        crc: (crc32(container) + 1) >>> 0,
        version: 10,
      },
    ),
    /CRC mismatch/,
  );
});

test('rejects a reference-table version mismatch', () => {
  const container = new Uint8Array([9, 8, 7]);
  const expectedCrc = crc32(container);

  assert.throws(
    () => validateJs5ReferenceTable(
      12,
      container,
      createTable(99),
      {
        archive: 12,
        crc: expectedCrc,
        version: 100,
      },
    ),
    /version mismatch/,
  );
});

test('rejects metadata for the wrong archive', () => {
  const container = new Uint8Array([1]);

  assert.throws(
    () => validateJs5ReferenceTable(
      3,
      container,
      createTable(1),
      {
        archive: 4,
        crc: crc32(container),
        version: 1,
      },
    ),
    /metadata mismatch/,
  );
});

function createTable(version: number): Js5ReferenceTable {
  return {
    protocol: 7,
    version,
    flags: 0,
    hasNames: false,
    hasDigests: false,
    hasLengths: false,
    hasUncompressedChecksums: false,
    groups: [],
  };
}
