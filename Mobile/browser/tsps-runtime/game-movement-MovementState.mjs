// Generated from pinned RSPSApp/tsps: client/game/movement/MovementState.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export class MovementState {
    serverId;
    ecsIndex;
    tileX;
    tileY;
    level;
    subX;
    subY;
    lastOrientation = 0;
    lastRunning = false;
    lastSteps = [];
    constructor(init){
        this.serverId = init.serverId;
        this.ecsIndex = init.ecsIndex;
        this.tileX = init.tile.x | 0;
        this.tileY = init.tile.y | 0;
        this.level = init.level | 0;
        this.subX = init.subX | 0;
        this.subY = init.subY | 0;
    }
    setEcsIndex(index) {
        this.ecsIndex = index;
    }
    setTile(tile, subX, subY, level) {
        this.tileX = tile.x | 0;
        this.tileY = tile.y | 0;
        this.subX = subX | 0;
        this.subY = subY | 0;
        this.level = level | 0;
    }
    setLastSteps(steps) {
        if (!steps.length) {
            this.lastSteps = [];
            return;
        }
        this.lastSteps = steps.map((step)=>({
                tile: {
                    x: step.tile.x | 0,
                    y: step.tile.y | 0
                },
                direction: step.direction,
                run: !!step.run,
                traversal: typeof step.traversal === "number" ? step.traversal | 0 : undefined,
                turn: !!step.turn
            }));
    }
    getLastSteps() {
        return this.lastSteps;
    }
}
