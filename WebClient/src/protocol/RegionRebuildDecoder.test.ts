import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeInstancedRegionRebuild,
  decodeNormalRegionRebuild,
  tryDecodeRegionRebuildPacket,
} from './RegionRebuildDecoder';

test('decodes REBUILD_NORMAL_V2 transformed shorts and static mapsquares', () => {
  const payload = concat(
    p2Alt3(500),
    p2Alt3(7),
    p2Alt3(400),
  );

  const rebuild = decodeNormalRegionRebuild(payload);
  assert.equal(rebuild.kind, 'normal');
  assert.equal(rebuild.zoneX, 400);
  assert.equal(rebuild.zoneZ, 500);
  assert.equal(rebuild.worldArea, 7);
  assert.ok(rebuild.mapSquares.length >= 4);
  assert.ok(
    rebuild.mapSquares.some(
      (square) => square.x === 49 && square.z === 61,
    ),
  );
});

test('decodes login REBUILD_NORMAL_V2 after the 4608-byte GPI init block', () => {
  const gpiInit = new Uint8Array(4608);
  gpiInit.fill(0xa5);
  const payload = concat(
    gpiInit,
    p2Alt3(500),
    p2Alt3(7),
    p2Alt3(400),
  );

  assert.equal(payload.length, 4614);
  const rebuild = decodeNormalRegionRebuild(payload);
  assert.equal(rebuild.zoneX, 400);
  assert.equal(rebuild.zoneZ, 500);
  assert.equal(rebuild.worldArea, 7);
  assert.ok(
    rebuild.mapSquares.some(
      (square) => square.x === 49 && square.z === 61,
    ),
  );
});

test('rejects malformed REBUILD_NORMAL_V2 payload lengths', () => {
  assert.throws(
    () => decodeNormalRegionRebuild(new Uint8Array(7)),
    /6 bytes .*4614 bytes/,
  );
});

test('decodes all 676 instanced zone slots and distinct source mapsquares', () => {
  const zones = new Map<number, number>();
  zones.set(0, packReferenceZone(320, 400, 1, 2));
  zones.set(1, packReferenceZone(321, 401, 1, 3));
  zones.set(675, packReferenceZone(560, 720, 3, 1));

  const payload = encodeInstancedRebuild(400, 500, true, zones);
  const rebuild = decodeInstancedRegionRebuild(payload);

  assert.equal(rebuild.kind, 'instanced');
  assert.equal(rebuild.zoneX, 400);
  assert.equal(rebuild.zoneZ, 500);
  assert.equal(rebuild.reload, true);
  assert.equal(rebuild.zones.length, 676);
  assert.equal(rebuild.mapSquareCount, 2);
  assert.deepEqual(
    rebuild.mapSquares.map((square) => [square.x, square.z]),
    [[40, 50], [70, 90]],
  );

  const first = rebuild.zones[0];
  assert.ok(first);
  assert.equal(first.destinationLevel, 0);
  assert.equal(first.destinationZoneX, 394);
  assert.equal(first.destinationZoneZ, 494);
  assert.equal(first.sourceLevel, 1);
  assert.equal(first.sourceZoneX, 320);
  assert.equal(first.sourceZoneZ, 400);
  assert.equal(first.rotation, 2);

  const last = rebuild.zones[675];
  assert.ok(last);
  assert.equal(last.destinationLevel, 3);
  assert.equal(last.destinationZoneX, 406);
  assert.equal(last.destinationZoneZ, 506);
  assert.equal(last.sourceLevel, 3);
  assert.equal(last.rotation, 1);
});

test('rejects instanced rebuild when mapsquare header does not match bitstream', () => {
  const payload = encodeInstancedRebuild(
    400,
    500,
    false,
    new Map([[0, packReferenceZone(320, 400, 0, 0)]]),
  );
  payload[5] = 0;
  payload[6] = 2;
  assert.throws(
    () => decodeInstancedRegionRebuild(payload),
    /mapsquare count mismatch/,
  );
});

test('packet dispatcher ignores unrelated server packets', () => {
  assert.equal(
    tryDecodeRegionRebuildPacket({
      opcode: 17,
      name: 'CAM_RESET',
      payload: new Uint8Array(),
    }),
    null,
  );
});

function encodeInstancedRebuild(
  zoneX: number,
  zoneZ: number,
  reload: boolean,
  zones: ReadonlyMap<number, number>,
): Uint8Array {
  const distinct = new Set<number>();
  for (const packed of zones.values()) {
    const sourceX = (packed >>> 14) & 0x3ff;
    const sourceZ = (packed >>> 3) & 0x7ff;
    distinct.add(((sourceX >>> 3) << 8) | (sourceZ >>> 3));
  }

  const writer = new BitWriter();
  for (let index = 0; index < 676; index += 1) {
    const packed = zones.get(index);
    if (packed === undefined) {
      writer.writeBits(1, 0);
      continue;
    }
    writer.writeBits(1, 1);
    writer.writeBits(26, packed);
  }

  return concat(
    p2Alt2(zoneZ),
    p2Alt1(zoneX),
    Uint8Array.of((reload ? 1 : 0) + 128),
    Uint8Array.of((distinct.size >>> 8) & 0xff, distinct.size & 0xff),
    writer.finish(),
  );
}

function packReferenceZone(
  zoneX: number,
  zoneZ: number,
  level: number,
  rotation: number,
): number {
  return (
    ((rotation & 0x3) << 1) |
    ((zoneZ & 0x7ff) << 3) |
    ((zoneX & 0x3ff) << 14) |
    ((level & 0x3) << 24)
  ) >>> 0;
}

function p2Alt1(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function p2Alt2(value: number): Uint8Array {
  return Uint8Array.of((value >>> 8) & 0xff, ((value & 0xff) + 128) & 0xff);
}

function p2Alt3(value: number): Uint8Array {
  return Uint8Array.of(((value & 0xff) + 128) & 0xff, (value >>> 8) & 0xff);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

class BitWriter {
  private readonly bits: number[] = [];

  writeBits(count: number, value: number): void {
    for (let shift = count - 1; shift >= 0; shift -= 1) {
      this.bits.push((value >>> shift) & 1);
    }
  }

  finish(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let index = 0; index < this.bits.length; index += 1) {
      bytes[index >>> 3] |=
        this.bits[index] << (7 - (index & 7));
    }
    return bytes;
  }
}
