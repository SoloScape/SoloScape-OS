import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCrc,
  parseJs5MasterIndex,
} from './Js5MasterIndex';

test('parses crc/version pairs using record position as archive id', () => {
  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);

  view.setUint32(0, 0x12345678, false);
  view.setUint32(4, 240, false);
  view.setUint32(8, 0xfedcba98, false);
  view.setUint32(12, 0x01020304, false);

  const index = parseJs5MasterIndex(payload);

  assert.deepEqual(index.entries, [
    {
      archive: 0,
      crc: 0x12345678,
      version: 240,
    },
    {
      archive: 1,
      crc: 0xfedcba98,
      version: 0x01020304,
    },
  ]);
});

test('a 200-byte SoloScape master index contains 25 archive entries', () => {
  const index = parseJs5MasterIndex(new Uint8Array(200));

  assert.equal(index.entries.length, 25);
  assert.equal(index.entries[0]?.archive, 0);
  assert.equal(index.entries[24]?.archive, 24);
});

test('rejects malformed master-index lengths', () => {
  assert.throws(
    () => parseJs5MasterIndex(new Uint8Array(7)),
    /multiple of 8/,
  );
});

test('formats CRC values as unsigned hexadecimal', () => {
  assert.equal(formatCrc(0xfedcba98), '0xfedcba98');
});
