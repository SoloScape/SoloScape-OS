import assert from 'node:assert/strict';
import test from 'node:test';
import type { LocModelDefinition } from '../cache/LocModelDefinitionDecoder';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import type { MapTerrain } from '../cache/MapTerrainDecoder';
import type { DecodedModelGeometry } from '../cache/ModelGeometryDecoder';
import type { LoadedSceneAssets } from '../cache/SceneAssetLoader';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';
import type {
  InstancedRegionRebuild,
  NormalRegionRebuild,
} from '../protocol/RegionRebuildDecoder';
import {
  assembleScene,
  deriveImplicitTerrainHeight,
  deriveTerrainHeight,
} from './SceneAssembler';

test('derives canonical implicit and explicit terrain heights', () => {
  assert.equal(deriveImplicitTerrainHeight(0, 0), -312);
  assert.equal(deriveImplicitTerrainHeight(3200, 3200), -232);
  assert.equal(deriveImplicitTerrainHeight(3222, 3218), -248);

  assert.equal(deriveTerrainHeight(1, null, 0, 0), 0);
  assert.equal(deriveTerrainHeight(4, null, 0, 0), -32);
  assert.equal(deriveTerrainHeight(-1, -32, 0, 0), -272);
  assert.equal(deriveTerrainHeight(3, -32, 0, 0), -56);
});

test('assembles normal terrain and transformed loc model geometry', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 1,
    },
  ]);
  const rebuild: NormalRegionRebuild = {
    kind: 'normal',
    zoneX: 6,
    zoneZ: 6,
    worldArea: 0,
    mapSquares: [map.mapSquare],
  };
  const scene = assembleScene(rebuild, [map], buildAssets());

  assert.equal(scene.originTileX, 0);
  assert.equal(scene.originTileZ, 0);
  assert.equal(scene.stats.terrainTiles, 64 * 64);
  assert.equal(scene.stats.terrainTriangles, 64 * 64 * 2);
  assert.equal(scene.stats.locationPlacements, 1);
  assert.equal(scene.stats.modelInstances, 1);
  assert.equal(scene.stats.modelTriangles, 1);
  assert.equal(scene.locations.vertexCount, 3);

  const positions = Array.from(scene.locations.positions);
  assert.deepEqual(
    positions.slice(0, 3),
    [202, -20, 290],
  );
  assert.deepEqual(
    positions.slice(3, 6),
    [202, -20, 162],
  );
  assert.deepEqual(
    positions.slice(6, 9),
    [202, 12, 290],
  );
});

test('rotates copied instance zones and loc origins into destination space', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 0,
    },
  ]);
  const placement = {
    destinationLevel: 0,
    destinationZoneX: 1,
    destinationZoneZ: 1,
    sourceLevel: 0,
    sourceZoneX: 0,
    sourceZoneZ: 0,
    rotation: 1,
    packedReferenceZone: 0,
    mapSquare: map.mapSquare,
  };
  const rebuild: InstancedRegionRebuild = {
    kind: 'instanced',
    zoneX: 6,
    zoneZ: 6,
    reload: false,
    mapSquareCount: 1,
    mapSquares: [map.mapSquare],
    zones: [placement],
  };

  const scene = assembleScene(rebuild, [map], buildAssets());

  assert.equal(scene.stats.terrainTiles, 8 * 8);
  assert.equal(scene.stats.locationPlacements, 1);
  assert.equal(scene.stats.modelInstances, 1);

  // Source loc (1,2), size 1x1, rotated clockwise into destination zone (1,1):
  // local destination origin is (2, 6), then the model is centered in that tile.
  const positions = Array.from(scene.locations.positions);
  assert.deepEqual(
    positions.slice(0, 3),
    [1354, -20, 1826],
  );
});



test('culls terrain/loc geometry above the requested visible plane', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 0,
    },
    {
      id: 1,
      localX: 2,
      localZ: 2,
      level: 1,
      shape: 10,
      angle: 0,
    },
  ]);
  const rebuild: NormalRegionRebuild = {
    kind: 'normal',
    zoneX: 6,
    zoneZ: 6,
    worldArea: 0,
    mapSquares: [map.mapSquare],
  };

  const scene = assembleScene(
    rebuild,
    [map],
    buildAssets(),
    null,
    0,
  );

  assert.equal(scene.stats.locationPlacements, 1);
  assert.equal(scene.stats.modelInstances, 1);
  assert.equal(scene.locations.vertexCount, 3);
});

test('uses texture average HSL when a model texture is not resident', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 0,
    },
  ]);
  const baseAssets = buildAssets();
  const baseModel = baseAssets.models.get(100)!;
  const model: DecodedModelGeometry = {
    ...baseModel,
    faceColors: Uint16Array.from([127]),
    faceTextures: Int32Array.from([7]),
    faceTextureCoords: Int32Array.from([-1]),
  };
  const assets: LoadedSceneAssets = {
    ...baseAssets,
    models: new Map([[100, model]]),
  };
  const materials: SceneFloorMaterials = {
    underlays: new Map(),
    overlays: new Map(),
    textureAverageRgb: new Map([[7, 0x3456]]),
    residentTextureIds: new Set(),
  };
  const rebuild: NormalRegionRebuild = {
    kind: 'normal',
    zoneX: 6,
    zoneZ: 6,
    worldArea: 0,
    mapSquares: [map.mapSquare],
  };

  const scene = assembleScene(rebuild, [map], assets, materials, 0);

  assert.deepEqual(Array.from(scene.locations.textureIds), [-1, -1, -1]);
  assert.equal(
    Array.from(scene.locations.colors).every((channel) => channel > 220),
    false,
  );
});

test('falls back to face colour for unsupported textured loc faces', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 0,
    },
  ]);
  const baseAssets = buildAssets();
  const baseModel = baseAssets.models.get(100)!;
  const model: DecodedModelGeometry = {
    ...baseModel,
    faceTextures: Int32Array.from([7]),
    faceTextureCoords: Int32Array.from([0]),
    textureFaceA: Uint16Array.from([0]),
    textureFaceB: Uint16Array.from([1]),
    textureFaceC: Uint16Array.from([2]),
    // Render type 1 needs transform metadata we do not retain yet.
    textureRenderTypes: Int8Array.from([1]),
  };
  const assets: LoadedSceneAssets = {
    ...baseAssets,
    models: new Map([[100, model]]),
  };
  const rebuild: NormalRegionRebuild = {
    kind: 'normal',
    zoneX: 6,
    zoneZ: 6,
    worldArea: 0,
    mapSquares: [map.mapSquare],
  };

  const scene = assembleScene(rebuild, [map], assets, null, 0);

  assert.deepEqual(Array.from(scene.locations.textureIds), [-1, -1, -1]);
  // Regression guard: unsupported textured faces must use their packed-HSL
  // fallback instead of the near-white neutral texture-light colour.
  assert.equal(
    Array.from(scene.locations.colors).every((channel) => channel > 220),
    false,
  );
});

test('emits cache texture ids and type-0 UVs for textured loc faces', () => {
  const map = buildMap([
    {
      id: 1,
      localX: 1,
      localZ: 2,
      level: 0,
      shape: 10,
      angle: 0,
    },
  ]);
  const baseAssets = buildAssets();
  const baseModel = baseAssets.models.get(100)!;
  const model: DecodedModelGeometry = {
    ...baseModel,
    faceTextures: Int32Array.from([7]),
    faceTextureCoords: Int32Array.from([0]),
    textureFaceA: Uint16Array.from([0]),
    textureFaceB: Uint16Array.from([1]),
    textureFaceC: Uint16Array.from([2]),
    textureRenderTypes: Int8Array.from([0]),
  };
  const assets: LoadedSceneAssets = {
    ...baseAssets,
    models: new Map([[100, model]]),
  };

  const rebuild: NormalRegionRebuild = {
    kind: 'normal',
    zoneX: 6,
    zoneZ: 6,
    worldArea: 0,
    mapSquares: [map.mapSquare],
  };
  const materials: SceneFloorMaterials = {
    underlays: new Map(),
    overlays: new Map(),
    textureAverageRgb: new Map([[7, 0x3456]]),
    residentTextureIds: new Set([7]),
  };
  const scene = assembleScene(
    rebuild,
    [map],
    assets,
    materials,
  );

  assert.deepEqual(Array.from(scene.locations.textureIds), [7, 7, 7]);
  assert.deepEqual(
    Array.from(scene.locations.textureCoords),
    [0, 0, 1, 0, 0, 1],
  );
});

function buildMap(
  locations: LoadedMapSquare['locations'],
): LoadedMapSquare {
  const terrain = buildTerrain();
  return {
    mapSquare: { id: 0, x: 0, z: 0 },
    terrainName: 'm0_0',
    terrainGroup: 1,
    locationName: 'l0_0',
    locationGroup: 2,
    terrain,
    locations,
  };
}

function buildTerrain(): MapTerrain {
  const count = 4 * 64 * 64;
  const explicitHeights = new Int16Array(count);
  explicitHeights.fill(-1);
  for (let x = 0; x < 64; x += 1) {
    for (let z = 0; z < 64; z += 1) {
      explicitHeights[(x << 6) | z] = 1;
    }
  }

  const overlayIds = new Int32Array(count);
  overlayIds.fill(-1);
  const underlayIds = new Int32Array(count);
  underlayIds.fill(-1);
  // The classic scene builder only emits floor geometry for a real underlay
  // or overlay. Give level 0 a simple underlay so the baseline fixture still
  // represents a fully covered 64x64 mapsquare.
  for (let x = 0; x < 64; x += 1) {
    for (let z = 0; z < 64; z += 1) {
      underlayIds[(x << 6) | z] = 1;
    }
  }

  return {
    explicitHeights,
    renderFlags: new Uint8Array(count),
    overlayIds,
    overlayShapes: new Uint8Array(count),
    overlayRotations: new Uint8Array(count),
    underlayIds,
  };
}

function buildAssets(): LoadedSceneAssets {
  const definition: LocModelDefinition = {
    id: 1,
    modelIds: [100],
    modelTypes: null,
    sizeX: 1,
    sizeZ: 1,
    rotated: false,
    contouredGround: -1,
    mergeNormals: false,
    ambient: 0,
    contrast: 0,
    modelScaleX: 128,
    modelScaleY: 64,
    modelScaleZ: 256,
    offsetX: 10,
    offsetY: 20,
    offsetZ: -30,
    recolorFrom: [],
    recolorTo: [],
    retextureFrom: [],
    retextureTo: [],
    transformVarbit: -1,
    transformVarp: -1,
    transforms: [],
  };

  const model: DecodedModelGeometry = {
    id: 100,
    format: 'old',
    vertexX: Int32Array.from([0, 64, 0]),
    vertexY: Int32Array.from([0, 0, -64]),
    vertexZ: Int32Array.from([0, 0, 0]),
    faceA: Uint32Array.from([0]),
    faceB: Uint32Array.from([1]),
    faceC: Uint32Array.from([2]),
    faceColors: Uint16Array.from([500]),
    faceTextures: Int32Array.from([-1]),
    faceTextureCoords: Int32Array.from([-1]),
    faceRenderTypes: Int8Array.from([0]),
    faceTransparencies: Int8Array.from([0]),
    textureFaceA: new Uint16Array(0),
    textureFaceB: new Uint16Array(0),
    textureFaceC: new Uint16Array(0),
    textureRenderTypes: new Int8Array(0),
  };

  return {
    locDefinitions: new Map([[1, definition]]),
    models: new Map([[100, model]]),
  };
}
