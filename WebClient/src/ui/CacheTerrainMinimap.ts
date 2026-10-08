import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import { mapTerrainTileIndex } from '../cache/MapTerrainDecoder';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';

/**
 * The minimap samples real terrain and floor RGB definitions from the exact
 * connected JS5 cache. Missing/unresolved tiles remain transparent; nothing
 * is coloured by a guessed ID palette.
 */
export function cacheMinimapTileRgb(
  maps: ReadonlyMap<number, LoadedMapSquare>,
  floors: SceneFloorMaterials,
  tileX: number, tileZ: number, level: number,
): number | null {
  if (level < 0 || level > 3) return null;
  const x = Math.floor(tileX);
  const z = Math.floor(tileZ);
  const regionX = Math.floor(x / 64);
  const regionZ = Math.floor(z / 64);
  const map = maps.get((regionX << 8) | regionZ);
  if (!map) return null;
  const index = mapTerrainTileIndex(level, (x % 64 + 64) % 64,
    (z % 64 + 64) % 64);
  const overlayId = map.terrain.overlayIds[index] ?? -1;
  if (overlayId >= 0) {
    const overlay = floors.overlays.get(overlayId);
    if (overlay && overlay.rgb !== 0xff00ff && overlay.texture < 0) {
      return overlay.rgb;
    }
    // An unrendered texture is not replaced by a fake colour.
    if (overlay?.texture !== undefined && overlay.texture >= 0) return null;
  }
  const underlayId = map.terrain.underlayIds[index] ?? -1;
  if (underlayId > 0) {
    return floors.underlays.get(underlayId - 1)?.rgb ?? null;
  }
  return null;
}

export function paintCacheTerrainMinimap(
  canvas: HTMLCanvasElement,
  maps: ReadonlyMap<number, LoadedMapSquare>,
  floors: SceneFloorMaterials,
  player: { x: number; z: number; level: number; yaw: number } | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!player || !maps.size || !floors.underlays.size) return;

  const pixelsPerTile = 3;
  const radius = Math.ceil(size / (pixelsPerTile * 2)) + 4;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-player.yaw * Math.PI * 2 / 2048);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const rgb = cacheMinimapTileRgb(maps, floors, player.x + dx,
        player.z + dz, player.level);
      if (rgb === null) continue;
      ctx.fillStyle = '#' + (rgb & 0xffffff).toString(16).padStart(6, '0');
      ctx.fillRect(dx * pixelsPerTile - pixelsPerTile / 2,
        -dz * pixelsPerTile - pixelsPerTile / 2,
        pixelsPerTile + 0.5, pixelsPerTile + 0.5);
    }
  }
  ctx.restore();
}
