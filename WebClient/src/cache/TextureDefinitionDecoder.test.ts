import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeTextureDefinition } from './TextureDefinitionDecoder';

test('decodes classic texture definitions', () => {
  const definition = decodeTextureDefinition(
    12,
    Uint8Array.from([
      0x12, 0x34,
      1,
      2,
      0x00, 0x2a,
      0x00, 0x2b,
      3,
      4,
      0x03, 0x11, 0x22, 0x33,
      0x00, 0x44, 0x55, 0x66,
      2,
      5,
    ]),
  );

  assert.equal(definition.id, 12);
  assert.equal(definition.averageRgb, 0x1234);
  assert.equal(definition.opaque, true);
  assert.deepEqual(definition.fileIds, [42, 43]);
  assert.deepEqual(definition.blendModes, [3]);
  assert.deepEqual(definition.blendDirections, [4]);
  assert.deepEqual(
    definition.colourTransforms,
    [0x03112233, 0x00445566],
  );
  assert.equal(definition.animationDirection, 2);
  assert.equal(definition.animationSpeed, 5);
});
