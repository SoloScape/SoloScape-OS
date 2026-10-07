import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeModelGeometry } from './ModelGeometryDecoder';

test('decodes a minimal old-format triangle model', () => {
  const bytes = Uint8Array.from([
    // vertex flags
    0, 1, 5,
    // face index compression
    1,
    // face index smart deltas: 0, +1, +1
    64, 65, 65,
    // face color 500
    0x01, 0xf4,
    // vertex x deltas: +1, -1
    65, 63,
    // vertex z delta: +1
    65,

    // 18-byte footer
    0, 3,       // vertex count
    0, 1,       // face count
    0,          // texture count
    0,          // combined face info
    0,          // priority
    0,          // transparency
    0,          // face groups
    0,          // vertex groups
    0, 2,       // x data length
    0, 0,       // y data length
    0, 1,       // z data length
    0, 3,       // face index data length
  ]);

  const model = decodeModelGeometry(123, bytes);
  assert.equal(model.format, 'old');
  assert.deepEqual(Array.from(model.vertexX), [0, 1, 0]);
  assert.deepEqual(Array.from(model.vertexY), [0, 0, 0]);
  assert.deepEqual(Array.from(model.vertexZ), [0, 0, 1]);
  assert.deepEqual(Array.from(model.faceA), [0]);
  assert.deepEqual(Array.from(model.faceB), [1]);
  assert.deepEqual(Array.from(model.faceC), [2]);
  assert.deepEqual(Array.from(model.faceColors), [500]);
  assert.deepEqual(Array.from(model.faceTextures), [-1]);
});

test('rejects faces that reference vertices outside the model', () => {
  const bytes = Uint8Array.from([
    0, 0, 0,
    1,
    64, 65, 66,
    0, 1,
    // no vertex delta data
    0, 3, 0, 1, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 3,
  ]);

  assert.throws(
    () => decodeModelGeometry(7, bytes),
    /references vertex outside/,
  );
});
