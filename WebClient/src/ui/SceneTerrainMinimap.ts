import type { AssembledScene } from '../scene/SceneAssembler';
import {
  SCENE_DIAMETER_TILES, SCENE_TILE_SIZE,
} from '../scene/SceneAssembler';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';

/**
 * Top-down terrain raster built from the SAME decoded, shaped, lit cache
 * terrain triangles the 3D scene uses. This replaces raw underlay RGB squares:
 * path/overlay shapes and original floor-lighting stay consistent with the
 * visible world. Cache texture average RGB is used only when defined.
 *
 * Mapscene object sprites and world-map icon layers require separate cache
 * definitions. We do not fabricate either.
 */
export const MINIMAP_PIXELS_PER_TILE = 4;

export function sceneMinimapXY(
  x: number, z: number, scale = MINIMAP_PIXELS_PER_TILE,
): {x: number; y: number} {
  return {
    x: x / SCENE_TILE_SIZE * scale,
    y: (SCENE_DIAMETER_TILES + z / SCENE_TILE_SIZE) * scale,
  };
}

export function originalSceneTriangleRgb(
  colors: Uint8Array, firstVertex: number,
  textureId: number, materials: SceneFloorMaterials,
): number | null {
  if (textureId >= 0) {
    return materials.textureAverageRgb.get(textureId) ?? null;
  }
  const base = firstVertex * 3;
  if (base + 8 >= colors.length) return null;
  const r = Math.round((colors[base]! + colors[base + 3]! + colors[base + 6]!) / 3);
  const g = Math.round((colors[base + 1]! + colors[base + 4]! + colors[base + 7]!) / 3);
  const b = Math.round((colors[base + 2]! + colors[base + 5]! + colors[base + 8]!) / 3);
  return (r << 16) | (g << 8) | b;
}

export function rasterizeCacheSceneMinimap(
  scene: AssembledScene,
  materials: SceneFloorMaterials,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_DIAMETER_TILES * MINIMAP_PIXELS_PER_TILE;
  canvas.height = canvas.width;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable for scene minimap');
  const mesh = scene.terrain;
  for (let v = 0; v + 2 < mesh.vertexCount; v += 3) {
    const textureId = mesh.textureIds[v] ?? -1;
    const colour = originalSceneTriangleRgb(mesh.colors, v, textureId, materials);
    if (colour === null) continue;
    const a = sceneMinimapXY(mesh.positions[v * 3]!, mesh.positions[v * 3 + 2]!);
    const b = sceneMinimapXY(mesh.positions[(v + 1) * 3]!, mesh.positions[(v + 1) * 3 + 2]!);
    const c = sceneMinimapXY(mesh.positions[(v + 2) * 3]!, mesh.positions[(v + 2) * 3 + 2]!);
    const style = '#' + colour.toString(16).padStart(6, '0');
    context.fillStyle = style;
    context.strokeStyle = style;
    context.lineWidth = 0.6;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.closePath();
    context.fill();
    context.stroke();
  }
  return canvas;
}

export function paintCacheSceneMinimap(
  canvas: HTMLCanvasElement,
  terrain: HTMLCanvasElement | null,
  scene: AssembledScene | null,
  player: { x: number; z: number; level: number; yaw: number } | null,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!terrain || !scene || !player) return;
  const {x, y} = sceneMinimapXY(
    (player.x - scene.originTileX + 0.5) * SCENE_TILE_SIZE,
    -(player.z - scene.originTileZ + 0.5) * SCENE_TILE_SIZE,
  );
  // The scene's local negative-Z axis points up in this top-down projection.
  const scale = MINIMAP_PIXELS_PER_TILE;
  const centre = canvas.width / 2;
  context.save();
  context.translate(centre, canvas.height / 2);
  context.rotate(-player.yaw * Math.PI * 2 / 2048);
  context.translate(-x, -y);
  context.drawImage(terrain, 0, 0,
    SCENE_DIAMETER_TILES * scale,
    SCENE_DIAMETER_TILES * scale);
  context.restore();
}
