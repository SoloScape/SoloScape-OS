// Generated from pinned RSPSApp/tsps: client/game/movement/MovementPath.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
import { MovementDirection, deltaToDirection, directionToDelta } from "./common-Direction.mjs";
export class MovementPath {
    from;
    to;
    steps = [];
    isTeleport;
    constructor(from, to, steps, isTeleport){
        this.from = {
            x: from.x | 0,
            y: from.y | 0
        };
        this.to = {
            x: to.x | 0,
            y: to.y | 0
        };
        this.steps = steps;
        this.isTeleport = isTeleport;
    }
    get stepCount() {
        return this.steps.length;
    }
    get run() {
        return this.steps.some((step)=>step.run);
    }
}
function clampStepDelta(delta) {
    if (delta > 1) return 1;
    if (delta < -1) return -1;
    return delta | 0;
}
export function buildMovementPath(from, to, opts = {}) {
    const fromTile = {
        x: from.x | 0,
        y: from.y | 0
    };
    const toTile = {
        x: to.x | 0,
        y: to.y | 0
    };
    if (fromTile.x === toTile.x && fromTile.y === toTile.y) {
        return new MovementPath(fromTile, toTile, [], false);
    }
    const dx = toTile.x - fromTile.x;
    const dy = toTile.y - fromTile.y;
    const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    const maxStep = Math.max(1, typeof opts.maxStepDistance === "number" ? opts.maxStepDistance : 2);
    if (chebyshev > maxStep && !opts.allowTeleport) {
        return new MovementPath(fromTile, toTile, [], true);
    }
    const running = !!opts.running && chebyshev >= 2;
    const steps = [];
    let currX = fromTile.x;
    let currY = fromTile.y;
    while(currX !== toTile.x || currY !== toTile.y){
        const remainDx = toTile.x - currX;
        const remainDy = toTile.y - currY;
        const stepDx = remainDx !== 0 ? clampStepDelta(remainDx) : 0;
        const stepDy = remainDy !== 0 ? clampStepDelta(remainDy) : 0;
        if (stepDx === 0 && stepDy === 0) break;
        const dir = deltaToDirection(stepDx, stepDy);
        if (dir === undefined) break;
        currX += stepDx;
        currY += stepDy;
        steps.push({
            tile: {
                x: currX,
                y: currY
            },
            direction: dir,
            run: running,
            traversal: running ? 2 : 1
        });
    }
    return new MovementPath(fromTile, toTile, steps, false);
}
export function stepToDelta(step) {
    return directionToDelta(step.direction);
}
