import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseJs5ReferenceTable,
} from './Js5ReferenceTable';

test('parses protocol 5 reference table with 16-bit delta ids', () => {
  const writer = new Writer();

  writer.u8(5);
  writer.u8(0);
  writer.u16(2);

  writer.u16(1);
  writer.u16(3);

  writer.u32(0x12345678);
  writer.u32(0xfedcba98);

  writer.u32(7);
  writer.u32(9);

  writer.u16(1);
  writer.u16(2);

  writer.u16(0);

  writer.u16(2);
  writer.u16(3);

  const table = parseJs5ReferenceTable(writer.bytes());

  assert.equal(table.protocol, 5);
  assert.equal(table.version, 0);
  assert.equal(table.flags, 0);
  assert.equal(table.groups.length, 2);

  assert.deepEqual(
    table.groups.map((group) => ({
      id: group.id,
      checksum: group.checksum,
      version: group.version,
      files: group.files.map((file) => file.id),
    })),
    [
      {
        id: 1,
        checksum: 0x12345678,
        version: 7,
        files: [0],
      },
      {
        id: 4,
        checksum: 0xfedcba98,
        version: 9,
        files: [2, 5],
      },
    ],
  );
});

test('parses protocol 7 smart ids and all optional fields', () => {
  const writer = new Writer();

  writer.u8(7);
  writer.u32(0x01020304);
  writer.u8(0x0f);

  writer.smart(2);

  writer.smart(2);
  writer.smart(69998);

  writer.i32(-123);
  writer.i32(456);

  writer.u32(0x11223344);
  writer.u32(0xaabbccdd);

  writer.u32(0x01010101);
  writer.u32(0x02020202);

  writer.repeat(64, 0x11);
  writer.repeat(64, 0x22);

  writer.u32(1000);
  writer.u32(2000);
  writer.u32(3000);
  writer.u32(4000);

  writer.u32(5);
  writer.u32(6);

  writer.smart(2);
  writer.smart(1);

  writer.smart(0);
  writer.smart(100000);

  writer.smart(7);

  writer.i32(-1);
  writer.i32(2);
  writer.i32(3);

  const table = parseJs5ReferenceTable(writer.bytes());

  assert.equal(table.protocol, 7);
  assert.equal(table.version, 0x01020304);
  assert.equal(table.hasNames, true);
  assert.equal(table.hasDigests, true);
  assert.equal(table.hasLengths, true);
  assert.equal(table.hasUncompressedChecksums, true);
  assert.equal(table.groups.length, 2);

  const first = table.groups[0]!;
  assert.equal(first.id, 2);
  assert.equal(first.nameHash, -123);
  assert.equal(first.checksum, 0x11223344);
  assert.equal(first.uncompressedChecksum, 0x01010101);
  assert.equal(first.length, 1000);
  assert.equal(first.uncompressedLength, 2000);
  assert.equal(first.version, 5);
  assert.equal(first.digest?.length, 64);
  assert.equal(first.digest?.[0], 0x11);
  assert.deepEqual(
    first.files,
    [
      { id: 0, nameHash: -1 },
      { id: 100000, nameHash: 2 },
    ],
  );

  const second = table.groups[1]!;
  assert.equal(second.id, 70000);
  assert.equal(second.nameHash, 456);
  assert.equal(second.checksum, 0xaabbccdd);
  assert.equal(second.uncompressedChecksum, 0x02020202);
  assert.equal(second.length, 3000);
  assert.equal(second.uncompressedLength, 4000);
  assert.equal(second.version, 6);
  assert.equal(second.digest?.[0], 0x22);
  assert.deepEqual(
    second.files,
    [{ id: 7, nameHash: 3 }],
  );
});

test('rejects unsupported protocols', () => {
  assert.throws(
    () => parseJs5ReferenceTable(new Uint8Array([8])),
    /Unsupported JS5 reference-table protocol 8/,
  );
});

test('rejects unknown flags', () => {
  const writer = new Writer();
  writer.u8(5);
  writer.u8(0x10);

  assert.throws(
    () => parseJs5ReferenceTable(writer.bytes()),
    /Unsupported JS5 reference-table flags/,
  );
});

test('rejects trailing bytes', () => {
  const writer = new Writer();
  writer.u8(5);
  writer.u8(0);
  writer.u16(0);
  writer.u8(0xff);

  assert.throws(
    () => parseJs5ReferenceTable(writer.bytes()),
    /trailing byte/,
  );
});

class Writer {
  private readonly values: number[] = [];

  u8(value: number): void {
    this.values.push(value & 0xff);
  }

  u16(value: number): void {
    this.values.push(
      (value >>> 8) & 0xff,
      value & 0xff,
    );
  }

  u32(value: number): void {
    this.values.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    );
  }

  i32(value: number): void {
    this.u32(value >>> 0);
  }

  smart(value: number): void {
    if (value <= 0x7fff) {
      this.u16(value);
      return;
    }

    this.u32((0x80000000 | value) >>> 0);
  }

  repeat(count: number, value: number): void {
    for (let index = 0; index < count; index += 1) {
      this.u8(value);
    }
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.values);
  }
}
