import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeFloorOverlayDefinition,
  decodeFloorUnderlayDefinition,
} from './FloorDefinitionDecoder';

test('decodes floor underlay rgb', () => {
  const definition = decodeFloorUnderlayDefinition(
    3,
    Uint8Array.from([1, 0x12, 0x34, 0x56, 0]),
  );
  assert.deepEqual(definition, {
    id: 3,
    rgb: 0x123456,
  });
});

test('decodes floor overlay colour, texture and secondary colour', () => {
  const definition = decodeFloorOverlayDefinition(
    9,
    Uint8Array.from([
      1, 0x11, 0x22, 0x33,
      2, 7,
      5,
      7, 0xaa, 0xbb, 0xcc,
      8,
      0,
    ]),
  );

  assert.deepEqual(definition, {
    id: 9,
    rgb: 0x112233,
    texture: 7,
    hideUnderlay: false,
    secondaryRgb: 0xaabbcc,
  });
});
