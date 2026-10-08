import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheMinimapTileRgb } from './CacheTerrainMinimap';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';

const underlayIds = new Int32Array(4 * 64 * 64).fill(-1);
const overlayIds = new Int32Array(4 * 64 * 64).fill(-1);
underlayIds[0] = 1;
const maps = new Map<number, LoadedMapSquare>([[0, {
  mapSquare: { id: 0 },
  terrain: { underlayIds, overlayIds },
} as unknown as LoadedMapSquare]]);
const floors: SceneFloorMaterials = {
  underlays: new Map([[0, { id: 0, rgb: 0x294b6d }]]),
  overlays: new Map([[9, {
    id: 9, rgb: 0xabcd12, texture: -1,
    hideUnderlay: true, secondaryRgb: -1,
  }]]),
  textureAverageRgb: new Map(),
  residentTextureIds: new Set(),
};

test('minimap uses only the original cache floor underlay RGB', () => {
  assert.equal(cacheMinimapTileRgb(maps, floors, 0, 0, 0), 0x294b6d);
  assert.equal(cacheMinimapTileRgb(maps, floors, 1, 0, 0), null);
  assert.equal(cacheMinimapTileRgb(maps, floors, 0, 0, 4), null);
});
test('original floor overlay RGB overrides underlay only when known', () => {
  overlayIds[0] = 9;
  assert.equal(cacheMinimapTileRgb(maps, floors, 0, 0, 0), 0xabcd12);
  overlayIds[0] = 8;
  assert.equal(cacheMinimapTileRgb(maps, floors, 0, 0, 0), 0x294b6d);
  overlayIds[0] = -1;
});
test('missing cache regions or missing material colours stay transparent', () => {
  assert.equal(cacheMinimapTileRgb(maps, floors, 64, 0, 0), null);
  assert.equal(cacheMinimapTileRgb(maps, {
    ...floors, underlays: new Map(),
  }, 0, 0, 0), null);
});
