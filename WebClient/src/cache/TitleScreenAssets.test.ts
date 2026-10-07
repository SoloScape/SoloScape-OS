import assert from 'node:assert/strict';
import test from 'node:test';
import { js5NameHash } from './Js5NameHash';
import { resolveNamedGroup } from './TitleScreenAssets';
import type { Js5ReferenceTable } from './Js5ReferenceTable';
import type { Js5Client } from './Js5Client';

test('resolves title assets by cache group name hash', () => {
  const table: Js5ReferenceTable = {
    protocol: 7,
    version: 1,
    flags: 0x01,
    hasNames: true,
    hasDigests: false,
    hasLengths: false,
    hasUncompressedChecksums: false,
    groups: [
      {
        id: 2132,
        nameHash: js5NameHash('logo_osrs'),
        checksum: 0,
        uncompressedChecksum: null,
        digest: null,
        length: null,
        uncompressedLength: null,
        version: 1,
        files: [{ id: 0, nameHash: null }],
      },
    ],
  };

  const js5 = {
    getArchiveReferenceTable() {
      return table;
    },
  } as Pick<Js5Client, 'getArchiveReferenceTable'>;

  assert.deepEqual(
    resolveNamedGroup(js5, 8, ['logo_osrs', 'logo']),
    { name: 'logo_osrs', group: 2132 },
  );
});

test('does not invent a fallback when a cache title asset is absent', () => {
  const table: Js5ReferenceTable = {
    protocol: 7,
    version: 1,
    flags: 0x01,
    hasNames: true,
    hasDigests: false,
    hasLengths: false,
    hasUncompressedChecksums: false,
    groups: [],
  };

  const js5 = {
    getArchiveReferenceTable() {
      return table;
    },
  } as Pick<Js5Client, 'getArchiveReferenceTable'>;

  assert.throws(
    () => resolveNamedGroup(js5, 8, ['titlebutton']),
    /missing required named group/,
  );
});
