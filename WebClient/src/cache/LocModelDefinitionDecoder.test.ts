import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeLocModelDefinition } from './LocModelDefinitionDecoder';

test('decodes loc model ids, model types and geometry transforms', () => {
  const bytes: number[] = [
    1, 2,
    0x01, 0x23, 10,
    0x04, 0x56, 22,
    14, 3,
    15, 4,
    40, 1, 0, 5, 0, 7,
    41, 1, 0, 8, 0, 9,
    62,
    65, 0, 144,
    66, 0, 160,
    67, 0, 176,
    70, 0xff, 0xf0,
    71, 0, 12,
    72, 0xff, 0xe0,
    92,
      0xff, 0xff,
      0, 42,
      0, 99,
      1,
      0, 100,
      0xff, 0xff,
    0,
  ];

  const def = decodeLocModelDefinition(55, Uint8Array.from(bytes));
  assert.deepEqual(def.modelIds, [0x123, 0x456]);
  assert.deepEqual(def.modelTypes, [10, 22]);
  assert.equal(def.sizeX, 3);
  assert.equal(def.sizeZ, 4);
  assert.equal(def.rotated, true);
  assert.equal(def.modelScaleX, 144);
  assert.equal(def.modelScaleY, 160);
  assert.equal(def.modelScaleZ, 176);
  assert.equal(def.offsetX, -16);
  assert.equal(def.offsetY, 12);
  assert.equal(def.offsetZ, -32);
  assert.deepEqual(def.recolorFrom, [5]);
  assert.deepEqual(def.recolorTo, [7]);
  assert.deepEqual(def.retextureFrom, [8]);
  assert.deepEqual(def.retextureTo, [9]);
  assert.equal(def.transformVarbit, -1);
  assert.equal(def.transformVarp, 42);
  assert.deepEqual(def.transforms, [100, -1, 99]);
});

test('consumes rev-240 sound, conditional-op and param payloads', () => {
  const bytes: number[] = [
    78, 0, 1, 2, 3,
    79, 0, 1, 0, 2, 3, 4, 1, 0, 5,
    100, 1, 2, 65, 0,
    101, 1, 0, 2, 0, 3, 0, 0, 0, 4, 0, 0, 0, 5, 66, 0,
    102, 1, 0, 2, 0, 3, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 67, 0,
    249, 3,
      1, 0, 0, 1, 72, 105, 0,
      2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 9,
      0, 0, 0, 3, 0, 0, 0, 10,
    0,
  ];

  const def = decodeLocModelDefinition(1, Uint8Array.from(bytes));
  assert.deepEqual(def.modelIds, []);
});
