import assert from 'node:assert/strict';
import test from 'node:test';
import { CacheInterfaceStore, decodeCacheInterfaceComponent } from './CacheInterfaceDefinitions';
import type { Js5Client } from './Js5Client';

test('decodes IF3 cache text widget layout and the original font reference', () => {
  const bytes = new Uint8Array([
    0xff, 4, 0, 0, 0xff, 0xfe, 0, 3, 0, 100, 0, 20,
    0, 0, 0, 0, 0xff, 0xff, 0, 0, 2,
    72, 105, 0, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff,
  ]);
  const component = decodeCacheInterfaceComponent(149, 2, bytes);
  assert.equal(component.format, 'if3');
  assert.equal(component.id, (149 << 16) | 2);
  assert.equal(component.type, 4);
  assert.equal(component.x, -2);
  assert.equal(component.y, 3);
  assert.equal(component.width, 100);
  assert.equal(component.height, 20);
  assert.equal(component.parentId, -1);
  assert.equal(component.fontId, 2);
  assert.equal(component.text, 'Hi');
  assert.equal(component.spriteId, null);
  assert.deepEqual(component.raw, bytes);
});

test('decodes IF3 cache sprite reference and parent linkage', () => {
  const bytes = new Uint8Array([
    0xff, 5, 0, 0, 0, 0, 0, 0, 0, 32, 0, 32,
    0, 0, 0, 0, 0, 1, 0,
    0, 0, 1, 0x23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const component = decodeCacheInterfaceComponent(149, 5, bytes);
  assert.equal(component.spriteId, 0x123);
  assert.equal(component.parentId, (149 << 16) | 1);
  assert.equal(component.type, 5);
});

test('reads IF1 legacy layout headers without fabricating sprite data', () => {
  const bytes = new Uint8Array([
    0, 0, 0, 5, 0, 1, 0, 2, 0, 200, 0, 100, 0, 0xff, 0xff, 0xff, 0xff,
  ]);
  const component = decodeCacheInterfaceComponent(20, 3, bytes);
  assert.equal(component.format, 'if1');
  assert.equal(component.contentType, 5);
  assert.equal(component.parentId, -1);
  assert.equal(component.spriteId, null);
});

test('rejects truncated widget definitions', () => {
  assert.throws(() => decodeCacheInterfaceComponent(1, 1,
    new Uint8Array([0xff, 5, 0, 0])), /Truncated interface definition/);
});

test('downloads only requested cache interface group 3:id and retains sparse file ids', async () => {
  const calls: Array<[number, number]> = [];
  const bytes = new Uint8Array([
    0, 0, 0, 5, 0, 1, 0, 2, 0, 200, 0, 100, 0, 0xff, 0xff, 0xff, 0xff,
  ]);
  const js5 = {
    getArchiveReferenceTable: (archive: number) => {
      assert.equal(archive, 3);
      return { groups: [{ id: 149 }] };
    },
    downloadGroup: async (archive: number, group: number) => {
      calls.push([archive, group]);
      return { files: new Map([[0, bytes], [55, bytes]]) };
    },
  } as unknown as Js5Client;
  const store = new CacheInterfaceStore(js5);
  const first = await store.load(149);
  assert.equal(first.size, 2);
  assert.equal(first.get(55)?.id, (149 << 16) | 55);
  assert.strictEqual(await store.load(149), first);
  assert.deepEqual(calls, [[3, 149]]);
  await assert.rejects(store.load(150), /No cache interface group/);
});
