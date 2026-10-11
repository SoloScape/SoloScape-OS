// Generated from pinned RSPSApp/tsps: client/rs/MathConstants.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export const TAU = Math.PI * 2;
export const RS_TO_RADIANS = TAU / 2048.0;
export const RS_TO_DEGREES = RS_TO_RADIANS * 180 / Math.PI;
export const DEGREES_TO_RADIANS = Math.PI / 180;
function initBitMasks() {
    const masks = new Int32Array(32);
    let value = 2;
    for(let i = 0; i < 32; i++){
        masks[i] = value - 1;
        value += value;
    }
    return masks;
}
export const BIT_MASKS = initBitMasks();
export const SINE = new Int32Array(2048);
export const COSINE = new Int32Array(2048);
const CIRCULAR_ANGLE = 2048;
const ANGULAR_RATIO = 360.0 / CIRCULAR_ANGLE;
const ANGULAR_RATIO_RADIANS = ANGULAR_RATIO * DEGREES_TO_RADIANS;
for(let i = 0; i < 2048; i++){
    SINE[i] = 65536.0 * Math.sin(i * ANGULAR_RATIO_RADIANS) | 0;
    COSINE[i] = 65536.0 * Math.cos(i * ANGULAR_RATIO_RADIANS) | 0;
}
export const SINE_LARGE = new Int32Array(16384);
export const COSINE_LARGE = new Int32Array(16384);
const d = 3.834951969714103e-4;
for(let i = 0; i < 16384; i++){
    SINE_LARGE[i] = 16384.0 * Math.sin(i * d);
    COSINE_LARGE[i] = 16384.0 * Math.cos(i * d);
}
