// Generated from pinned TSPS client/game/roof/RoofVisibility.ts; BSD-2-Clause.
// Regenerate with node scripts/adapt-tsps-roofs.mjs; never hand edit.
const getMapIndexFromTile = (tile)=>Math.floor(tile / 64);
const Scene = {
    MAP_SQUARE_SIZE: 64,
    MAX_LEVELS: 4
};
import { TILE_FLAG_UNDER_ROOF, getTileRenderFlagAt, isBridgeSurfaceLocal } from "./game-scene-TileRenderFlags.mjs";
import { clampPlane } from "./game-utils-PlaneUtil.mjs";
const LINE_OF_SIGHT_MAX_PITCH = 310;
const TOP_PLANE = Scene.MAX_LEVELS - 1;
export function computeRoofPlaneLimit(mapManager, maxLevel, input) {
    const playerPlane = resolveRoofReferencePlane(mapManager, input.playerRawPlane, input.playerTile);
    return Math.min(computeTopVisiblePlane(mapManager, playerPlane, input), clampPlane(maxLevel));
}
function computeTopVisiblePlane(mapManager, playerPlane, input) {
    if (input.roofsHidden) {
        return playerPlane;
    }
    let topPlane = TOP_PLANE;
    if (input.cameraPitch < LINE_OF_SIGHT_MAX_PITCH) {
        if (isTileUnderRoof(mapManager, playerPlane, input.cameraTile.x, input.cameraTile.y) || lineCrossesRoofTile(mapManager, playerPlane, input.cameraTile, input.targetTile)) {
            topPlane = playerPlane;
        }
    }
    if (isTileUnderRoof(mapManager, playerPlane, input.playerTile.x, input.playerTile.y)) {
        topPlane = playerPlane;
    }
    return topPlane;
}
function lineCrossesRoofTile(mapManager, plane, from, to) {
    let x = from.x | 0;
    let y = from.y | 0;
    const targetX = to.x | 0;
    const targetY = to.y | 0;
    const dx = Math.abs(targetX - x);
    const dy = Math.abs(targetY - y);
    if (dx > dy) {
        const minorStep = dy * 65536 / dx | 0;
        let acc = 32768;
        while(x !== targetX){
            x += x < targetX ? 1 : -1;
            if (isTileUnderRoof(mapManager, plane, x, y)) {
                return true;
            }
            acc += minorStep;
            if (acc >= 65536) {
                acc -= 65536;
                y += y < targetY ? 1 : -1;
                if (isTileUnderRoof(mapManager, plane, x, y)) {
                    return true;
                }
            }
        }
    } else if (dy > 0) {
        const minorStep = dx * 65536 / dy | 0;
        let acc = 32768;
        while(y !== targetY){
            y += y < targetY ? 1 : -1;
            if (isTileUnderRoof(mapManager, plane, x, y)) {
                return true;
            }
            acc += minorStep;
            if (acc >= 65536) {
                acc -= 65536;
                x += x < targetX ? 1 : -1;
                if (isTileUnderRoof(mapManager, plane, x, y)) {
                    return true;
                }
            }
        }
    }
    return false;
}
function isTileUnderRoof(mapManager, plane, tileX, tileY) {
    return (getTileRenderFlagAt(mapManager, plane, tileX, tileY) & TILE_FLAG_UNDER_ROOF) !== 0;
}
function resolveRoofReferencePlane(mapManager, rawPlane, tile) {
    let plane = clampPlane(rawPlane);
    if (!tile) {
        return plane;
    }
    const map = mapManager.getMap(getMapIndexFromTile(tile.x), getMapIndexFromTile(tile.y));
    if (!map) {
        return plane;
    }
    const mask = Scene.MAP_SQUARE_SIZE - 1;
    const localTileX = tile.x & mask;
    const localTileY = tile.y & mask;
    while(plane > 0 && isBridgeSurfaceLocal(map, plane - 1, localTileX, localTileY)){
        plane--;
    }
    return plane;
}
