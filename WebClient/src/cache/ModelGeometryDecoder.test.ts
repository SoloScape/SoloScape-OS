import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeModelGeometry,
  type ModelFormat,
} from './ModelGeometryDecoder';

for (const format of ['old', 'type1', 'type2', 'type3'] as const) {
  test('decodes a minimal ' + format + ' triangle model', () => {
    const model = decodeModelGeometry(123, buildTriangle(format));
    assert.equal(model.format, format);
    assert.deepEqual(Array.from(model.vertexX), [0, 1, 0]);
    assert.deepEqual(Array.from(model.vertexY), [0, 0, 0]);
    assert.deepEqual(Array.from(model.vertexZ), [0, 0, 1]);
    assert.deepEqual(Array.from(model.faceA), [0]);
    assert.deepEqual(Array.from(model.faceB), [1]);
    assert.deepEqual(Array.from(model.faceC), [2]);
    assert.deepEqual(Array.from(model.faceColors), [500]);
    assert.deepEqual(Array.from(model.faceTextures), [-1]);
  });
}

test('rejects faces that reference vertices outside the model', () => {
  const bytes = buildTriangle('old');
  // Third face-index delta is +2 instead of +1 => vertex 3 in a 3-vertex model.
  bytes[6] = 66;

  assert.throws(
    () => decodeModelGeometry(7, bytes),
    /references vertex outside/,
  );
});

function buildTriangle(format: ModelFormat): Uint8Array {
  const body = [
    // vertex flags: (0,0,0), then +x, then -x/+z.
    0, 1, 5,
    // face index compression type 1.
    1,
    // face index signed-smart deltas: 0, +1, +1.
    64, 65, 65,
    // face color 500.
    0x01, 0xf4,
    // vertex x deltas: +1, -1.
    65, 63,
    // vertex z delta: +1.
    65,
  ];

  if (format === 'old') {
    return Uint8Array.from([
      ...body,
      0, 3,
      0, 1,
      0, // textures
      0, // combined face info
      0, // priority
      0, // transparency
      0, // face groups
      0, // vertex groups
      0, 2,
      0, 0,
      0, 1,
      0, 3,
    ]);
  }

  if (format === 'type1') {
    return Uint8Array.from([
      ...body,
      0, // extension block marker
      0, 3,
      0, 1,
      0, // textures
      0, // face render types
      0, // priority
      0, // transparency
      0, // face groups
      0, // face textures
      0, // vertex groups
      0, 2,
      0, 0,
      0, 1,
      0, 3,
      0, 0, // texture coordinate data length
      0xff, 0xff,
    ]);
  }

  if (format === 'type2') {
    return Uint8Array.from([
      ...body,
      0, // face-Z offset flag
      0, 3,
      0, 1,
      0, // textures
      0, // combined face info
      0, // priority
      0, // transparency
      0, // face groups
      0, // vertex groups
      0, // animaya
      0, 2,
      0, 0,
      0, 1,
      0, 3,
      0, 0, // vertex group/animaya data length
      0xff, 0xfe,
    ]);
  }

  return Uint8Array.from([
    ...body,
    0, // extension block marker
    0, // face-Z offset flag
    0, 3,
    0, 1,
    0, // textures
    0, // face render types
    0, // priority
    0, // transparency
    0, // face groups
    0, // face textures
    0, // vertex groups
    0, // animaya
    0, 2,
    0, 0,
    0, 1,
    0, 3,
    0, 0, // texture coordinate data length
    0, 0, // vertex group/animaya data length
    0xff, 0xfd,
  ]);
}
