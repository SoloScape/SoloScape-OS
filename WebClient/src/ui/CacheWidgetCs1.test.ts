import assert from 'node:assert/strict';
import test from 'node:test';
import { Rev240UiState } from '../protocol/Rev240UiState';
import { evaluateWidgetCs1, interpolateCacheText } from './CacheWidgetCs1';

test('cache CS1 text uses real UPDATE_STAT_V2 experience/levels', () => {
  const state = new Rev240UiState();
  const widget = { text: '%1/%2 (%3 XP)', cs1Programs: [
    [1, 0, 0], [2, 0, 0], [3, 0, 0],
  ] };
  assert.equal(interpolateCacheText(widget, state), '—/— (— XP)');
  state.apply({ name: 'UPDATE_STAT_V2', payload: new Uint8Array([
    128, 83, 0, 0, 0, 2, 126,
  ]) });
  assert.equal(interpolateCacheText(widget, state), '2/2 (83 XP)');
});

test('cache CS1 handles real varps, varbits and elementary operators', () => {
  const state = new Rev240UiState();
  state.varps.set(12, 0b10110100);
  state.setVarbitDefinitions(new Map([[55, {
    id: 55, baseVar: 12, startBit: 2, endBit: 4,
  }]]));
  assert.equal(evaluateWidgetCs1([14, 55, 0], state), 5);
  assert.equal(evaluateWidgetCs1([20, 20, 16, 20, 4, 15, 20, 2, 0], state), 3);
  assert.equal(evaluateWidgetCs1([13, 12, 5, 0], state), 1);
});

test('unknown CS1 instructions never synthesize skill values', () => {
  const state = new Rev240UiState();
  assert.equal(evaluateWidgetCs1([200, 1, 0], state), null);
  assert.equal(evaluateWidgetCs1([1, 50, 0], state), null);
});
