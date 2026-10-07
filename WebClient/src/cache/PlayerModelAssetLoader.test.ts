import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPlayerAppearanceColours } from './PlayerModelAssetLoader';

test('applies PLAYER_INFO body colour palettes to player model HSL', () => {
  const colours = [0, 3, 2, 0, 0];

  // Hair index 0 retains the base hair colour.
  assert.equal(applyPlayerAppearanceColours(6798, colours), 6798);

  // Torso uses both the primary and secondary palette with the same index.
  assert.equal(applyPlayerAppearanceColours(8741, colours), 43162);
  assert.equal(applyPlayerAppearanceColours(9104, colours), 3610);

  // Legs index 2 maps to the canonical packed HSL value 12.
  assert.equal(applyPlayerAppearanceColours(25238, colours), 12);

  assert.equal(applyPlayerAppearanceColours(4626, colours), 4626);
  assert.equal(applyPlayerAppearanceColours(4550, colours), 4550);
});

test('leaves unrelated model colours unchanged', () => {
  assert.equal(
    applyPlayerAppearanceColours(12345, [0, 3, 2, 0, 0]),
    12345,
  );
});

test('falls back to palette index zero for invalid appearance indices', () => {
  assert.equal(
    applyPlayerAppearanceColours(8741, [0, 255, 0, 0, 0]),
    8741,
  );
  assert.equal(
    applyPlayerAppearanceColours(9104, [0, 255, 0, 0, 0]),
    9104,
  );
});
