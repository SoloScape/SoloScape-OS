// Generated from pinned RSPSApp/tsps: client/rs/utils/rotation.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
import { RS_TO_RADIANS } from "./rs-MathConstants.mjs";
export const RAD_TO_RS_UNITS = 1 / RS_TO_RADIANS;
export function faceAngleRs(fromX, fromY, toX, toY) {
    const dx = (fromX | 0) - (toX | 0);
    const dy = (fromY | 0) - (toY | 0);
    if (dx === 0 && dy === 0) return 0;
    const angle = Math.atan2(dx, dy);
    return (angle * RAD_TO_RS_UNITS | 0) & 2047;
}
