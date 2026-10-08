import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafeHudOverlaySprite } from './CacheMobileHudArt';

test('opaque cache gameframe backdrop may never cover the 3D viewport', () => {
  assert.equal(isSafeHudOverlaySprite(0, 0, 1753, 830, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(54, 0, 1699, 828, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(0, 0, 1753, 48, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(0, 0, 390, 844, 390, 844), false);
});

test('genuine small HUD sprites at either edge can appear', () => {
  assert.equal(isSafeHudOverlaySprite(6, 200, 36, 36, 1753, 830), true);
  assert.equal(isSafeHudOverlaySprite(1690, 200, 36, 36, 1753, 830), true);
  assert.equal(isSafeHudOverlaySprite(300, 6, 42, 42, 390, 844), true);
});

test('cache artwork may not obscure centre or paint offscreen', () => {
  assert.equal(isSafeHudOverlaySprite(850, 400, 50, 50, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(-600, 10, 40, 40, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(100, 100, 0, 100, 1753, 830), false);
  assert.equal(isSafeHudOverlaySprite(NaN, 100, 40, 40, 1753, 830), false);
});
