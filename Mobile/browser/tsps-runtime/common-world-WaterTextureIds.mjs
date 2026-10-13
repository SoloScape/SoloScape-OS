// Generated from pinned TSPS client/common/world/WaterTextureIds.ts and SpriteTextureLoader; BSD-2-Clause.
// Run: node scripts/adapt-tsps-water.mjs; do not hand edit.
export const KNOWN_WATER_TEXTURE_IDS = new Set([
    1,
    25,
    91,
    208,
    ...Array.from({
        length: 60
    }, (_, index)=>130 + index)
]);
export function isKnownWaterTextureId(textureId) {
    return KNOWN_WATER_TEXTURE_IDS.has(textureId);
}

export const ANIM_DIRECTION_UV = [
        [0.0, 0.0],
        [0.0, -1.0],
        [-1.0, 0.0],
        [0.0, 1.0],
        [1.0, 0.0],
    ];
