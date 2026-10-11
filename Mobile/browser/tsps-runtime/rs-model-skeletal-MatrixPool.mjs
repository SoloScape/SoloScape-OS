// Generated from pinned TSPS client/rs/model/skeletal/MatrixPool.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
import { mat4 } from "./skeletal-math.mjs";
export class MatrixPool {
    static matrixIndex;
    static matrixLimit;
    static matrixPool;
    static IDENTITY = mat4.create();
    static init(size) {
        MatrixPool.matrixIndex = 0;
        MatrixPool.matrixLimit = size;
        MatrixPool.matrixPool = new Array(size);
    }
    static get() {
        if (MatrixPool.matrixIndex === 0) {
            return mat4.create();
        } else {
            mat4.identity(MatrixPool.matrixPool[--MatrixPool.matrixIndex]);
            return MatrixPool.matrixPool[MatrixPool.matrixIndex];
        }
    }
    static release(m) {
        if (MatrixPool.matrixIndex < MatrixPool.matrixLimit - 1) {
            MatrixPool.matrixPool[MatrixPool.matrixIndex++] = m;
        }
    }
}
MatrixPool.init(100);
