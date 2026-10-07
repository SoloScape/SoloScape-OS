import assert from 'node:assert/strict';
import test from 'node:test';
import {
  unpackJs5Group,
} from './Js5Group';
import type {
  Js5ReferenceGroup,
} from './Js5ReferenceTable';

test('unpacks a single sparse-id file as the whole payload', () => {
  const payload = new Uint8Array([10, 20, 30]);

  const files = unpackJs5Group(payload, createGroup(42, [7]));

  assert.deepEqual(Array.from(files.keys()), [7]);
  assert.deepEqual(Array.from(files.get(7)!), [10, 20, 30]);
  assert.notEqual(files.get(7), payload);
});

test('unpacks one stripe and preserves sparse file ids', () => {
  const payload = packStripedGroup([
    [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6, 7, 8]),
    ],
  ]);

  const files = unpackJs5Group(payload, createGroup(9, [2, 11]));

  assert.deepEqual(Array.from(files.get(2)!), [1, 2, 3]);
  assert.deepEqual(Array.from(files.get(11)!), [4, 5, 6, 7, 8]);
});

test('unpacks multiple stripes into complete files', () => {
  const payload = packStripedGroup([
    [
      new Uint8Array([1, 2]),
      new Uint8Array([10, 11, 12]),
    ],
    [
      new Uint8Array([3]),
      new Uint8Array([13, 14, 15, 16]),
    ],
  ]);

  const files = unpackJs5Group(payload, createGroup(14, [0, 5]));

  assert.deepEqual(Array.from(files.get(0)!), [1, 2, 3]);
  assert.deepEqual(
    Array.from(files.get(5)!),
    [10, 11, 12, 13, 14, 15, 16],
  );
});

test('supports the zero-stripe encoding for empty multi-file groups', () => {
  const files = unpackJs5Group(
    new Uint8Array([0]),
    createGroup(1, [0, 3]),
  );

  assert.equal(files.get(0)!.length, 0);
  assert.equal(files.get(3)!.length, 0);
});

test('rejects a stripe table that overlaps group data', () => {
  const payload = new Uint8Array([1, 2, 3, 2]);

  assert.throws(
    () => unpackJs5Group(payload, createGroup(1, [0, 1])),
    /stripe table extends before/,
  );
});

function packStripedGroup(
  stripes: Uint8Array[][],
): Uint8Array {
  assert.ok(stripes.length > 0);
  const fileCount = stripes[0]!.length;
  assert.ok(fileCount > 1);

  const data: number[] = [];
  const table: number[] = [];

  for (const stripe of stripes) {
    assert.equal(stripe.length, fileCount);

    let previousLength = 0;
    for (const chunk of stripe) {
      data.push(...chunk);
      writeI32(table, chunk.length - previousLength);
      previousLength = chunk.length;
    }
  }

  return new Uint8Array([
    ...data,
    ...table,
    stripes.length,
  ]);
}

function writeI32(output: number[], value: number): void {
  const encoded = value >>> 0;
  output.push(
    (encoded >>> 24) & 0xff,
    (encoded >>> 16) & 0xff,
    (encoded >>> 8) & 0xff,
    encoded & 0xff,
  );
}

function createGroup(
  id: number,
  fileIds: number[],
): Js5ReferenceGroup {
  return {
    id,
    nameHash: null,
    checksum: 0,
    uncompressedChecksum: null,
    digest: null,
    length: null,
    uncompressedLength: null,
    version: 0,
    files: fileIds.map((fileId) => ({
      id: fileId,
      nameHash: null,
    })),
  };
}
