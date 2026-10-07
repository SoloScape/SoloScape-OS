import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrbitCameraRenderState } from '../runtime/OrbitCamera';
import { pickWalkDestination } from './ViewportWalkPicker';

const camera: OrbitCameraRenderState = {
  orbitX: 64,
  orbitZ: -64,
  yaw: 0,
  pitch: 256,
  zoom: 1100,
  eyeX: 64,
  eyeY: 256,
  eyeZ: 256,
  targetX: 64,
  targetY: 0,
  targetZ: -64,
};

const bounds = {
  minX: 0,
  minY: 0,
  minZ: -1024,
  maxX: 1024,
  maxY: 0,
  maxZ: 0,
};

test('centre viewport ray resolves the terrain tile under the camera target', () => {
  const pick = pickWalkDestination({
    canvasX: 382.5,
    canvasY: 251.5,
    canvasWidth: 765,
    canvasHeight: 503,
    camera,
    bounds,
    originTileX: 3200,
    originTileZ: 3200,
    level: 0,
    groundYFine: () => 0,
  });

  assert.ok(pick);
  assert.equal(pick.tileX, 3200);
  assert.equal(pick.tileZ, 3200);
  assert.ok(Math.abs(pick.sceneX - 64) < 1);
  assert.ok(Math.abs(pick.sceneZ + 64) < 1);
});

test('terrain picker follows non-flat ground height', () => {
  const pick = pickWalkDestination({
    canvasX: 382.5,
    canvasY: 251.5,
    canvasWidth: 765,
    canvasHeight: 503,
    camera,
    bounds,
    originTileX: 3200,
    originTileZ: 3200,
    level: 0,
    groundYFine: (_level, _x, z) =>
      (z - 3200 * 128) * 0.1,
  });

  assert.ok(pick);
  assert.ok(pick.sceneY > 0);
});

test('rejects taps outside the drawing buffer', () => {
  const pick = pickWalkDestination({
    canvasX: -1,
    canvasY: 100,
    canvasWidth: 765,
    canvasHeight: 503,
    camera,
    bounds,
    originTileX: 3200,
    originTileZ: 3200,
    level: 0,
    groundYFine: () => 0,
  });

  assert.equal(pick, null);
});
