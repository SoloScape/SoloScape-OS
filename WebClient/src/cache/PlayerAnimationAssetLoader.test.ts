import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeAnimationFrame,
  decodeSequenceDefinition,
  decodeSkeletonDefinition,
} from './PlayerAnimationAssetLoader';

test('decodes classic sequence frame ids, lengths and loop step', () => {
  const sequence = decodeSequenceDefinition(
    100,
    Uint8Array.from([
      1,
      0, 2,
      0, 2, 0, 3,
      0, 5, 0, 6,
      0, 7, 0, 8,
      2, 0, 2,
      0,
    ]),
  );

  assert.deepEqual(sequence.frameLengths, [2, 3]);
  assert.deepEqual(sequence.frameIds, [
    7 * 0x10000 + 5,
    8 * 0x10000 + 6,
  ]);
  assert.equal(sequence.frameStep, 2);
  assert.equal(sequence.animMayaId, -1);
});

test('decodes skeleton labels and frame short-smart transforms', () => {
  const skeleton = decodeSkeletonDefinition(
    42,
    Uint8Array.from([
      2,
      0, 1,
      1, 2,
      0,
      1, 2,
    ]),
  );

  assert.deepEqual(Array.from(skeleton.transformTypes), [0, 1]);
  assert.deepEqual(
    skeleton.labels.map((labels) => Array.from(labels)),
    [[0], [1, 2]],
  );

  const frame = decodeAnimationFrame(
    9 * 0x10000 + 3,
    Uint8Array.from([
      0, 42,
      2,
      0, 7,
      65, 63, 64,
    ]),
    skeleton,
  );

  assert.deepEqual(
    Array.from(frame.transformSkeletonLabels),
    [0, 1],
  );
  assert.deepEqual(Array.from(frame.transformXs), [0, 1]);
  assert.deepEqual(Array.from(frame.transformYs), [0, -1]);
  assert.deepEqual(Array.from(frame.transformZs), [0, 0]);
});
