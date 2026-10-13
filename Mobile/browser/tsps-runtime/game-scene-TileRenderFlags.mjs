// Generated from pinned TSPS client/game/scene/TileRenderFlags.ts; BSD-2-Clause.
// Regenerate with node scripts/adapt-tsps-roofs.mjs; never hand edit.
const Scene = {
    MAP_SQUARE_SIZE: 64,
    MAX_LEVELS: 4
};
import { clampPlane } from "./game-utils-PlaneUtil.mjs";
export const TILE_FLAG_BRIDGE = 0x2;
export const TILE_FLAG_UNDER_ROOF = 0x4;
export const TILE_FLAG_FORCE_LOWEST_PLANE = 0x8;
export function getTileRenderFlagLocal(map, level, localTileX, localTileY) {
    if (!map || typeof map.getTileRenderFlag !== "function") {
        return 0;
    }
    return map.getTileRenderFlag(level | 0, localTileX | 0, localTileY | 0) | 0;
}
export function isBridgeSurfaceLocal(map, level, localTileX, localTileY) {
    if (!map || typeof map.isBridgeSurface !== "function") {
        return false;
    }
    return !!map.isBridgeSurface(level | 0, localTileX | 0, localTileY | 0);
}
export function hasBridgeColumnLocal(map, localTileX, localTileY) {
    return (getTileRenderFlagLocal(map, 1, localTileX, localTileY) & TILE_FLAG_BRIDGE) !== 0;
}
export function getTileRenderFlagAt(mapManager, level, tileX, tileY) {
    const map = mapManager.getMapForWorldTile(tileX, tileY);
    if (!map) {
        return 0;
    }
    const localX = tileX - (map.getRenderBaseTileX?.() ?? map.mapX * Scene.MAP_SQUARE_SIZE);
    const localY = tileY - (map.getRenderBaseTileY?.() ?? map.mapY * Scene.MAP_SQUARE_SIZE);
    return getTileRenderFlagLocal(map, clampPlane(level), localX, localY);
}
