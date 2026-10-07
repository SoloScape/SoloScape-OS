import assert from 'node:assert/strict';
import test from 'node:test';
import { js5NameHash } from './Js5NameHash';
import {
  decodeMapTerrain,
  mapTerrainTileIndex,
} from './MapTerrainDecoder';
import { decodeMapLocations } from './MapLocationDecoder';

test('hashes live-cache map group names with the JS5 name hash', () => {
  assert.equal(js5NameHash('m50_50'), -1123920270);
  assert.equal(js5NameHash('l50_50'), -1152549421);
  assert.equal(js5NameHash('m0_0'), 3296340);
  assert.equal(js5NameHash('l255_255'), -2055329543);
});

test('decodes rev-240 16-bit terrain opcodes', () => {
  const chunks: number[] = [];

  // tile 0,0,0: overlay id=7, shape=2, rotation=1; flags=3;
  // underlay=4; explicit height=12.
  pushU16(chunks, 11);
  pushI16(chunks, 8);
  pushU16(chunks, 52);
  pushU16(chunks, 85);
  pushU16(chunks, 1);
  chunks.push(12);

  // Remaining 16,383 tiles: implicit-height terminator.
  for (let index = 1; index < 4 * 64 * 64; index += 1) {
    pushU16(chunks, 0);
  }

  const terrain = decodeMapTerrain(Uint8Array.from(chunks));
  const index = mapTerrainTileIndex(0, 0, 0);
  assert.equal(terrain.overlayIds[index], 7);
  assert.equal(terrain.overlayShapes[index], 2);
  assert.equal(terrain.overlayRotations[index], 1);
  assert.equal(terrain.renderFlags[index], 3);
  assert.equal(terrain.underlayIds[index], 4);
  assert.equal(terrain.explicitHeights[index], 12);
  assert.equal(
    terrain.explicitHeights[mapTerrainTileIndex(3, 63, 63)],
    -1,
  );
});

test('decodes incrementing-smart location ids and coordinate deltas', () => {
  const bytes: number[] = [];

  // object id starts at -1; +101 => 100.
  pushShortSmart(bytes, 101);
  // packed coord 0x1042 => level=1, x=1, z=2. Stored delta is +1.
  pushShortSmart(bytes, 0x1042 + 1);
  bytes.push((10 << 2) | 3);
  // another placement for id 100, coordinate +5.
  pushShortSmart(bytes, 5);
  bytes.push((22 << 2) | 1);
  pushShortSmart(bytes, 0);

  // +2 => object id 102.
  pushShortSmart(bytes, 2);
  pushShortSmart(bytes, 1);
  bytes.push((0 << 2) | 2);
  pushShortSmart(bytes, 0);
  pushShortSmart(bytes, 0);

  const locations = decodeMapLocations(Uint8Array.from(bytes));
  assert.equal(locations.length, 3);
  assert.deepEqual(locations[0], {
    id: 100,
    localX: 1,
    localZ: 2,
    level: 1,
    shape: 10,
    angle: 3,
  });
  assert.equal(locations[1].id, 100);
  assert.equal(locations[1].shape, 22);
  assert.equal(locations[2].id, 102);
  assert.equal(locations[2].localX, 0);
  assert.equal(locations[2].localZ, 0);
  assert.equal(locations[2].angle, 2);
});

function pushU16(output: number[], value: number): void {
  output.push((value >>> 8) & 0xff, value & 0xff);
}

function pushI16(output: number[], value: number): void {
  pushU16(output, value & 0xffff);
}

function pushShortSmart(output: number[], value: number): void {
  if (value < 0x80) {
    output.push(value);
    return;
  }
  if (value > 0x7fff) {
    throw new RangeError('Test smart is too large.');
  }
  pushU16(output, value | 0x8000);
}
