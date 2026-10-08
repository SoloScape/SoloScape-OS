import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneMinimapXY, originalSceneTriangleRgb,
  MINIMAP_PIXELS_PER_TILE,
} from './SceneTerrainMinimap';
import { SCENE_TILE_SIZE, SCENE_DIAMETER_TILES } from '../scene/SceneAssembler';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';

const materials: SceneFloorMaterials = {
  underlays: new Map(), overlays: new Map(),
  textureAverageRgb: new Map([[17, 0x987654]]),
  residentTextureIds: new Set([17]),
};

test('minimap projection follows the same negative-Z terrain coordinates as the 3D world', () => {
  assert.deepEqual(sceneMinimapXY(0, 0), {
    x: 0, y: SCENE_DIAMETER_TILES * MINIMAP_PIXELS_PER_TILE,
  });
  assert.deepEqual(sceneMinimapXY(SCENE_TILE_SIZE, -SCENE_TILE_SIZE), {
    x: MINIMAP_PIXELS_PER_TILE,
    y: (SCENE_DIAMETER_TILES - 1) * MINIMAP_PIXELS_PER_TILE,
  });
});

test('minimap derives triangle colours directly from the actual lit scene vertex buffer', () => {
  const vertices = new Uint8Array([
    21, 60, 99,
    24, 66, 90,
    27, 72, 81,
  ]);
  assert.equal(originalSceneTriangleRgb(vertices, 0, -1, materials), 0x18425a);
});

test('textured triangles use the original cache texture colour, not invented floor RGB', () => {
  const vertices = new Uint8Array(9);
  assert.equal(originalSceneTriangleRgb(vertices, 0, 17, materials), 0x987654);
  assert.equal(originalSceneTriangleRgb(vertices, 0, 18, materials), null);
  assert.equal(originalSceneTriangleRgb(vertices, 3, -1, materials), null);
});
