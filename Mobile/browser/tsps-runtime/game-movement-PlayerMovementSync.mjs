// Generated from pinned RSPSApp/tsps: client/game/movement/PlayerMovementSync.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
import { decodeInteractionIndex } from "./rs-interaction-InteractionIndex.mjs";
import { faceAngleRs } from "./rs-utils-rotation.mjs";
import { MovementDirection, deltaToDirection, directionToDelta, directionToOrientation } from "./common-Direction.mjs";
import { MovementPath } from "./game-movement-MovementPath.mjs";
import { MovementState } from "./game-movement-MovementState.mjs";
import { OsrsRouteFinder32 } from "./game-movement-OsrsRouteFinder32.mjs";
function toTileCoord(subCoord) {
    return (subCoord | 0) >> 7;
}
export class PlayerMovementSync {
    playerEcs;
    animController;
    resolveTilePlane;
    npcEcs;
    seqTypeLoader;
    getCollisionFlagAt;
    states = new Map();
    routeFinder = new OsrsRouteFinder32();
    constructor(playerEcs, animController, resolveTilePlane, npcEcs, seqTypeLoader, getCollisionFlagAt){
        this.playerEcs = playerEcs;
        this.animController = animController;
        this.resolveTilePlane = resolveTilePlane;
        this.npcEcs = npcEcs;
        this.seqTypeLoader = seqTypeLoader;
        this.getCollisionFlagAt = getCollisionFlagAt;
        this.playerEcs.setInteractionOrientationProvider?.((ecsIndex)=>this.computeInteractionOrientation(ecsIndex));
    }
    clearMovementFor(serverId) {
        const state = this.states.get(serverId);
        if (!state) return;
        const ecsIndex = state.ecsIndex;
        if (ecsIndex >= 0) {
            try {
                this.playerEcs.clearServerQueue(ecsIndex);
            } catch  {}
        }
    }
    setServerTickMs(ms) {
        try {
            this.playerEcs.setServerTickMs(ms | 0);
        } catch  {}
    }
    registerEntity(info) {
        const subX = info.subX | 0;
        const subY = info.subY | 0;
        const tile = {
            x: toTileCoord(subX),
            y: toTileCoord(subY)
        };
        const effectiveLevel = this.resolveTilePlane ? this.resolveTilePlane(tile.x, tile.y, info.level) : info.level;
        const init = {
            serverId: info.serverId,
            ecsIndex: info.ecsIndex,
            tile,
            level: effectiveLevel,
            subX,
            subY
        };
        const state = new MovementState(init);
        this.states.set(info.serverId, state);
        return state;
    }
    unregister(serverId) {
        this.states.delete(serverId);
        try {
            this.animController?.release(serverId);
        } catch  {}
    }
    receiveUpdate(update) {
        const directions = Array.isArray(update.directions) ? update.directions.map((dir)=>(dir | 0) & 7) : [];
        const traversals = Array.isArray(update.traversals) ? update.traversals.map((t)=>(t | 0) & 3) : [];
        let subX = typeof update.x === "number" ? update.x | 0 : typeof update.subX === "number" ? update.subX | 0 : undefined;
        let subY = typeof update.y === "number" ? update.y | 0 : typeof update.subY === "number" ? update.subY | 0 : undefined;
        const existingState = this.states.get(update.serverId);
        const isFirstAppearance = !existingState;
        const initialTile = subX !== undefined && subY !== undefined ? {
            x: toTileCoord(subX),
            y: toTileCoord(subY)
        } : existingState ? {
            x: existingState.tileX,
            y: existingState.tileY
        } : {
            x: 0,
            y: 0
        };
        const effectiveLevel = this.resolveTilePlane ? this.resolveTilePlane(initialTile.x, initialTile.y, update.level | 0) : update.level | 0;
        update.level = effectiveLevel;
        const defaultSubX = (initialTile.x << 7) + 64;
        const defaultSubY = (initialTile.y << 7) + 64;
        const state = existingState ? existingState : this.registerEntity({
            serverId: update.serverId,
            ecsIndex: update.ecsIndex,
            tile: initialTile,
            level: effectiveLevel,
            subX: typeof subX === "number" ? subX : defaultSubX,
            subY: typeof subY === "number" ? subY : defaultSubY
        });
        if (state.ecsIndex !== update.ecsIndex) {
            state.setEcsIndex(update.ecsIndex);
        }
        const running = !!update.running;
        const serverSubX = typeof subX === "number" ? subX | 0 : undefined;
        const serverSubY = typeof subY === "number" ? subY | 0 : undefined;
        const forcedTeleport = isFirstAppearance || !!update.snap;
        let fromTile = {
            x: state.tileX,
            y: state.tileY
        };
        if (!forcedTeleport && directions.length > 0) {
            let startX = initialTile.x | 0;
            let startY = initialTile.y | 0;
            for (const direction of directions){
                const delta = directionToDelta(direction & 7);
                startX -= delta.dx;
                startY -= delta.dy;
            }
            fromTile = {
                x: startX | 0,
                y: startY | 0
            };
        }
        let tile = initialTile;
        let finalSubX = typeof serverSubX === "number" ? serverSubX : (tile.x << 7) + 64;
        let finalSubY = typeof serverSubY === "number" ? serverSubY : (tile.y << 7) + 64;
        const destTile = initialTile;
        const dxToDest = destTile.x - fromTile.x | 0;
        const dyToDest = destTile.y - fromTile.y | 0;
        const chebyshevDist = Math.max(Math.abs(dxToDest), Math.abs(dyToDest)) | 0;
        const isRunDisplacement = running || traversals.some((t)=>(t | 0) === 2);
        let path;
        if (!forcedTeleport && isRunDisplacement && chebyshevDist > 0 && chebyshevDist <= 2 && typeof this.getCollisionFlagAt === "function") {
            path = this.buildRunTargetPath(fromTile, destTile, update.level | 0);
            tile = destTile;
            finalSubX = typeof serverSubX === "number" ? serverSubX : (destTile.x << 7) + 64;
            finalSubY = typeof serverSubY === "number" ? serverSubY : (destTile.y << 7) + 64;
        } else if (directions.length > 0 && !forcedTeleport) {
            const steps = [];
            let currX = fromTile.x;
            let currY = fromTile.y;
            for(let i = 0; i < directions.length; i++){
                const direction = directions[i] & 7;
                const delta = directionToDelta(direction);
                currX += delta.dx;
                currY += delta.dy;
                const traversal = traversals[i];
                steps.push({
                    tile: {
                        x: currX,
                        y: currY
                    },
                    direction,
                    run: traversal === 2,
                    traversal
                });
            }
            tile = {
                x: currX,
                y: currY
            };
            finalSubX = (currX << 7) + 64;
            finalSubY = (currY << 7) + 64;
            path = new MovementPath(fromTile, tile, steps, false);
        } else if (!forcedTeleport && chebyshevDist > 0) {
            tile = destTile;
            finalSubX = typeof serverSubX === "number" ? serverSubX : (destTile.x << 7) + 64;
            finalSubY = typeof serverSubY === "number" ? serverSubY : (destTile.y << 7) + 64;
            path = new MovementPath(fromTile, tile, [], true);
        } else {
            if (serverSubX === undefined || serverSubY === undefined) {
                finalSubX = (state.tileX << 7) + 64;
                finalSubY = (state.tileY << 7) + 64;
            } else {
                finalSubX = serverSubX;
                finalSubY = serverSubY;
            }
            tile = {
                x: toTileCoord(finalSubX),
                y: toTileCoord(finalSubY)
            };
            path = new MovementPath(fromTile, tile, [], forcedTeleport);
        }
        const resolvedLevel = this.resolveTilePlane ? this.resolveTilePlane(tile.x, tile.y, update.level | 0) : update.level | 0;
        update.level = resolvedLevel;
        const teleported = forcedTeleport || path.isTeleport;
        this.applyPath(state, path, {
            subX: finalSubX,
            subY: finalSubY,
            level: resolvedLevel,
            running,
            rotation: update.rotation,
            orientation: update.orientation,
            turned: !!update.turned,
            moved: !!update.moved
        }, teleported);
        return {
            path,
            teleported
        };
    }
    applyPath(state, path, opts, teleport) {
        const ecsIndex = state.ecsIndex;
        if (!(ecsIndex >= 0)) return;
        state.setLastSteps(path.steps);
        const resolvedLevel = this.resolveTilePlane ? this.resolveTilePlane(path.to.x, path.to.y, opts.level) : opts.level;
        if (teleport) {
            this.playerEcs.teleport(ecsIndex, path.to.x, path.to.y, resolvedLevel);
            this.playerEcs.setRunning(ecsIndex, false);
            state.setTile(path.to, opts.subX, opts.subY, resolvedLevel);
            state.lastRunning = false;
            if (typeof opts.orientation === "number") {
                this.playerEcs.setTargetRot(ecsIndex, opts.orientation & 2047);
                state.lastOrientation = opts.orientation & 2047;
            } else if (typeof opts.rotation === "number") {
                this.playerEcs.setRotationImmediate(ecsIndex, opts.rotation & 2047);
                state.lastOrientation = opts.rotation & 2047;
            }
            return;
        }
        if (path.stepCount === 0) {
            this.applyOrientationOnly(state, opts);
            return;
        }
        const fromSubX = (path.from.x << 7) + 64;
        const fromSubY = (path.from.y << 7) + 64;
        const aligned = this.playerEcs.trimQueuedStepsAfter(ecsIndex, fromSubX, fromSubY);
        if (!aligned) {
            try {
                this.playerEcs.teleport(ecsIndex, path.from.x, path.from.y, resolvedLevel);
            } catch  {}
        }
        const anyRun = path.steps.some((s)=>!!s.run);
        let lastOrientation = state.lastOrientation;
        let queueOverflowed = false;
        for (const step of path.steps){
            const stepSubX = (step.tile.x << 7) + 64;
            const stepSubY = (step.tile.y << 7) + 64;
            const traversal = typeof step.traversal === "number" ? step.traversal | 0 : step.run ? 2 : 1;
            const factor = traversal === 0 ? 0.5 : traversal === 2 ? 2 : 1;
            const dirOrientation = directionToOrientation(step.direction) & 2047;
            lastOrientation = dirOrientation;
            const queued = this.playerEcs.setServerPos(ecsIndex, stepSubX, stepSubY, factor, dirOrientation);
            if (!queued) {
                queueOverflowed = true;
                break;
            }
        }
        const finalStep = path.steps[path.steps.length - 1];
        if (queueOverflowed) {
            lastOrientation = directionToOrientation(finalStep.direction) & 2047;
            try {
                this.playerEcs.clearServerQueue(ecsIndex);
                this.playerEcs.teleport(ecsIndex, finalStep.tile.x, finalStep.tile.y, resolvedLevel);
                this.playerEcs.setTargetRot(ecsIndex, lastOrientation);
            } catch  {}
        }
        const finalSubX = (finalStep.tile.x << 7) + 64;
        const finalSubY = (finalStep.tile.y << 7) + 64;
        state.setTile(finalStep.tile, finalSubX, finalSubY, resolvedLevel);
        this.playerEcs.setRunning(ecsIndex, !!opts.running);
        state.lastRunning = anyRun;
        state.lastOrientation = lastOrientation;
        const interactionOrientation = this.computeInteractionOrientation(ecsIndex);
        if (interactionOrientation !== undefined) {
            this.playerEcs.setTargetRot(ecsIndex, interactionOrientation & 2047);
            state.lastOrientation = interactionOrientation & 2047;
        }
        if (opts.moved) {
            try {
                this.animController?.cancelSequenceOnMove?.(state.serverId);
            } catch  {}
        }
    }
    updateInteractionRotations() {
        for (const [, state] of this.states){
            const ecsIndex = state.ecsIndex;
            if (!(ecsIndex >= 0)) continue;
            const interactionOrientation = this.computeInteractionOrientation(ecsIndex);
            if (interactionOrientation !== undefined) {
                const rot = interactionOrientation & 2047;
                this.playerEcs.setTargetRot(ecsIndex, rot);
                state.lastOrientation = rot;
            }
            const isMoving = this.playerEcs.isMoving(ecsIndex);
            if (!isMoving) {
                this.playerEcs.resetMovementDelay?.(ecsIndex);
            }
        }
    }
    applyOrientationOnly(state, opts) {
        const ecsIndex = state.ecsIndex;
        if (!(ecsIndex >= 0)) return;
        const resolvedLevel = this.resolveTilePlane ? this.resolveTilePlane(state.tileX, state.tileY, opts.level) : opts.level;
        state.setTile({
            x: state.tileX,
            y: state.tileY
        }, opts.subX, opts.subY, resolvedLevel);
        this.playerEcs.setRunning(ecsIndex, !!opts.running);
        const isMoving = this.playerEcs.isMoving(ecsIndex);
        if (!isMoving) {
            state.lastRunning = !!opts.running;
            const interactionOrientation = this.computeInteractionOrientation(ecsIndex);
            const orientation = interactionOrientation !== undefined ? interactionOrientation : typeof opts.orientation === "number" ? opts.orientation & 2047 : typeof opts.rotation === "number" ? opts.rotation & 2047 : undefined;
            if (orientation !== undefined) {
                this.playerEcs.setTargetRot(ecsIndex, orientation);
                state.lastOrientation = orientation;
            }
        }
    }
    computeInteractionOrientation(ecsIndex) {
        try {
            const rawIndex = this.playerEcs.getInteractionIndex(ecsIndex);
            if (typeof rawIndex !== "number" || rawIndex < 0) return undefined;
            const decoded = decodeInteractionIndex(rawIndex);
            if (!decoded) return undefined;
            const selfPos = this.samplePlayerVisualPosition(ecsIndex);
            if (!selfPos) return undefined;
            let targetX;
            let targetY;
            if (decoded.type === "player") {
                const targetIdx = this.playerEcs.getIndexForServerId(decoded.id | 0);
                if (targetIdx !== undefined) {
                    const pos = this.samplePlayerVisualPosition(targetIdx);
                    if (pos) {
                        targetX = pos.x;
                        targetY = pos.y;
                    }
                }
            } else if (decoded.type === "npc" && this.npcEcs) {
                const npcIdx = this.npcEcs.getEcsIdForServer(decoded.id | 0);
                if (npcIdx !== undefined) {
                    const mapId = this.npcEcs.getMapId(npcIdx) | 0;
                    const mapX = mapId >> 8 & 0xff;
                    const mapY = mapId & 0xff;
                    const localX = this.npcEcs.getX(npcIdx) | 0;
                    const localY = this.npcEcs.getY(npcIdx) | 0;
                    targetX = (mapX << 13) + localX;
                    targetY = (mapY << 13) + localY;
                }
            }
            if (targetX === undefined || targetY === undefined) return undefined;
            if ((selfPos.x | 0) === (targetX | 0) && (selfPos.y | 0) === (targetY | 0)) return undefined;
            return faceAngleRs(selfPos.x | 0, selfPos.y | 0, targetX | 0, targetY | 0);
        } catch  {
            return undefined;
        }
    }
    samplePlayerVisualPosition(ecsIndex) {
        const x = this.playerEcs.getX(ecsIndex);
        const y = this.playerEcs.getY(ecsIndex);
        const sampleX = typeof x === "number" ? x | 0 : 0;
        const sampleY = typeof y === "number" ? y | 0 : 0;
        if (!Number.isFinite(sampleX) || !Number.isFinite(sampleY)) return undefined;
        return {
            x: sampleX | 0,
            y: sampleY | 0
        };
    }
    buildRunTargetPath(from, dest, plane) {
        const steps = [];
        let currX = from.x | 0;
        let currY = from.y | 0;
        const count = this.routeFinder.findRouteSize1(currX, currY, dest.x | 0, dest.y | 0, plane | 0, this.getCollisionFlagAt, true);
        const intermediateCount = count > 0 ? Math.max(0, count - 1 | 0) : 0;
        for(let i = 0; i < intermediateCount; i++){
            const nextX = this.routeFinder.outX[i] | 0;
            const nextY = this.routeFinder.outY[i] | 0;
            const direction = deltaToDirection(Math.sign(nextX - currX), Math.sign(nextY - currY));
            if (direction === undefined) continue;
            currX = nextX;
            currY = nextY;
            steps.push({
                tile: {
                    x: currX,
                    y: currY
                },
                direction,
                run: true,
                traversal: 2
            });
        }
        const finalDirection = deltaToDirection(Math.sign((dest.x | 0) - currX), Math.sign((dest.y | 0) - currY));
        if (finalDirection !== undefined) {
            steps.push({
                tile: {
                    x: dest.x | 0,
                    y: dest.y | 0
                },
                direction: finalDirection,
                run: true,
                traversal: 2
            });
        }
        return new MovementPath(from, dest, steps, false);
    }
    getState(serverId) {
        return this.states.get(serverId);
    }
    getAllServerIds() {
        return Array.from(this.states.keys());
    }
    getLastSteps(serverId) {
        const state = this.states.get(serverId);
        return state ? state.getLastSteps() : [];
    }
}
