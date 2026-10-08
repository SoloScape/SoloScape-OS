import assert from 'node:assert/strict';
import test from 'node:test';
import { loadInterfaceSprite, widgetSpriteCandidates } from './CacheGameUiAssets';
import type { Js5Client } from './Js5Client';

const sprite = Uint8Array.from([
  0, 1, // one opaque index-1 pixel
  1, 2, 3, // RGB palette entry
  0, 1, 0, 1, 1, // 1x1 sheet and palette size
  0, 0, 0, 0, 0, 1, 0, 1, // offsets and sprite size
  0, 1, // one sprite
]);

test('IF3 packed sprite refs select archive-8 group and file, not the entire ref as a group', () => {
  assert.deepEqual(widgetSpriteCandidates((149 << 16) | 2), [
    { groupId: 149, fileId: 2 },
  ]);
  assert.deepEqual(widgetSpriteCandidates(42), [
    { groupId: 42, fileId: 0 },
  ]);
  assert.deepEqual(widgetSpriteCandidates(-1), []);
});

test('loads exactly the packed sprite file from the validated JS5 group', async () => {
  const calls: Array<[number, number]> = [];
  const client = {
    getArchiveReferenceTable: (archive: number) => {
      assert.equal(archive, 8);
      return { groups: [{ id: 149 }, { id: 42 }] };
    },
    downloadGroup: async (archive: number, group: number) => {
      calls.push([archive, group]);
      return { files: new Map([[2, sprite]]) };
    },
  } as unknown as Js5Client;
  const images = await loadInterfaceSprite(client, (149 << 16) | 2);
  assert.equal(images.length, 1);
  assert.equal(images[0]?.indices[0], 1);
  assert.deepEqual(calls, [[8, 149]]);
  await assert.rejects(loadInterfaceSprite(client, 1234), /Missing archive-8/);
});
