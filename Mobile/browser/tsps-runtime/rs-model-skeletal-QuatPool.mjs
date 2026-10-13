// Generated from pinned TSPS client/rs/model/skeletal/QuatPool.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
import { quat } from "./skeletal-math.mjs";
export class QuatPool {
    static quatIndex;
    static quatLimit;
    static quatPool;
    static init(size) {
        QuatPool.quatIndex = 0;
        QuatPool.quatLimit = size;
        QuatPool.quatPool = new Array(size);
    }
    static get() {
        if (QuatPool.quatIndex === 0) {
            return quat.create();
        } else {
            quat.identity(QuatPool.quatPool[--QuatPool.quatIndex]);
            return QuatPool.quatPool[QuatPool.quatIndex];
        }
    }
    static release(q) {
        if (QuatPool.quatIndex < QuatPool.quatLimit - 1) {
            QuatPool.quatPool[QuatPool.quatIndex++] = q;
        }
    }
}
QuatPool.init(100);
