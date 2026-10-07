import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeTextureDefinition } from './TextureDefinitionDecoder';

test('decodes rev-240 compact texture definitions', () => {
  const definition = decodeTextureDefinition(
    12,
    Uint8Array.from([
      0x00, 0x2a, // sprite id 42
      0x12, 0x34, // average packed HSL
      1,          // opaque
      2,          // animation direction
      5,          // animation speed
    ]),
  );

  assert.equal(definition.id, 12);
  assert.equal(definition.averageRgb, 0x1234);
  assert.equal(definition.opaque, true);
  assert.deepEqual(definition.fileIds, [42]);
  assert.deepEqual(definition.blendModes, []);
  assert.deepEqual(definition.blendDirections, []);
  assert.deepEqual(definition.colourTransforms, [0]);
  assert.equal(definition.animationDirection, 2);
  assert.equal(definition.animationSpeed, 5);
});

test('rejects legacy-length records in the rev-240 decoder', () => {
  assert.throws(
    () => decodeTextureDefinition(
      1,
      Uint8Array.from([
        0, 1,
        0, 2,
        1,
        0,
        0,
        99,
      ]),
    ),
    /rev-240 texture definitions must be 7 bytes/,
  );
});
