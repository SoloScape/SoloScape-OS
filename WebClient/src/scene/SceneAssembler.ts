import type { LocModelDefinition } from '../cache/LocModelDefinitionDecoder';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import { mapTerrainTileIndex } from '../cache/MapTerrainDecoder';
import type { DecodedModelGeometry } from '../cache/ModelGeometryDecoder';
import type {
  InstanceZonePlacement,
  RegionRebuild,
} from '../protocol/RegionRebuildDecoder';
import type { LoadedSceneAssets } from '../cache/SceneAssetLoader';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';
import { resolveType0FaceTextureUvs } from './ModelTextureMapping';

export const SCENE_TILE_SIZE = 128;
export const SCENE_ZONE_SIZE = 8;
export const SCENE_ZONE_RADIUS = 6;
export const SCENE_DIAMETER_TILES =
  (SCENE_ZONE_RADIUS * 2 + 1) * SCENE_ZONE_SIZE;

const MAP_SIZE = 64;
const LEVEL_COUNT = 4;
const IMPLICIT_LEVEL_DROP = 240;

/**
 * Classic Jagex ground-shape tables. Each P row lists the tile-local nodes used
 * by a shape; each F row is packed as (overlayFlag, a, b, c) triangles.
 * Map overlayShapes stores 0..11, while World.setGround receives shape+1.
 */
const GROUND_SHAPE_POINTS: readonly (readonly number[])[] = [
  [1, 3, 5, 7],
  [1, 3, 5, 7],
  [1, 3, 5, 7],
  [1, 3, 5, 7, 6],
  [1, 3, 5, 7, 6],
  [1, 3, 5, 7, 6],
  [1, 3, 5, 7, 6],
  [1, 3, 5, 7, 2, 6],
  [1, 3, 5, 7, 2, 8],
  [1, 3, 5, 7, 2, 8],
  [1, 3, 5, 7, 11, 12],
  [1, 3, 5, 7, 11, 12],
  [1, 3, 5, 7, 13, 14],
];

const GROUND_SHAPE_FACES: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 0, 0, 1, 3],
  [1, 1, 2, 3, 1, 0, 1, 3],
  [0, 1, 2, 3, 1, 0, 1, 3],
  [0, 0, 1, 2, 0, 0, 2, 4, 1, 0, 4, 3],
  [0, 0, 1, 4, 0, 0, 4, 3, 1, 1, 2, 4],
  [0, 0, 4, 3, 1, 0, 1, 2, 1, 0, 2, 4],
  [0, 1, 2, 4, 1, 0, 1, 4, 1, 0, 4, 3],
  [0, 4, 1, 2, 0, 4, 2, 5, 1, 0, 4, 5, 1, 0, 5, 3],
  [0, 4, 1, 2, 0, 4, 2, 3, 0, 4, 3, 5, 1, 0, 4, 5],
  [0, 0, 4, 5, 1, 4, 1, 2, 1, 4, 2, 3, 1, 4, 3, 5],
  [
    0, 0, 1, 5, 0, 1, 4, 5, 0, 1, 2, 4,
    1, 0, 5, 3, 1, 5, 4, 3, 1, 4, 2, 3,
  ],
  [
    1, 0, 1, 5, 1, 1, 4, 5, 1, 1, 2, 4,
    0, 0, 5, 3, 0, 5, 4, 3, 0, 4, 2, 3,
  ],
  [
    1, 0, 5, 4, 1, 0, 1, 5, 0, 0, 4, 3,
    0, 4, 5, 3, 0, 5, 2, 3, 0, 1, 2, 5,
  ],
];

export interface SceneMesh {
  readonly positions: Float32Array;
  readonly colors: Uint8Array;
  readonly textureCoords: Float32Array;
  readonly textureIds: Int32Array;
  readonly vertexCount: number;
}

export interface SceneBounds {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

export interface SceneAssemblyStats {
  readonly terrainTiles: number;
  readonly terrainTriangles: number;
  readonly locationPlacements: number;
  readonly modelInstances: number;
  readonly modelTriangles: number;
  readonly skippedLocations: number;
}

export interface AssembledScene {
  readonly originTileX: number;
  readonly originTileZ: number;
  readonly terrain: SceneMesh;
  readonly locations: SceneMesh;
  readonly bounds: SceneBounds;
  readonly stats: SceneAssemblyStats;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface ModelPlacement {
  readonly modelType: number;
  readonly orientation: number;
  readonly diagonal: boolean;
}

interface PlacedLocation {
  readonly id: number;
  readonly sourceLevel: number;
  readonly sourceTileX: number;
  readonly sourceTileZ: number;
  readonly destinationLevel: number;
  readonly destinationTileX: number;
  readonly destinationTileZ: number;
  readonly shape: number;
  readonly angle: number;
  readonly chunkRotation: number;
}

export function assembleScene(
  rebuild: RegionRebuild,
  maps: readonly LoadedMapSquare[],
  assets: LoadedSceneAssets,
  materials: SceneFloorMaterials | null = null,
): AssembledScene {
  const originTileX = (rebuild.zoneX - SCENE_ZONE_RADIUS) * SCENE_ZONE_SIZE;
  const originTileZ = (rebuild.zoneZ - SCENE_ZONE_RADIUS) * SCENE_ZONE_SIZE;
  const mapLookup = createMapLookup(maps);
  const heightField = new TerrainHeightField(mapLookup);
  const terrainBuilder = new MeshBuilder();
  const locationBuilder = new MeshBuilder();

  let terrainTiles = 0;
  let locationPlacements = 0;
  let modelInstances = 0;
  let modelTriangles = 0;
  let skippedLocations = 0;

  if (rebuild.kind === 'normal') {
    const maxTileX = originTileX + SCENE_DIAMETER_TILES;
    const maxTileZ = originTileZ + SCENE_DIAMETER_TILES;

    for (const map of maps) {
      const mapBaseX = map.mapSquare.x * MAP_SIZE;
      const mapBaseZ = map.mapSquare.z * MAP_SIZE;
      for (let level = 0; level < LEVEL_COUNT; level += 1) {
        for (let localX = 0; localX < MAP_SIZE; localX += 1) {
          const worldX = mapBaseX + localX;
          if (worldX < originTileX || worldX >= maxTileX) {
            continue;
          }
          for (let localZ = 0; localZ < MAP_SIZE; localZ += 1) {
            const worldZ = mapBaseZ + localZ;
            if (worldZ < originTileZ || worldZ >= maxTileZ) {
              continue;
            }
            if (!shouldRenderTerrainTile(map, level, localX, localZ)) {
              continue;
            }
            appendNormalTerrainTile(
              terrainBuilder,
              map,
              heightField,
              level,
              localX,
              localZ,
              worldX,
              worldZ,
              originTileX,
              originTileZ,
              materials,
            );
            terrainTiles += 1;
          }
        }
      }

      for (const location of map.locations) {
        const sourceTileX = mapBaseX + location.localX;
        const sourceTileZ = mapBaseZ + location.localZ;
        if (
          sourceTileX < originTileX || sourceTileX >= maxTileX ||
          sourceTileZ < originTileZ || sourceTileZ >= maxTileZ
        ) {
          continue;
        }

        const result = appendLocation(
          locationBuilder,
          {
            id: location.id,
            sourceLevel: location.level,
            sourceTileX,
            sourceTileZ,
            destinationLevel: location.level,
            destinationTileX: sourceTileX,
            destinationTileZ: sourceTileZ,
            shape: location.shape,
            angle: location.angle,
            chunkRotation: 0,
          },
          heightField,
          assets,
          originTileX,
          originTileZ,
        );
        locationPlacements += 1;
        modelInstances += result.modelInstances;
        modelTriangles += result.modelTriangles;
        if (result.modelInstances === 0) {
          skippedLocations += 1;
        }
      }
    }
  } else {
    for (const placement of rebuild.zones) {
      if (!placement) {
        continue;
      }

      const sourceMap = mapLookup.get(placement.mapSquare.id);
      if (!sourceMap) {
        continue;
      }

      appendInstancedTerrainZone(
        terrainBuilder,
        sourceMap,
        placement,
        heightField,
        originTileX,
        originTileZ,
        materials,
        () => {
          terrainTiles += 1;
        },
      );

      const sourceZoneBaseX = placement.sourceZoneX * SCENE_ZONE_SIZE;
      const sourceZoneBaseZ = placement.sourceZoneZ * SCENE_ZONE_SIZE;
      const sourceMapBaseX = sourceMap.mapSquare.x * MAP_SIZE;
      const sourceMapBaseZ = sourceMap.mapSquare.z * MAP_SIZE;

      for (const location of sourceMap.locations) {
        if (location.level !== placement.sourceLevel) {
          continue;
        }
        const sourceTileX = sourceMapBaseX + location.localX;
        const sourceTileZ = sourceMapBaseZ + location.localZ;
        if (
          sourceTileX < sourceZoneBaseX ||
          sourceTileX >= sourceZoneBaseX + SCENE_ZONE_SIZE ||
          sourceTileZ < sourceZoneBaseZ ||
          sourceTileZ >= sourceZoneBaseZ + SCENE_ZONE_SIZE
        ) {
          continue;
        }

        const definition = resolveRenderableDefinition(
          location.id,
          assets.locDefinitions,
        );
        const size = getRotatedFootprint(
          definition?.sizeX ?? 1,
          definition?.sizeZ ?? 1,
          location.angle,
        );
        const sourceLocalX = sourceTileX - sourceZoneBaseX;
        const sourceLocalZ = sourceTileZ - sourceZoneBaseZ;
        const destinationLocal = rotateChunkObjectOrigin(
          sourceLocalX,
          sourceLocalZ,
          placement.rotation,
          size.x,
          size.z,
        );
        const destinationTileX =
          placement.destinationZoneX * SCENE_ZONE_SIZE + destinationLocal.x;
        const destinationTileZ =
          placement.destinationZoneZ * SCENE_ZONE_SIZE + destinationLocal.z;

        const result = appendLocation(
          locationBuilder,
          {
            id: location.id,
            sourceLevel: location.level,
            sourceTileX,
            sourceTileZ,
            destinationLevel: placement.destinationLevel,
            destinationTileX,
            destinationTileZ,
            shape: location.shape,
            angle: (location.angle + placement.rotation) & 3,
            chunkRotation: placement.rotation,
          },
          heightField,
          assets,
          originTileX,
          originTileZ,
        );
        locationPlacements += 1;
        modelInstances += result.modelInstances;
        modelTriangles += result.modelTriangles;
        if (result.modelInstances === 0) {
          skippedLocations += 1;
        }
      }
    }
  }

  const terrain = terrainBuilder.finish();
  const locations = locationBuilder.finish();
  const bounds = mergeBounds(
    terrainBuilder.bounds,
    locationBuilder.bounds,
    {
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: SCENE_DIAMETER_TILES * SCENE_TILE_SIZE,
      maxY: 1,
      maxZ: SCENE_DIAMETER_TILES * SCENE_TILE_SIZE,
    },
  );

  return {
    originTileX,
    originTileZ,
    terrain,
    locations,
    bounds,
    stats: {
      terrainTiles,
      terrainTriangles: terrain.vertexCount / 3,
      locationPlacements,
      modelInstances,
      modelTriangles,
      skippedLocations,
    },
  };
}

export function deriveImplicitTerrainHeight(
  absoluteTileX: number,
  absoluteTileZ: number,
): number {
  return -terrainNoise(
    absoluteTileX + 932731,
    absoluteTileZ + 556238,
  ) * 8;
}

export function deriveTerrainHeight(
  explicitHeight: number,
  previousLevelHeight: number | null,
  absoluteTileX: number,
  absoluteTileZ: number,
): number {
  if (explicitHeight < 0) {
    return previousLevelHeight === null
      ? deriveImplicitTerrainHeight(absoluteTileX, absoluteTileZ)
      : previousLevelHeight - IMPLICIT_LEVEL_DROP;
  }

  const normalizedHeight = explicitHeight === 1 ? 0 : explicitHeight;
  const delta = normalizedHeight * 8;
  if (previousLevelHeight === null) {
    return delta === 0 ? 0 : -delta;
  }
  return previousLevelHeight - delta;
}

/**
 * Reuses the exact terrain-height rules used by scene assembly for actor
 * placement. RuneScape entity coordinates are absolute tiles; the renderer
 * needs the corresponding scene-space Y value to stand actors on the map.
 */
export class SceneTerrainSampler {
  private readonly heights: TerrainHeightField;

  constructor(maps: readonly LoadedMapSquare[]) {
    this.heights = new TerrainHeightField(createMapLookup(maps));
  }

  groundY(
    level: number,
    absoluteTileX: number,
    absoluteTileZ: number,
  ): number {
    return -this.heights.height(
      level,
      absoluteTileX,
      absoluteTileZ,
    );
  }
}

class TerrainHeightField {
  private readonly resolved = new Map<number, Int32Array>();

  constructor(
    private readonly maps: ReadonlyMap<number, LoadedMapSquare>,
  ) {}

  height(level: number, absoluteTileX: number, absoluteTileZ: number): number {
    const mapSquareX = Math.floor(absoluteTileX / MAP_SIZE);
    const mapSquareZ = Math.floor(absoluteTileZ / MAP_SIZE);
    const mapId = ((mapSquareX & 0xff) << 8) | (mapSquareZ & 0xff);
    const map = this.maps.get(mapId);

    if (!map) {
      if (level === 0) {
        return deriveImplicitTerrainHeight(absoluteTileX, absoluteTileZ);
      }
      return this.height(level - 1, absoluteTileX, absoluteTileZ) -
        IMPLICIT_LEVEL_DROP;
    }

    const localX = positiveModulo(absoluteTileX, MAP_SIZE);
    const localZ = positiveModulo(absoluteTileZ, MAP_SIZE);
    const heights = this.resolveMap(map);
    return heights[mapTerrainTileIndex(level, localX, localZ)]!;
  }

  private resolveMap(map: LoadedMapSquare): Int32Array {
    const cached = this.resolved.get(map.mapSquare.id);
    if (cached) {
      return cached;
    }

    const heights = new Int32Array(LEVEL_COUNT * MAP_SIZE * MAP_SIZE);
    const baseX = map.mapSquare.x * MAP_SIZE;
    const baseZ = map.mapSquare.z * MAP_SIZE;

    for (let level = 0; level < LEVEL_COUNT; level += 1) {
      for (let localX = 0; localX < MAP_SIZE; localX += 1) {
        for (let localZ = 0; localZ < MAP_SIZE; localZ += 1) {
          const index = mapTerrainTileIndex(level, localX, localZ);
          const previous = level === 0
            ? null
            : heights[mapTerrainTileIndex(level - 1, localX, localZ)]!;
          heights[index] = deriveTerrainHeight(
            map.terrain.explicitHeights[index]!,
            previous,
            baseX + localX,
            baseZ + localZ,
          );
        }
      }
    }

    this.resolved.set(map.mapSquare.id, heights);
    return heights;
  }
}

function appendNormalTerrainTile(
  builder: MeshBuilder,
  map: LoadedMapSquare,
  heights: TerrainHeightField,
  level: number,
  localX: number,
  localZ: number,
  worldX: number,
  worldZ: number,
  originTileX: number,
  originTileZ: number,
  materials: SceneFloorMaterials | null,
): void {
  const corners = [
    terrainVertex(heights, level, worldX, worldZ, originTileX, originTileZ),
    terrainVertex(heights, level, worldX + 1, worldZ, originTileX, originTileZ),
    terrainVertex(heights, level, worldX + 1, worldZ + 1, originTileX, originTileZ),
    terrainVertex(heights, level, worldX, worldZ + 1, originTileX, originTileZ),
  ] as const;
  appendTerrainTileGeometry(
    builder,
    map,
    level,
    localX,
    localZ,
    corners,
    materials,
  );
}

function appendInstancedTerrainZone(
  builder: MeshBuilder,
  map: LoadedMapSquare,
  placement: InstanceZonePlacement,
  heights: TerrainHeightField,
  originTileX: number,
  originTileZ: number,
  materials: SceneFloorMaterials | null,
  onTile: () => void,
): void {
  const sourceZoneBaseX = placement.sourceZoneX * SCENE_ZONE_SIZE;
  const sourceZoneBaseZ = placement.sourceZoneZ * SCENE_ZONE_SIZE;
  const mapBaseX = map.mapSquare.x * MAP_SIZE;
  const mapBaseZ = map.mapSquare.z * MAP_SIZE;

  for (let sourceLocalX = 0; sourceLocalX < SCENE_ZONE_SIZE; sourceLocalX += 1) {
    for (let sourceLocalZ = 0; sourceLocalZ < SCENE_ZONE_SIZE; sourceLocalZ += 1) {
      const sourceTileX = sourceZoneBaseX + sourceLocalX;
      const sourceTileZ = sourceZoneBaseZ + sourceLocalZ;
      const mapLocalX = sourceTileX - mapBaseX;
      const mapLocalZ = sourceTileZ - mapBaseZ;
      if (
        mapLocalX < 0 || mapLocalX >= MAP_SIZE ||
        mapLocalZ < 0 || mapLocalZ >= MAP_SIZE ||
        !shouldRenderTerrainTile(
          map,
          placement.sourceLevel,
          mapLocalX,
          mapLocalZ,
        )
      ) {
        continue;
      }

      const sourceCorners = [
        { x: sourceLocalX, z: sourceLocalZ },
        { x: sourceLocalX + 1, z: sourceLocalZ },
        { x: sourceLocalX + 1, z: sourceLocalZ + 1 },
        { x: sourceLocalX, z: sourceLocalZ + 1 },
      ] as const;
      const worldHeights = [
        heights.height(placement.sourceLevel, sourceTileX, sourceTileZ),
        heights.height(placement.sourceLevel, sourceTileX + 1, sourceTileZ),
        heights.height(placement.sourceLevel, sourceTileX + 1, sourceTileZ + 1),
        heights.height(placement.sourceLevel, sourceTileX, sourceTileZ + 1),
      ] as const;
      const destinationZoneBaseX =
        placement.destinationZoneX * SCENE_ZONE_SIZE;
      const destinationZoneBaseZ =
        placement.destinationZoneZ * SCENE_ZONE_SIZE;
      const transformed = sourceCorners.map((corner, index) => {
        const rotated = rotateChunkCorner(
          corner.x,
          corner.z,
          placement.rotation,
        );
        return {
          x: (
            destinationZoneBaseX + rotated.x - originTileX
          ) * SCENE_TILE_SIZE,
          y: -worldHeights[index]!,
          z: (
            destinationZoneBaseZ + rotated.z - originTileZ
          ) * SCENE_TILE_SIZE,
        };
      });

      appendTerrainTileGeometry(
        builder,
        map,
        placement.sourceLevel,
        mapLocalX,
        mapLocalZ,
        transformed,
        materials,
      );
      onTile();
    }
  }
}

function appendLocation(
  builder: MeshBuilder,
  location: PlacedLocation,
  heights: TerrainHeightField,
  assets: LoadedSceneAssets,
  originTileX: number,
  originTileZ: number,
): { modelInstances: number; modelTriangles: number } {
  const definition = resolveRenderableDefinition(
    location.id,
    assets.locDefinitions,
  );
  if (!definition) {
    return { modelInstances: 0, modelTriangles: 0 };
  }

  const footprint = getRotatedFootprint(
    definition.sizeX,
    definition.sizeZ,
    location.angle,
  );
  const sourceFootprint = getRotatedFootprint(
    definition.sizeX,
    definition.sizeZ,
    (location.angle - location.chunkRotation) & 3,
  );
  const sourceHeight = averageFootprintHeight(
    heights,
    location.sourceLevel,
    location.sourceTileX,
    location.sourceTileZ,
    sourceFootprint.x,
    sourceFootprint.z,
  );
  const centerX = (
    location.destinationTileX - originTileX
  ) * SCENE_TILE_SIZE + footprint.x * (SCENE_TILE_SIZE / 2);
  const centerZ = (
    location.destinationTileZ - originTileZ
  ) * SCENE_TILE_SIZE + footprint.z * (SCENE_TILE_SIZE / 2);

  const placements = modelPlacementsForShape(location.shape, location.angle);
  let modelInstances = 0;
  let modelTriangles = 0;

  for (const placement of placements) {
    const modelIds = selectModels(
      definition,
      placement.modelType,
    );
    for (const modelId of modelIds) {
      const model = assets.models.get(modelId);
      if (!model) {
        continue;
      }
      modelInstances += 1;
      modelTriangles += appendModel(
        builder,
        model,
        definition,
        placement,
        centerX,
        centerZ,
        sourceHeight,
      );
    }
  }

  return { modelInstances, modelTriangles };
}

function appendModel(
  builder: MeshBuilder,
  model: DecodedModelGeometry,
  definition: LocModelDefinition,
  placement: ModelPlacement,
  centerX: number,
  centerZ: number,
  clientGroundHeight: number,
): number {
  let triangles = 0;
  const mirrored =
    definition.rotated !==
    (placement.modelType === 2 && placement.orientation > 3);
  const transformVertex = (vertex: number): Vec3 =>
    transformModelVertex(
      model,
      vertex,
      definition,
      placement,
      mirrored,
      centerX,
      centerZ,
      clientGroundHeight,
    );

  for (let face = 0; face < model.faceA.length; face += 1) {
    const alpha = model.faceTransparencies[face]! & 0xff;
    if (alpha >= 254) {
      continue;
    }

    const a = transformVertex(model.faceA[face]!);
    const b = transformVertex(model.faceB[face]!);
    const c = transformVertex(model.faceC[face]!);

    let faceColor = model.faceColors[face]!;
    for (let i = 0; i < definition.recolorFrom.length; i += 1) {
      if (faceColor === definition.recolorFrom[i]) {
        faceColor = definition.recolorTo[i] ?? faceColor;
        break;
      }
    }

    let texture = model.faceTextures[face]!;
    for (let i = 0; i < definition.retextureFrom.length; i += 1) {
      if (texture === definition.retextureFrom[i]) {
        texture = definition.retextureTo[i] ?? texture;
        break;
      }
    }

    const base = modelColor(faceColor, texture);
    const shaded = shadeByTriangleNormal(base, a, b, c);
    const textureUvs = texture >= 0
      ? resolveType0FaceTextureUvs(model, face, transformVertex)
      : null;
    builder.pushTriangle(
      a,
      b,
      c,
      shaded,
      textureUvs ? texture : -1,
      textureUvs,
    );
    triangles += 1;
  }

  return triangles;
}

function transformModelVertex(
  model: DecodedModelGeometry,
  vertex: number,
  definition: LocModelDefinition,
  placement: ModelPlacement,
  mirrored: boolean,
  centerX: number,
  centerZ: number,
  clientGroundHeight: number,
): Vec3 {
  let x = model.vertexX[vertex]!;
  let y = model.vertexY[vertex]!;
  let z = model.vertexZ[vertex]!;

  if (mirrored) {
    z = -z;
  }

  if (placement.modelType === 4 && placement.orientation > 3) {
    const rotated = rotateRadians(x, z, Math.PI / 4);
    x = rotated.x + 45;
    z = rotated.z - 45;
  }

  const quarter = placement.orientation & 3;
  if (quarter === 1) {
    const oldX = x;
    x = z;
    z = -oldX;
  } else if (quarter === 2) {
    x = -x;
    z = -z;
  } else if (quarter === 3) {
    const oldX = x;
    x = -z;
    z = oldX;
  }

  if (placement.diagonal) {
    const rotated = rotateRadians(x, z, Math.PI / 4);
    x = rotated.x;
    z = rotated.z;
  }

  x = x * definition.modelScaleX / 128 + definition.offsetX;
  y = y * definition.modelScaleY / 128 + definition.offsetY;
  z = z * definition.modelScaleZ / 128 + definition.offsetZ;

  return {
    x: centerX + x,
    y: -(clientGroundHeight + y),
    z: centerZ + z,
  };
}

function resolveRenderableDefinition(
  id: number,
  definitions: ReadonlyMap<number, LocModelDefinition>,
): LocModelDefinition | null {
  let definition = definitions.get(id) ?? null;
  const seen = new Set<number>();

  for (let depth = 0; definition && depth < 8; depth += 1) {
    if (definition.modelIds.length !== 0) {
      return definition;
    }
    if (seen.has(definition.id)) {
      return null;
    }
    seen.add(definition.id);

    let nextId = -1;
    for (let index = definition.transforms.length - 1; index >= 0; index -= 1) {
      const candidate = definition.transforms[index]!;
      if (candidate >= 0 && !seen.has(candidate)) {
        nextId = candidate;
        break;
      }
    }
    definition = nextId >= 0
      ? definitions.get(nextId) ?? null
      : null;
  }

  return definition;
}

function selectModels(
  definition: LocModelDefinition,
  requestedType: number,
): readonly number[] {
  if (definition.modelTypes === null) {
    return requestedType === 10 ? definition.modelIds : [];
  }

  const result: number[] = [];
  for (let index = 0; index < definition.modelTypes.length; index += 1) {
    if (definition.modelTypes[index] === requestedType) {
      const modelId = definition.modelIds[index];
      if (modelId !== undefined) {
        result.push(modelId);
      }
    }
  }
  return result;
}

function modelPlacementsForShape(
  shape: number,
  angle: number,
): readonly ModelPlacement[] {
  if (shape === 2) {
    return [
      { modelType: 2, orientation: angle + 4, diagonal: false },
      { modelType: 2, orientation: (angle + 1) & 3, diagonal: false },
    ];
  }
  if (shape === 5) {
    return [{ modelType: 4, orientation: angle, diagonal: false }];
  }
  if (shape === 6) {
    return [{ modelType: 4, orientation: angle + 4, diagonal: false }];
  }
  if (shape === 7) {
    return [{
      modelType: 4,
      orientation: ((angle + 2) & 3) + 4,
      diagonal: false,
    }];
  }
  if (shape === 8) {
    return [
      { modelType: 4, orientation: angle + 4, diagonal: false },
      {
        modelType: 4,
        orientation: ((angle + 2) & 3) + 4,
        diagonal: false,
      },
    ];
  }
  if (shape === 11) {
    return [{ modelType: 10, orientation: angle, diagonal: true }];
  }
  return [{
    modelType: shape >= 4 && shape <= 8 ? 4 : shape,
    orientation: angle,
    diagonal: false,
  }];
}

function shouldRenderTerrainTile(
  map: LoadedMapSquare,
  level: number,
  localX: number,
  localZ: number,
): boolean {
  if (level === 0) {
    return true;
  }
  const index = mapTerrainTileIndex(level, localX, localZ);
  return (
    map.terrain.overlayIds[index]! >= 0 ||
    map.terrain.underlayIds[index]! >= 0 ||
    map.terrain.renderFlags[index]! !== 0
  );
}

interface TerrainSurfaceMaterial {
  readonly color: Rgb;
  readonly textureId: number;
  readonly hidden: boolean;
}

interface TerrainShapeNode {
  readonly vertex: Vec3;
  readonly uv: { readonly u: number; readonly v: number };
}

function appendTerrainTileGeometry(
  builder: MeshBuilder,
  map: LoadedMapSquare,
  level: number,
  localX: number,
  localZ: number,
  corners: readonly Vec3[],
  materials: SceneFloorMaterials | null,
): void {
  const index = mapTerrainTileIndex(level, localX, localZ);
  const overlayId = map.terrain.overlayIds[index]!;
  const surfaces = terrainSurfaceMaterials(
    map,
    level,
    localX,
    localZ,
    materials,
  );

  if (overlayId < 0) {
    const color = shadeByTriangleNormal(
      surfaces.underlay.color,
      corners[0]!,
      corners[1]!,
      corners[3]!,
    );
    builder.pushQuad(
      corners[0]!,
      corners[1]!,
      corners[2]!,
      corners[3]!,
      color,
    );
    return;
  }

  const shape = clamp(
    map.terrain.overlayShapes[index]! + 1,
    1,
    GROUND_SHAPE_POINTS.length - 1,
  );
  const rotation = map.terrain.overlayRotations[index]! & 3;
  const pointCodes = GROUND_SHAPE_POINTS[shape]!;
  const nodes = pointCodes.map(
    (node) => makeTerrainShapeNode(node, rotation, corners),
  );
  const faces = GROUND_SHAPE_FACES[shape]!;
  const flat =
    corners[0]!.y === corners[1]!.y &&
    corners[0]!.y === corners[2]!.y &&
    corners[0]!.y === corners[3]!.y;

  for (let offset = 0; offset < faces.length; offset += 4) {
    const overlayFace = faces[offset]! === 1;
    let a = faces[offset + 1]!;
    let b = faces[offset + 2]!;
    let d = faces[offset + 3]!;
    if (a < 4) a = (a - rotation) & 3;
    if (b < 4) b = (b - rotation) & 3;
    if (d < 4) d = (d - rotation) & 3;

    const na = nodes[a]!;
    const nb = nodes[b]!;
    const nd = nodes[d]!;
    const surface = overlayFace ? surfaces.overlay : surfaces.underlay;
    if (!surface || surface.hidden) {
      continue;
    }

    const color = shadeByTriangleNormal(
      surface.color,
      na.vertex,
      nb.vertex,
      nd.vertex,
    );
    const textureUvs = surface.textureId >= 0
      ? flat
        ? [na.uv, nb.uv, nd.uv] as const
        : [
            { u: 0, v: 0 },
            { u: 1, v: 0 },
            { u: 0, v: 1 },
          ] as const
      : null;

    builder.pushTriangle(
      na.vertex,
      nb.vertex,
      nd.vertex,
      color,
      surface.textureId,
      textureUvs,
    );
  }
}

function terrainSurfaceMaterials(
  map: LoadedMapSquare,
  level: number,
  localX: number,
  localZ: number,
  materials: SceneFloorMaterials | null,
): {
  readonly underlay: TerrainSurfaceMaterial;
  readonly overlay: TerrainSurfaceMaterial | null;
} {
  const index = mapTerrainTileIndex(level, localX, localZ);
  const overlayId = map.terrain.overlayIds[index]!;
  const underlayRawId = map.terrain.underlayIds[index]!;
  const underlayDefinition = underlayRawId > 0
    ? materials?.underlays.get(underlayRawId - 1)
    : undefined;
  const overlayDefinition = overlayId >= 0
    ? materials?.overlays.get(overlayId)
    : undefined;

  const underlayBase = underlayDefinition
    ? rgb24(underlayDefinition.rgb)
    : fallbackTerrainColor(
        -1,
        underlayRawId,
      );
  const underlay: TerrainSurfaceMaterial = {
    color: underlayBase,
    textureId: -1,
    hidden: false,
  };

  if (overlayId < 0) {
    return { underlay, overlay: null };
  }

  if (!overlayDefinition) {
    return {
      underlay,
      overlay: {
        color: fallbackTerrainColor(
          overlayId,
          underlayRawId,
        ),
        textureId: -1,
        hidden: false,
      },
    };
  }

  const textureId = overlayDefinition.texture;
  const hidden =
    textureId < 0 &&
    overlayDefinition.rgb === 0xff00ff;

  let overlayColor: Rgb | null =
    overlayDefinition.rgb === 0xff00ff
      ? null
      : rgb24(overlayDefinition.rgb);

  if (!overlayColor && textureId >= 0) {
    const average = materials?.textureAverageRgb.get(textureId);
    if (average !== undefined) {
      overlayColor = packedHslColor(average);
    }
  }

  return {
    underlay,
    overlay: {
      color: overlayColor ?? underlay.color,
      textureId,
      hidden,
    },
  };
}

function fallbackTerrainColor(
  overlayId: number,
  underlayRawId: number,
): Rgb {
  const seed = overlayId >= 0
    ? overlayId * 67 + 193
    : underlayRawId > 0
      ? underlayRawId * 43 + 71
      : 17;
  const hue = positiveModulo(seed * 37, 360) / 360;
  const saturation = overlayId >= 0 ? 0.42 : 0.34;
  const lightness = overlayId >= 0
    ? 0.32 + positiveModulo(seed, 9) / 100
    : 0.28 + positiveModulo(seed, 11) / 100;
  return hslToRgb(hue, saturation, lightness);
}

function makeTerrainShapeNode(
  rawNode: number,
  rotation: number,
  corners: readonly Vec3[],
): TerrainShapeNode {
  let node = rawNode;
  if ((node & 1) === 0 && node <= 8) {
    node = ((node - rotation - rotation - 1) & 7) + 1;
  }
  if (node > 8 && node <= 12) {
    node = ((node - 9 - rotation) & 3) + 9;
  }
  if (node > 12 && node <= 16) {
    node = ((node - 13 - rotation) & 3) + 13;
  }

  let u = 0;
  let v = 0;
  let y = corners[0]!.y;
  switch (node) {
    case 1:
      u = 0; v = 0; y = corners[0]!.y;
      break;
    case 2:
      u = 0.5; v = 0; y = (corners[0]!.y + corners[1]!.y) / 2;
      break;
    case 3:
      u = 1; v = 0; y = corners[1]!.y;
      break;
    case 4:
      u = 1; v = 0.5; y = (corners[1]!.y + corners[2]!.y) / 2;
      break;
    case 5:
      u = 1; v = 1; y = corners[2]!.y;
      break;
    case 6:
      u = 0.5; v = 1; y = (corners[2]!.y + corners[3]!.y) / 2;
      break;
    case 7:
      u = 0; v = 1; y = corners[3]!.y;
      break;
    case 8:
      u = 0; v = 0.5; y = (corners[0]!.y + corners[3]!.y) / 2;
      break;
    case 9:
      u = 0.5; v = 0.25; y = (corners[0]!.y + corners[1]!.y) / 2;
      break;
    case 10:
      u = 0.75; v = 0.5; y = (corners[1]!.y + corners[2]!.y) / 2;
      break;
    case 11:
      u = 0.5; v = 0.75; y = (corners[2]!.y + corners[3]!.y) / 2;
      break;
    case 12:
      u = 0.25; v = 0.5; y = (corners[0]!.y + corners[3]!.y) / 2;
      break;
    case 13:
      u = 0.25; v = 0.25; y = corners[0]!.y;
      break;
    case 14:
      u = 0.75; v = 0.25; y = corners[1]!.y;
      break;
    case 15:
      u = 0.75; v = 0.75; y = corners[2]!.y;
      break;
    default:
      u = 0.25; v = 0.75; y = corners[3]!.y;
      break;
  }

  const topX = corners[0]!.x + (corners[1]!.x - corners[0]!.x) * u;
  const topZ = corners[0]!.z + (corners[1]!.z - corners[0]!.z) * u;
  const bottomX = corners[3]!.x + (corners[2]!.x - corners[3]!.x) * u;
  const bottomZ = corners[3]!.z + (corners[2]!.z - corners[3]!.z) * u;

  return {
    vertex: {
      x: topX + (bottomX - topX) * v,
      y,
      z: topZ + (bottomZ - topZ) * v,
    },
    uv: { u, v },
  };
}

function rgb24(rgb: number): Rgb {
  return {
    r: (rgb >>> 16) & 0xff,
    g: (rgb >>> 8) & 0xff,
    b: rgb & 0xff,
  };
}

function packedHslColor(value: number): Rgb {
  return hslToRgb(
    ((value >>> 10) & 0x3f) / 64,
    ((value >>> 7) & 0x7) / 8,
    (value & 0x7f) / 128,
  );
}

function modelColor(faceColor: number, texture: number): Rgb {
  const hue = ((faceColor >>> 10) & 0x3f) / 64;
  const saturation = ((faceColor >>> 7) & 0x7) / 8;
  const lightness = (faceColor & 0x7f) / 128;
  const rgb = hslToRgb(hue, saturation, lightness);
  return texture >= 0
    ? scaleRgb(rgb, 0.86)
    : rgb;
}

function shadeByTriangleNormal(
  base: Rgb,
  a: Vec3,
  b: Vec3,
  c: Vec3,
): Rgb {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abZ = b.z - a.z;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const acZ = c.z - a.z;
  const nx = abY * acZ - abZ * acY;
  const ny = abZ * acX - abX * acZ;
  const nz = abX * acY - abY * acX;
  const length = Math.hypot(nx, ny, nz) || 1;
  const lightLength = Math.hypot(-0.45, 0.82, -0.35);
  const dot = (
    nx * -0.45 + ny * 0.82 + nz * -0.35
  ) / (length * lightLength);
  const shade = clamp(0.68 + Math.abs(dot) * 0.42, 0.58, 1.12);
  return scaleRgb(base, shade);
}

function averageFootprintHeight(
  heights: TerrainHeightField,
  level: number,
  tileX: number,
  tileZ: number,
  sizeX: number,
  sizeZ: number,
): number {
  const x0 = tileX + (sizeX >> 1);
  const x1 = tileX + ((sizeX + 1) >> 1);
  const z0 = tileZ + (sizeZ >> 1);
  const z1 = tileZ + ((sizeZ + 1) >> 1);
  return (
    heights.height(level, x0, z0) +
    heights.height(level, x1, z0) +
    heights.height(level, x0, z1) +
    heights.height(level, x1, z1)
  ) >> 2;
}

function getRotatedFootprint(
  sizeX: number,
  sizeZ: number,
  angle: number,
): { x: number; z: number } {
  return (angle & 1) === 1
    ? { x: sizeZ, z: sizeX }
    : { x: sizeX, z: sizeZ };
}

function rotateChunkObjectOrigin(
  x: number,
  z: number,
  rotation: number,
  sizeX: number,
  sizeZ: number,
): { x: number; z: number } {
  const quarter = rotation & 3;
  if (quarter === 0) {
    return { x, z };
  }
  if (quarter === 1) {
    return { x: z, z: 7 - x - (sizeX - 1) };
  }
  if (quarter === 2) {
    return {
      x: 7 - x - (sizeX - 1),
      z: 7 - z - (sizeZ - 1),
    };
  }
  return { x: 7 - z - (sizeZ - 1), z: x };
}

function rotateChunkCorner(
  x: number,
  z: number,
  rotation: number,
): { x: number; z: number } {
  const quarter = rotation & 3;
  if (quarter === 0) {
    return { x, z };
  }
  if (quarter === 1) {
    return { x: z, z: SCENE_ZONE_SIZE - x };
  }
  if (quarter === 2) {
    return {
      x: SCENE_ZONE_SIZE - x,
      z: SCENE_ZONE_SIZE - z,
    };
  }
  return { x: SCENE_ZONE_SIZE - z, z: x };
}

function terrainVertex(
  heights: TerrainHeightField,
  level: number,
  worldX: number,
  worldZ: number,
  originTileX: number,
  originTileZ: number,
): Vec3 {
  return {
    x: (worldX - originTileX) * SCENE_TILE_SIZE,
    y: -heights.height(level, worldX, worldZ),
    z: (worldZ - originTileZ) * SCENE_TILE_SIZE,
  };
}

function createMapLookup(
  maps: readonly LoadedMapSquare[],
): ReadonlyMap<number, LoadedMapSquare> {
  return new Map(maps.map((map) => [map.mapSquare.id, map] as const));
}

function terrainNoise(x: number, z: number): number {
  let value = interpolatedNoise(x + 45365, z + 91923, 4) - 128;
  value += (interpolatedNoise(x + 10294, z + 37821, 2) - 128) >> 1;
  value += (interpolatedNoise(x, z, 1) - 128) >> 2;
  value = Math.trunc(value * 0.3) + 35;
  return clamp(value, 10, 60);
}

function interpolatedNoise(x: number, z: number, scale: number): number {
  const gridX = Math.floor(x / scale);
  const gridZ = Math.floor(z / scale);
  const fractionX = positiveModulo(x, scale);
  const fractionZ = positiveModulo(z, scale);
  const a = interpolate(
    smoothNoise(gridX, gridZ),
    smoothNoise(gridX + 1, gridZ),
    fractionX,
    scale,
  );
  const b = interpolate(
    smoothNoise(gridX, gridZ + 1),
    smoothNoise(gridX + 1, gridZ + 1),
    fractionX,
    scale,
  );
  return interpolate(a, b, fractionZ, scale);
}

function smoothNoise(x: number, z: number): number {
  const corners =
    rawNoise(x - 1, z - 1) +
    rawNoise(x + 1, z - 1) +
    rawNoise(x - 1, z + 1) +
    rawNoise(x + 1, z + 1);
  const sides =
    rawNoise(x - 1, z) +
    rawNoise(x + 1, z) +
    rawNoise(x, z - 1) +
    rawNoise(x, z + 1);
  return Math.trunc(corners / 16) +
    Math.trunc(sides / 8) +
    Math.trunc(rawNoise(x, z) / 4);
}

function rawNoise(x: number, z: number): number {
  let value = (x + Math.imul(z, 57)) | 0;
  value = (value ^ (value << 13)) | 0;
  const squared = Math.imul(value, value);
  const polynomial = (
    Math.imul(squared, 15731) + 789221
  ) | 0;
  return (
    (Math.imul(value, polynomial) + 1376312589) & 0x7fffffff
  ) >>> 19 & 0xff;
}

function interpolate(
  a: number,
  b: number,
  fraction: number,
  scale: number,
): number {
  const angle = Math.trunc(fraction * 1024 / scale);
  const cosine = Math.trunc(
    65536 * Math.cos(angle * 0.0030679615757712823),
  );
  const weight = (65536 - cosine) >> 1;
  return (
    (a * (65536 - weight) >> 16) +
    (b * weight >> 16)
  );
}

interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];
  private readonly textureCoords: number[] = [];
  private readonly textureIds: number[] = [];
  private mutableBounds: MutableBounds | null = null;

  get bounds(): SceneBounds | null {
    return this.mutableBounds;
  }

  pushQuad(
    a: Vec3,
    b: Vec3,
    c: Vec3,
    d: Vec3,
    color: Rgb,
    textureId = -1,
    textureUvs:
      | readonly [
          { readonly u: number; readonly v: number },
          { readonly u: number; readonly v: number },
          { readonly u: number; readonly v: number },
          { readonly u: number; readonly v: number },
        ]
      | null = null,
  ): void {
    this.pushTriangle(
      a,
      b,
      c,
      color,
      textureId,
      textureUvs
        ? [textureUvs[0], textureUvs[1], textureUvs[2]]
        : null,
    );
    this.pushTriangle(
      a,
      c,
      d,
      color,
      textureId,
      textureUvs
        ? [textureUvs[0], textureUvs[2], textureUvs[3]]
        : null,
    );
  }

  pushTriangle(
    a: Vec3,
    b: Vec3,
    c: Vec3,
    color: Rgb,
    textureId = -1,
    textureUvs:
      | readonly [
          { readonly u: number; readonly v: number },
          { readonly u: number; readonly v: number },
          { readonly u: number; readonly v: number },
        ]
      | null = null,
  ): void {
    this.pushVertex(a, color, textureId, textureUvs?.[0]);
    this.pushVertex(b, color, textureId, textureUvs?.[1]);
    this.pushVertex(c, color, textureId, textureUvs?.[2]);
  }

  finish(): SceneMesh {
    return {
      positions: Float32Array.from(this.positions),
      colors: Uint8Array.from(this.colors),
      textureCoords: Float32Array.from(this.textureCoords),
      textureIds: Int32Array.from(this.textureIds),
      vertexCount: this.positions.length / 3,
    };
  }

  private pushVertex(
    vertex: Vec3,
    color: Rgb,
    textureId: number,
    textureUv?: { readonly u: number; readonly v: number },
  ): void {
    this.positions.push(vertex.x, vertex.y, vertex.z);
    this.colors.push(
      clamp(Math.round(color.r), 0, 255),
      clamp(Math.round(color.g), 0, 255),
      clamp(Math.round(color.b), 0, 255),
    );
    this.textureCoords.push(textureUv?.u ?? 0, textureUv?.v ?? 0);
    this.textureIds.push(textureId);

    if (!this.mutableBounds) {
      this.mutableBounds = {
        minX: vertex.x,
        minY: vertex.y,
        minZ: vertex.z,
        maxX: vertex.x,
        maxY: vertex.y,
        maxZ: vertex.z,
      };
      return;
    }

    this.mutableBounds.minX = Math.min(this.mutableBounds.minX, vertex.x);
    this.mutableBounds.minY = Math.min(this.mutableBounds.minY, vertex.y);
    this.mutableBounds.minZ = Math.min(this.mutableBounds.minZ, vertex.z);
    this.mutableBounds.maxX = Math.max(this.mutableBounds.maxX, vertex.x);
    this.mutableBounds.maxY = Math.max(this.mutableBounds.maxY, vertex.y);
    this.mutableBounds.maxZ = Math.max(this.mutableBounds.maxZ, vertex.z);
  }
}

interface MutableBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

function mergeBounds(
  first: SceneBounds | null,
  second: SceneBounds | null,
  fallback: SceneBounds,
): SceneBounds {
  if (!first && !second) {
    return fallback;
  }
  if (!first) {
    return second!;
  }
  if (!second) {
    return first;
  }
  return {
    minX: Math.min(first.minX, second.minX),
    minY: Math.min(first.minY, second.minY),
    minZ: Math.min(first.minZ, second.minZ),
    maxX: Math.max(first.maxX, second.maxX),
    maxY: Math.max(first.maxY, second.maxY),
    maxZ: Math.max(first.maxZ, second.maxZ),
  };
}

function rotateRadians(
  x: number,
  z: number,
  radians: number,
): { x: number; z: number } {
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  return {
    x: x * cos + z * sin,
    z: z * cos - x * sin,
  };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5
    ? l * (1 + s)
    : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255,
  };
}

function hueToRgb(p: number, q: number, input: number): number {
  let t = input;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function scaleRgb(color: Rgb, scale: number): Rgb {
  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
  };
}

function positiveModulo(value: number, modulus: number): number {
  const result = value % modulus;
  return result < 0 ? result + modulus : result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
