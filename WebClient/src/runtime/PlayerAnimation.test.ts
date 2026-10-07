import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DecodedAnimationFrame,
  DecodedSkeletonDefinition,
} from '../cache/PlayerAnimationAssetLoader';
import {
  applyClassicAnimationFrame,
  selectLocomotionSequence,
} from './PlayerAnimation';

const appearance = {
  readyAnim: 10,
  walkAnim: 20,
  walkAnimBack: 21,
  walkAnimLeft: 22,
  walkAnimRight: 23,
  runAnim: 30,
};

test('maps locomotion states to appearance movement sequences', () => {
  assert.equal(selectLocomotionSequence(appearance, 'idle'), 10);
  assert.equal(selectLocomotionSequence(appearance, 'walk-forward'), 20);
  assert.equal(selectLocomotionSequence(appearance, 'walk-back'), 21);
  assert.equal(selectLocomotionSequence(appearance, 'walk-left'), 22);
  assert.equal(selectLocomotionSequence(appearance, 'walk-right'), 23);
  assert.equal(selectLocomotionSequence(appearance, 'run'), 30);
});

test('falls back to forward walk when a directional sequence is missing', () => {
  assert.equal(
    selectLocomotionSequence(
      { ...appearance, walkAnimLeft: 0xffff },
      'walk-left',
    ),
    20,
  );
});

test('applies classic group translation in raw model coordinates', () => {
  const skeleton: DecodedSkeletonDefinition = {
    id: 7,
    transformTypes: Uint8Array.from([0, 1]),
    labels: [
      Uint8Array.from([0]),
      Uint8Array.from([1]),
    ],
  };
  const frame: DecodedAnimationFrame = {
    packedId: 1,
    skeleton,
    transformSkeletonLabels: Int16Array.from([0, 1]),
    transformXs: Int16Array.from([0, 10]),
    transformYs: Int16Array.from([0, 20]),
    transformZs: Int16Array.from([0, 30]),
  };

  const output = applyClassicAnimationFrame(
    Float32Array.from([
      1, -2, 3,
      4, -5, 6,
    ]),
    [[0], [1]],
    frame,
  );

  assert.deepEqual(Array.from(output), [
    1, -2, 3,
    14, -25, 36,
  ]);
});
