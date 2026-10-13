// Generated from pinned TSPS client/game/utils/PlaneUtil.ts; BSD-2-Clause.
// Regenerate with node scripts/adapt-tsps-roofs.mjs; never hand edit.
export function clampPlane(plane) {
    return Math.max(0, Math.min(3, plane | 0));
}
