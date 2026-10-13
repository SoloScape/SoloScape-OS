// Generated from pinned TSPS client/common/utils/FloatUtil.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
export class FloatUtil {
    static MAX_VALUE = 3.4028234663852886e38;
    static float = new Float32Array(1);
    static integer = new Int32Array(FloatUtil.float.buffer);
    static floatBitsToInt(n) {
        FloatUtil.float[0] = n;
        return FloatUtil.integer[0];
    }
    static intBitsToFloat(n) {
        FloatUtil.integer[0] = n;
        return FloatUtil.float[0];
    }
    static packFloat11(v) {
        return 1024 - Math.round(v / (1 / 64));
    }
    static unpackFloat11(v) {
        return 16 - v / 64;
    }
    static packFloat6(v) {
        return Math.round(v / (1 / 63));
    }
    static unpackFloat6(v) {
        return v / 63;
    }
}
