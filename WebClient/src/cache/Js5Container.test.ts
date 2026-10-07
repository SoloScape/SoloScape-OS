import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  JS5_COMPRESSION_BZIP2,
  JS5_COMPRESSION_GZIP,
  JS5_COMPRESSION_NONE,
  decodeJs5Container,
} from './Js5Container';

test('decodes an uncompressed JS5 container', async () => {
  const payload = new Uint8Array([1, 2, 3, 4]);
  const container = new Uint8Array(5 + payload.length);
  const view = new DataView(container.buffer);

  container[0] = JS5_COMPRESSION_NONE;
  view.setUint32(1, payload.length, false);
  container.set(payload, 5);

  const decoded = await decodeJs5Container(container);

  assert.equal(decoded.compression, JS5_COMPRESSION_NONE);
  assert.equal(decoded.compressedSize, payload.length);
  assert.equal(decoded.uncompressedSize, payload.length);
  assert.deepEqual(Array.from(decoded.data), Array.from(payload));
});

test('decodes a gzip JS5 container and validates uncompressed length', async () => {
  const payload = new TextEncoder().encode(
    'SoloScape JS5 gzip container test payload',
  );
  const compressed = gzipSync(payload);
  const container = new Uint8Array(9 + compressed.length);
  const view = new DataView(container.buffer);

  container[0] = JS5_COMPRESSION_GZIP;
  view.setUint32(1, compressed.length, false);
  view.setUint32(5, payload.length, false);
  container.set(compressed, 9);

  const decoded = await decodeJs5Container(container);

  assert.equal(decoded.compression, JS5_COMPRESSION_GZIP);
  assert.equal(decoded.compressedSize, compressed.length);
  assert.equal(decoded.uncompressedSize, payload.length);
  assert.deepEqual(Array.from(decoded.data), Array.from(payload));
});

test('rejects mismatched container length', async () => {
  const container = new Uint8Array(6);
  const view = new DataView(container.buffer);

  container[0] = JS5_COMPRESSION_NONE;
  view.setUint32(1, 2, false);

  await assert.rejects(
    decodeJs5Container(container),
    /length mismatch/,
  );
});

test('rejects a mismatched gzip output length', async () => {
  const payload = new Uint8Array([10, 20, 30]);
  const compressed = gzipSync(payload);
  const container = new Uint8Array(9 + compressed.length);
  const view = new DataView(container.buffer);

  container[0] = JS5_COMPRESSION_GZIP;
  view.setUint32(1, compressed.length, false);
  view.setUint32(5, payload.length + 1, false);
  container.set(compressed, 9);

  await assert.rejects(
    decodeJs5Container(container),
    /gzip length mismatch/,
  );
});

test('rejects bzip2 explicitly until support is implemented', async () => {
  const container = new Uint8Array(10);
  const view = new DataView(container.buffer);

  container[0] = JS5_COMPRESSION_BZIP2;
  view.setUint32(1, 1, false);
  view.setUint32(5, 1, false);
  container[9] = 0;

  await assert.rejects(
    decodeJs5Container(container),
    /bzip2 containers are not supported/,
  );
});
