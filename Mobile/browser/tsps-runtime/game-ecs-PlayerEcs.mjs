// Generated from pinned RSPSApp/tsps: client/game/ecs/PlayerEcs.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
import { NO_INTERACTION, decodeInteractionIndex } from "./rs-interaction-InteractionIndex.mjs";
import { faceAngleRs } from "./rs-utils-rotation.mjs";
const FIRST_PERSON_ARMS_BACK_OFFSET = 32;
export class PlayerEcs {
    capacity = 0;
    count = 0;
    clientCycle = 0;
    static DEFAULT_SERVER_TICK_MS = 600;
    static MIN_SPEED_SCALE = 0.25;
    static MAX_SPEED_SCALE = 4.0;
    serverTickMs = PlayerEcs.DEFAULT_SERVER_TICK_MS;
    walkSpeedMultiplier = 1.0;
    runSpeedMultiplier = 1.0;
    clientTickDurationMs = 20;
    speedScale = 1;
    serverIdToIndex = new Map();
    indexToServerId = new Map();
    freeIndices = [];
    x;
    y;
    prevX;
    prevY;
    level;
    rotation;
    targetRot;
    stall;
    rotationCounter;
    movementDelayCounter;
    targetX;
    targetY;
    running;
    walkSpeed;
    runSpeed;
    rotationSpeed;
    rotationAccel;
    rotationVel;
    faceSubX;
    faceSubY;
    faceDir;
    faceInstant;
    animTick;
    animSeqId;
    animActionSeqId;
    animMovementSeqId;
    animSeqFrame;
    animSeqFrameCycle;
    animFrameCount;
    animIsSkeletal;
    animBaseCenterX;
    animBaseCenterZ;
    animPhaseBias;
    animDistTraveled;
    animSeqDelay;
    animLoopCounter;
    animIdleSeq;
    animWalkSeq;
    animWalkBackSeq;
    animWalkLeftSeq;
    animWalkRightSeq;
    animRunSeq;
    animRunBackSeq;
    animRunLeftSeq;
    animRunRightSeq;
    animCrawlSeq;
    animCrawlBackSeq;
    animCrawlLeftSeq;
    animCrawlRightSeq;
    animTurnLeftSeq;
    animTurnRightSeq;
    defaultAnimSet = {};
    movementDebugEnabled = false;
    movementDebugSink;
    telemetrySampleSource = "clientTick";
    telemetryClockProvider;
    worldViewId;
    dwellTileX;
    dwellTileY;
    dwellTicks;
    names = [];
    nameToIndex = new Map();
    appearances = [];
    combatLevels;
    teams;
    hidden;
    baseModels = [];
    modelIndicesCount;
    modelIndicesCountAlpha;
    occTileX;
    occTileY;
    occPlane;
    occMapX;
    occMapY;
    forcedMovementCounter;
    forcedMovementSteps;
    forcedMoveStartCycle;
    forcedMoveEndCycle;
    forcedMoveStartX;
    forcedMoveStartY;
    forcedMoveEndX;
    forcedMoveEndY;
    forcedMoveTargetRot;
    serverInterpEnabled = true;
    srvLastX;
    srvLastY;
    srvNextX;
    srvNextY;
    srvT;
    srvStepPerClientTick = 1 / 30;
    srvSegFactor;
    srvPendingValid;
    srvPendingX;
    srvPendingY;
    srvPendingFactor;
    srvOverrun;
    movingHold;
    srvArrivedHeld;
    stepParity;
    srvSnapDX;
    srvSnapDY;
    srvSnapTicks;
    static MAX_INTERP_QUEUE = 32;
    srvQueueX;
    srvQueueY;
    srvQueueFactor;
    srvQueueRot;
    srvQueueHead;
    srvQueueTail;
    srvQueueLen;
    srvChainActive;
    interactionIndex;
    appearanceBaseCache = new Map();
    overheadText = [];
    overheadColorId;
    overheadEffect;
    overheadPattern;
    overheadCycle;
    overheadDuration;
    overheadModIcon;
    headIconPrayer;
    headIconPk;
    colorOverrideHue;
    colorOverrideSat;
    colorOverrideLum;
    colorOverrideAmount;
    colorOverrideStartCycle;
    colorOverrideEndCycle;
    seqTypeLoader;
    interactionOrientationProvider;
    constructor(initialCapacity = 16){
        this.ensureCapacity(initialCapacity);
    }
    setSeqTypeLoader(loader) {
        this.seqTypeLoader = loader;
    }
    setInteractionOrientationProvider(provider) {
        this.interactionOrientationProvider = provider;
    }
    getIndexForServerId(serverId) {
        return this.serverIdToIndex.get(serverId);
    }
    getServerIdForIndex(index) {
        return this.indexToServerId.get(index);
    }
    getAllServerIds() {
        return this.serverIdToIndex.keys();
    }
    getAllActiveIndices() {
        return this.serverIdToIndex.values();
    }
    reassignServerId(oldId, newId) {
        if (oldId === newId) return this.serverIdToIndex.get(oldId);
        const idx = this.serverIdToIndex.get(oldId);
        if (idx === undefined) return this.serverIdToIndex.get(newId);
        const existingNew = this.serverIdToIndex.get(newId);
        if (existingNew !== undefined) return existingNew;
        this.serverIdToIndex.delete(oldId);
        this.serverIdToIndex.set(newId, idx);
        this.indexToServerId.set(idx, newId);
        return idx;
    }
    allocatePlayer(serverId) {
        const existing = this.serverIdToIndex.get(serverId);
        if (existing !== undefined) return existing;
        let index;
        if (this.freeIndices.length > 0) {
            index = this.freeIndices.pop();
        } else {
            index = this.count;
            this.count++;
            this.ensureCapacity(this.count);
        }
        this.serverIdToIndex.set(serverId, index);
        this.indexToServerId.set(index, serverId);
        this.x[index] = 0;
        this.y[index] = 0;
        this.prevX[index] = 0;
        this.prevY[index] = 0;
        this.level[index] = 0;
        this.rotation[index] = 0;
        this.targetRot[index] = 0;
        this.faceSubX[index] = -1;
        this.faceSubY[index] = -1;
        this.faceDir[index] = -1;
        this.faceInstant[index] = 0;
        this.walkSpeed[index] = 4;
        this.runSpeed[index] = 8;
        this.rotationSpeed[index] = 32;
        this.rotationAccel[index] = 8;
        this.animSeqId[index] = -1;
        this.animSeqFrame[index] = 0;
        this.animSeqFrameCycle[index] = 0;
        this.animFrameCount[index] = 1;
        this.animIsSkeletal[index] = 0;
        this.animBaseCenterX[index] = 0;
        this.animBaseCenterZ[index] = 0;
        this.animPhaseBias[index] = 0.0;
        this.animDistTraveled[index] = 0.0;
        this.worldViewId[index] = -1;
        this.removeNameMapping(index);
        this.names[index] = undefined;
        this.appearances[index] = undefined;
        this.combatLevels[index] = 0;
        this.teams[index] = 0;
        this.hidden[index] = 0;
        this.baseModels[index] = undefined;
        this.modelIndicesCount[index] = 0;
        this.modelIndicesCountAlpha[index] = 0;
        this.srvQueueHead[index] = 0;
        this.srvQueueTail[index] = 0;
        this.srvQueueLen[index] = 0;
        this.srvChainActive[index] = 0;
        this.srvSnapDX[index] = 0;
        this.srvSnapDY[index] = 0;
        this.srvSnapTicks[index] = 0;
        this.clearForcedMovement(index);
        this.setAnimSet(index, undefined, {
            mergeWithDefault: true
        });
        this.clearOverheadChat(index);
        const tx = this.x[index] >> 7 | 0;
        const ty = this.y[index] >> 7 | 0;
        this.dwellTileX[index] = tx;
        this.dwellTileY[index] = ty;
        this.dwellTicks[index] = 0;
        return index;
    }
    deallocatePlayer(serverId) {
        const index = this.serverIdToIndex.get(serverId);
        if (index === undefined) return;
        this.serverIdToIndex.delete(serverId);
        this.indexToServerId.delete(index);
        this.freeIndices.push(index);
        if (this.occPlane) this.occPlane[index] = 255;
        this.removeNameMapping(index);
        this.names[index] = undefined;
        this.appearances[index] = undefined;
        this.combatLevels[index] = 0;
        this.teams[index] = 0;
        this.hidden[index] = 0;
        this.baseModels[index] = undefined;
        this.modelIndicesCount[index] = 0;
        this.modelIndicesCountAlpha[index] = 0;
        if (this.interactionIndex) this.interactionIndex[index] = NO_INTERACTION;
        this.clearOverheadChat(index);
    }
    reset() {
        const serverIds = Array.from(this.serverIdToIndex.keys());
        for (const serverId of serverIds){
            this.deallocatePlayer(serverId);
        }
        this.serverIdToIndex.clear();
        this.indexToServerId.clear();
        this.nameToIndex.clear();
        this.freeIndices.length = 0;
        this.count = 0;
        for(let i = 0; i < this.capacity; i++){
            this.names[i] = undefined;
            this.appearances[i] = undefined;
            this.baseModels[i] = undefined;
            if (this.combatLevels) this.combatLevels[i] = 0;
            if (this.teams) this.teams[i] = 0;
            if (this.hidden) this.hidden[i] = 0;
        }
        this.cleanupAppearanceCache();
        this.clientCycle = 0;
        console.log("[PlayerEcs] Reset complete - all players cleared");
    }
    ensureCapacity(min) {
        if (this.capacity >= min) return;
        const oldCap = this.capacity | 0;
        const newCap = Math.max(min, Math.max(16, this.capacity * 2));
        const grow = (arr, ctor)=>{
            const next = new ctor(newCap);
            if (arr) next.set(arr, 0);
            return next;
        };
        this.x = grow(this.x, Int32Array);
        this.y = grow(this.y, Int32Array);
        this.prevX = grow(this.prevX, Int32Array);
        this.prevY = grow(this.prevY, Int32Array);
        this.level = grow(this.level, Uint8Array);
        this.rotation = grow(this.rotation, Uint16Array);
        this.targetRot = grow(this.targetRot, Uint16Array);
        this.stall = grow(this.stall, Uint8Array);
        this.rotationCounter = grow(this.rotationCounter, Uint8Array);
        this.movementDelayCounter = grow(this.movementDelayCounter, Uint8Array);
        this.targetX = grow(this.targetX, Int32Array);
        this.targetY = grow(this.targetY, Int32Array);
        this.running = grow(this.running, Uint8Array);
        this.walkSpeed = grow(this.walkSpeed, Uint8Array);
        this.runSpeed = grow(this.runSpeed, Uint8Array);
        this.rotationSpeed = grow(this.rotationSpeed, Uint16Array);
        this.rotationAccel = grow(this.rotationAccel, Uint8Array);
        this.rotationVel = grow(this.rotationVel, Uint16Array);
        this.faceSubX = grow(this.faceSubX, Int32Array);
        this.faceSubY = grow(this.faceSubY, Int32Array);
        this.faceDir = grow(this.faceDir, Int16Array);
        this.faceInstant = grow(this.faceInstant, Uint8Array);
        this.animTick = grow(this.animTick, Uint16Array);
        this.animSeqId = grow(this.animSeqId, Int32Array);
        this.animActionSeqId = grow(this.animActionSeqId, Int32Array);
        this.animMovementSeqId = grow(this.animMovementSeqId, Int32Array);
        this.animSeqFrame = grow(this.animSeqFrame, Int32Array);
        this.animSeqFrameCycle = grow(this.animSeqFrameCycle, Int32Array);
        this.animFrameCount = grow(this.animFrameCount, Uint16Array);
        this.animIsSkeletal = grow(this.animIsSkeletal, Uint8Array);
        this.animBaseCenterX = grow(this.animBaseCenterX, Int32Array);
        this.animBaseCenterZ = grow(this.animBaseCenterZ, Int32Array);
        this.animPhaseBias = grow(this.animPhaseBias, Float32Array);
        this.animDistTraveled = grow(this.animDistTraveled, Float32Array);
        this.animSeqDelay = grow(this.animSeqDelay, Uint8Array);
        this.animLoopCounter = grow(this.animLoopCounter, Uint8Array);
        this.animIdleSeq = grow(this.animIdleSeq, Int32Array);
        this.animWalkSeq = grow(this.animWalkSeq, Int32Array);
        this.animWalkBackSeq = grow(this.animWalkBackSeq, Int32Array);
        this.animWalkLeftSeq = grow(this.animWalkLeftSeq, Int32Array);
        this.animWalkRightSeq = grow(this.animWalkRightSeq, Int32Array);
        this.animRunSeq = grow(this.animRunSeq, Int32Array);
        this.animRunBackSeq = grow(this.animRunBackSeq, Int32Array);
        this.animRunLeftSeq = grow(this.animRunLeftSeq, Int32Array);
        this.animRunRightSeq = grow(this.animRunRightSeq, Int32Array);
        this.animCrawlSeq = grow(this.animCrawlSeq, Int32Array);
        this.animCrawlBackSeq = grow(this.animCrawlBackSeq, Int32Array);
        this.animCrawlLeftSeq = grow(this.animCrawlLeftSeq, Int32Array);
        this.animCrawlRightSeq = grow(this.animCrawlRightSeq, Int32Array);
        this.animTurnLeftSeq = grow(this.animTurnLeftSeq, Int32Array);
        this.animTurnRightSeq = grow(this.animTurnRightSeq, Int32Array);
        this.worldViewId = grow(this.worldViewId, Int16Array);
        this.dwellTileX = grow(this.dwellTileX, Int16Array);
        this.dwellTileY = grow(this.dwellTileY, Int16Array);
        this.dwellTicks = grow(this.dwellTicks, Uint32Array);
        this.modelIndicesCount = grow(this.modelIndicesCount, Int32Array);
        this.modelIndicesCountAlpha = grow(this.modelIndicesCountAlpha, Int32Array);
        this.srvLastX = grow(this.srvLastX, Int32Array);
        this.srvLastY = grow(this.srvLastY, Int32Array);
        this.srvNextX = grow(this.srvNextX, Int32Array);
        this.srvNextY = grow(this.srvNextY, Int32Array);
        this.srvT = grow(this.srvT, Float32Array);
        this.srvSegFactor = grow(this.srvSegFactor, Float32Array);
        this.srvPendingValid = grow(this.srvPendingValid, Uint8Array);
        this.srvPendingX = grow(this.srvPendingX, Int32Array);
        this.srvPendingY = grow(this.srvPendingY, Int32Array);
        this.srvPendingFactor = grow(this.srvPendingFactor, Float32Array);
        this.srvOverrun = grow(this.srvOverrun, Float32Array);
        this.movingHold = grow(this.movingHold, Uint8Array);
        this.srvArrivedHeld = grow(this.srvArrivedHeld, Uint8Array);
        this.stepParity = grow(this.stepParity, Uint8Array);
        this.srvSnapDX = grow(this.srvSnapDX, Int16Array);
        this.srvSnapDY = grow(this.srvSnapDY, Int16Array);
        this.srvSnapTicks = grow(this.srvSnapTicks, Uint8Array);
        this.forcedMovementCounter = grow(this.forcedMovementCounter, Uint8Array);
        this.forcedMovementSteps = grow(this.forcedMovementSteps, Uint8Array);
        this.forcedMoveStartCycle = grow(this.forcedMoveStartCycle, Uint32Array);
        this.forcedMoveEndCycle = grow(this.forcedMoveEndCycle, Uint32Array);
        this.forcedMoveStartX = grow(this.forcedMoveStartX, Int32Array);
        this.forcedMoveStartY = grow(this.forcedMoveStartY, Int32Array);
        this.forcedMoveEndX = grow(this.forcedMoveEndX, Int32Array);
        this.forcedMoveEndY = grow(this.forcedMoveEndY, Int32Array);
        this.forcedMoveTargetRot = grow(this.forcedMoveTargetRot, Uint16Array);
        const qcap = PlayerEcs.MAX_INTERP_QUEUE;
        const growQueue = (arr, ctor)=>{
            const next = new ctor(newCap * qcap);
            if (arr) {
                for(let i = 0; i < oldCap; i++){
                    const srcOff = i * qcap;
                    const dstOff = i * qcap;
                    next.set(arr.subarray(srcOff, srcOff + qcap), dstOff);
                }
            }
            return next;
        };
        this.srvQueueX = growQueue(this.srvQueueX, Int32Array);
        this.srvQueueY = growQueue(this.srvQueueY, Int32Array);
        this.srvQueueFactor = growQueue(this.srvQueueFactor, Float32Array);
        this.srvQueueRot = growQueue(this.srvQueueRot, Int32Array);
        this.srvQueueHead = grow(this.srvQueueHead, Uint8Array);
        this.srvQueueTail = grow(this.srvQueueTail, Uint8Array);
        this.srvQueueLen = grow(this.srvQueueLen, Uint8Array);
        this.srvChainActive = grow(this.srvChainActive, Uint8Array);
        this.combatLevels = grow(this.combatLevels, Uint8Array);
        this.teams = grow(this.teams, Uint8Array);
        this.hidden = grow(this.hidden, Uint8Array);
        this.overheadColorId = grow(this.overheadColorId, Uint8Array);
        this.overheadEffect = grow(this.overheadEffect, Uint8Array);
        this.overheadCycle = grow(this.overheadCycle, Uint16Array);
        this.overheadDuration = grow(this.overheadDuration, Uint16Array);
        this.overheadModIcon = grow(this.overheadModIcon, Int16Array);
        this.headIconPrayer = grow(this.headIconPrayer, Int8Array);
        this.headIconPk = grow(this.headIconPk, Int8Array);
        this.colorOverrideHue = grow(this.colorOverrideHue, Uint8Array);
        this.colorOverrideSat = grow(this.colorOverrideSat, Uint8Array);
        this.colorOverrideLum = grow(this.colorOverrideLum, Uint8Array);
        this.colorOverrideAmount = grow(this.colorOverrideAmount, Uint8Array);
        this.colorOverrideStartCycle = grow(this.colorOverrideStartCycle, Int32Array);
        this.colorOverrideEndCycle = grow(this.colorOverrideEndCycle, Int32Array);
        this.interactionIndex = grow(this.interactionIndex, Int32Array);
        const prevOccPlane = this.occPlane;
        this.occTileX = grow(this.occTileX, Uint8Array);
        this.occTileY = grow(this.occTileY, Uint8Array);
        this.occPlane = grow(this.occPlane, Uint8Array);
        this.occMapX = grow(this.occMapX, Uint8Array);
        this.occMapY = grow(this.occMapY, Uint8Array);
        if (prevOccPlane !== this.occPlane) {
            for(let i = this.capacity; i < newCap; i++)this.occPlane[i] = 255;
        }
        for(let i = this.capacity; i < newCap; i++){
            if (this.interactionIndex) this.interactionIndex[i] = NO_INTERACTION;
        }
        const initAnimArray = (arr)=>{
            if (!arr) return;
            for(let i = oldCap; i < newCap; i++)arr[i] = -1;
        };
        initAnimArray(this.animIdleSeq);
        initAnimArray(this.animWalkSeq);
        initAnimArray(this.animWalkBackSeq);
        initAnimArray(this.animWalkLeftSeq);
        initAnimArray(this.animWalkRightSeq);
        initAnimArray(this.animRunSeq);
        initAnimArray(this.animRunBackSeq);
        initAnimArray(this.animRunLeftSeq);
        initAnimArray(this.animRunRightSeq);
        initAnimArray(this.animCrawlSeq);
        initAnimArray(this.animCrawlBackSeq);
        initAnimArray(this.animCrawlLeftSeq);
        initAnimArray(this.animCrawlRightSeq);
        initAnimArray(this.animTurnLeftSeq);
        initAnimArray(this.animTurnRightSeq);
        this.capacity = newCap;
        for(let i = oldCap; i < newCap; i++){
            this.faceSubX[i] = -1;
            this.faceSubY[i] = -1;
            this.faceDir[i] = -1;
            this.faceInstant[i] = 0;
            this.overheadColorId[i] = 0;
            this.overheadEffect[i] = 0;
            this.overheadCycle[i] = 0;
            this.overheadDuration[i] = 0;
            this.overheadModIcon[i] = -1;
            this.overheadText[i] = undefined;
            this.headIconPrayer[i] = -1;
            this.headIconPk[i] = -1;
        }
    }
    size() {
        return this.count;
    }
    getActiveCount() {
        return this.serverIdToIndex.size;
    }
    getX(i) {
        return this.x[i] | 0;
    }
    getY(i) {
        return this.y[i] | 0;
    }
    getPrevX(i) {
        return this.prevX[i] | 0;
    }
    getPrevY(i) {
        return this.prevY[i] | 0;
    }
    getWorldViewId(i) {
        return this.worldViewId[i] | 0;
    }
    setWorldViewId(i, viewId) {
        this.worldViewId[i] = viewId | 0;
    }
    getLevel(i) {
        return this.level[i] | 0;
    }
    setLevel(i, lvl) {
        const v = (lvl | 0) & 3;
        this.level[i] = v;
        if (this.occPlane) this.occPlane[i] = v & 255;
    }
    getRotation(i) {
        return this.rotation[i] | 0;
    }
    getTargetRotation(i) {
        return this.targetRot[i] | 0;
    }
    getRotationCounter(i) {
        return this.rotationCounter[i] | 0;
    }
    incrementRotationCounter(i) {
        this.rotationCounter[i] = Math.min(255, (this.rotationCounter[i] ?? 0) + 1);
    }
    resetRotationCounter(i) {
        this.rotationCounter[i] = 0;
    }
    getMovementDelayCounter(i) {
        return this.movementDelayCounter[i] | 0;
    }
    incrementMovementDelay(i) {
        this.movementDelayCounter[i] = Math.min(255, (this.movementDelayCounter[i] ?? 0) + 1);
    }
    decrementMovementDelay(i) {
        if (this.movementDelayCounter[i] > 0) {
            this.movementDelayCounter[i]--;
        }
    }
    resetMovementDelay(i) {
        this.movementDelayCounter[i] = 0;
    }
    getAnimSeqDelay(i) {
        return (this.animSeqDelay?.[i] ?? 0) | 0;
    }
    setAnimSeqDelay(i, delay) {
        if (this.animSeqDelay) this.animSeqDelay[i] = Math.max(0, delay | 0) & 0xff;
    }
    decrementAnimSeqDelay(i) {
        if (this.animSeqDelay && this.animSeqDelay[i] > 0) {
            this.animSeqDelay[i]--;
        }
    }
    getAnimLoopCounter(i) {
        return (this.animLoopCounter?.[i] ?? 0) | 0;
    }
    setAnimLoopCounter(i, count) {
        if (this.animLoopCounter) this.animLoopCounter[i] = Math.max(0, count | 0) & 0xff;
    }
    incrementAnimLoopCounter(i) {
        if (this.animLoopCounter) {
            this.animLoopCounter[i] = Math.min(255, (this.animLoopCounter[i] ?? 0) + 1);
        }
    }
    resetAnimLoopCounter(i) {
        if (this.animLoopCounter) this.animLoopCounter[i] = 0;
    }
    getForcedMovementSteps(i) {
        return (this.forcedMovementSteps?.[i] ?? 0) | 0;
    }
    setForcedMovementSteps(i, steps) {
        if (this.forcedMovementSteps) this.forcedMovementSteps[i] = Math.max(0, steps | 0) & 0xff;
    }
    decrementForcedMovementSteps(i) {
        if (this.forcedMovementSteps && this.forcedMovementSteps[i] > 0) {
            this.forcedMovementSteps[i]--;
        }
    }
    startForcedMovement(i, startCycle, endCycle, startX, startY, endX, endY, targetRot) {
        this.clearServerQueue(i);
        this.srvLastX[i] = this.srvNextX[i] = this.targetX[i] = endX | 0;
        this.srvLastY[i] = this.srvNextY[i] = this.targetY[i] = endY | 0;
        this.forcedMoveStartCycle[i] = startCycle >>> 0;
        this.forcedMoveEndCycle[i] = endCycle >>> 0;
        this.forcedMoveStartX[i] = startX | 0;
        this.forcedMoveStartY[i] = startY | 0;
        this.forcedMoveEndX[i] = endX | 0;
        this.forcedMoveEndY[i] = endY | 0;
        this.forcedMoveTargetRot[i] = targetRot & 2047 | 0;
    }
    isForcedMovementActive(i, currentCycle) {
        const endCycle = this.forcedMoveEndCycle?.[i] ?? 0;
        return endCycle > 0 && currentCycle <= endCycle;
    }
    getForcedMoveStartCycle(i) {
        return (this.forcedMoveStartCycle?.[i] ?? 0) >>> 0;
    }
    getForcedMoveEndCycle(i) {
        return (this.forcedMoveEndCycle?.[i] ?? 0) >>> 0;
    }
    clearForcedMovement(i) {
        if (this.forcedMoveStartCycle) this.forcedMoveStartCycle[i] = 0;
        if (this.forcedMoveEndCycle) this.forcedMoveEndCycle[i] = 0;
        if (this.forcedMoveStartX) this.forcedMoveStartX[i] = 0;
        if (this.forcedMoveStartY) this.forcedMoveStartY[i] = 0;
        if (this.forcedMoveEndX) this.forcedMoveEndX[i] = 0;
        if (this.forcedMoveEndY) this.forcedMoveEndY[i] = 0;
        if (this.forcedMoveTargetRot) this.forcedMoveTargetRot[i] = 0;
    }
    getColorOverride(i) {
        return {
            hue: (this.colorOverrideHue?.[i] ?? 0) | 0,
            sat: (this.colorOverrideSat?.[i] ?? 0) | 0,
            lum: (this.colorOverrideLum?.[i] ?? 0) | 0,
            amount: (this.colorOverrideAmount?.[i] ?? 0) | 0,
            startCycle: (this.colorOverrideStartCycle?.[i] ?? 0) | 0,
            endCycle: (this.colorOverrideEndCycle?.[i] ?? 0) | 0
        };
    }
    setColorOverride(i, hue, sat, lum, amount, startCycle, endCycle) {
        if (this.colorOverrideHue) this.colorOverrideHue[i] = (hue | 0) & 0x7f;
        if (this.colorOverrideSat) this.colorOverrideSat[i] = (sat | 0) & 0x7f;
        if (this.colorOverrideLum) this.colorOverrideLum[i] = (lum | 0) & 0x7f;
        if (this.colorOverrideAmount) this.colorOverrideAmount[i] = (amount | 0) & 0xff;
        if (this.colorOverrideStartCycle) this.colorOverrideStartCycle[i] = startCycle | 0;
        if (this.colorOverrideEndCycle) this.colorOverrideEndCycle[i] = endCycle | 0;
    }
    clearColorOverride(i) {
        if (this.colorOverrideAmount) this.colorOverrideAmount[i] = 0;
    }
    applyColorOverrideToModel(i, model, currentCycle) {
        const override = this.getColorOverride(i);
        if (override.amount !== 0 && currentCycle >= override.startCycle && currentCycle < override.endCycle) {
            model.overrideHue = override.hue;
            model.overrideSaturation = override.sat;
            model.overrideLuminance = override.lum;
            model.overrideAmount = override.amount;
        } else {
            model.overrideAmount = 0;
        }
    }
    getAnimTick(i) {
        return this.animTick[i] | 0;
    }
    getAnimSeqId(i) {
        return this.animSeqId[i] | 0;
    }
    setAnimSeqId(i, seqId) {
        const next = seqId | 0;
        this.animSeqId[i] = next;
        if (this.animActionSeqId) this.animActionSeqId[i] = next;
        if (next >= 0) {
            const idleSeq = this.animIdleSeq[i] | 0;
            const walkSeq = this.animWalkSeq[i] | 0;
            const walkBackSeq = this.animWalkBackSeq[i] | 0;
            const walkLeftSeq = this.animWalkLeftSeq[i] | 0;
            const walkRightSeq = this.animWalkRightSeq[i] | 0;
            const runSeq = this.animRunSeq[i] | 0;
            const runBackSeq = this.animRunBackSeq[i] | 0;
            const runLeftSeq = this.animRunLeftSeq[i] | 0;
            const runRightSeq = this.animRunRightSeq[i] | 0;
            const crawlSeq = this.animCrawlSeq[i] | 0;
            const crawlBackSeq = this.animCrawlBackSeq[i] | 0;
            const crawlLeftSeq = this.animCrawlLeftSeq[i] | 0;
            const crawlRightSeq = this.animCrawlRightSeq[i] | 0;
            const isMovementSeq = next === idleSeq || next === walkSeq || next === walkBackSeq || next === walkLeftSeq || next === walkRightSeq || next === runSeq || next === runBackSeq || next === runLeftSeq || next === runRightSeq || next === crawlSeq || next === crawlBackSeq || next === crawlLeftSeq || next === crawlRightSeq;
            if (!isMovementSeq) {
                this.animTick[i] = 0;
                let pathLength = 0;
                try {
                    const tVal = this.srvT?.[i] ?? 1.0;
                    if (tVal < 1.0) pathLength++;
                } catch  {}
                try {
                    pathLength += this._queueLen(i) | 0;
                } catch  {}
                this.forcedMovementSteps[i] = Math.max(0, Math.min(255, pathLength | 0)) & 0xff;
            }
        } else {
            this.forcedMovementSteps[i] = 0;
            if (this.animSeqDelay) this.animSeqDelay[i] = 0;
            if (this.animActionSeqId) this.animActionSeqId[i] = -1;
            this.animTick[i] = 0;
            this.animSeqFrame[i] = 0;
            this.animSeqFrameCycle[i] = 0;
        }
    }
    getAnimSeqFrame(i) {
        return this.animSeqFrame[i] | 0;
    }
    setAnimSeqFrame(i, frame) {
        this.animSeqFrame[i] = frame | 0;
    }
    getAnimSeqFrameCycle(i) {
        return this.animSeqFrameCycle[i] | 0;
    }
    setAnimSeqFrameCycle(i, cycle) {
        this.animSeqFrameCycle[i] = cycle | 0;
    }
    getAnimActionSeqId(i) {
        return this.animActionSeqId[i] | 0;
    }
    setAnimActionSeqId(i, seqId) {
        const next = seqId | 0;
        this.animActionSeqId[i] = next;
        this.animSeqId[i] = next;
    }
    getAnimMovementSeqId(i) {
        return this.animMovementSeqId[i] | 0;
    }
    setAnimMovementSeqId(i, seqId) {
        this.animMovementSeqId[i] = seqId | 0;
    }
    canBlendSequences(actionMasks, movementMasks) {
        if (!actionMasks || actionMasks.length === 0) return false;
        if (!movementMasks || movementMasks.length === 0) return false;
        const actionLen = actionMasks.length;
        const movementLen = movementMasks.length;
        if (actionLen <= 4 && movementLen <= 4) {
            for(let i = 0; i < actionLen; i++){
                const actionMask = actionMasks[i];
                for(let j = 0; j < movementLen; j++){
                    if (actionMask === movementMasks[j]) {
                        return false;
                    }
                }
            }
            return true;
        }
        const actionSet = new Set(actionMasks);
        for (const maskGroup of movementMasks){
            if (actionSet.has(maskGroup)) {
                return false;
            }
        }
        return true;
    }
    incrementForcedMovement(i) {
        this.forcedMovementCounter[i] = Math.min(255, (this.forcedMovementCounter[i] ?? 0) + 1);
    }
    getAnimFrameCount(i) {
        return this.animFrameCount[i] | 0;
    }
    setAnimFrameCount(i, count) {
        this.animFrameCount[i] = Math.max(1, count | 0);
    }
    isAnimSkeletal(i) {
        return this.animIsSkeletal[i] === 1;
    }
    setAnimSkeletal(i, skeletal) {
        this.animIsSkeletal[i] = skeletal ? 1 : 0;
    }
    getAnimBasePivot(i) {
        return {
            x: this.animBaseCenterX[i] | 0,
            z: this.animBaseCenterZ[i] | 0
        };
    }
    setAnimBasePivot(i, x, z) {
        this.animBaseCenterX[i] = x | 0;
        this.animBaseCenterZ[i] = z | 0;
    }
    getAnimPhaseBias(i) {
        return this.animPhaseBias[i] || 0.0;
    }
    setAnimPhaseBias(i, bias) {
        this.animPhaseBias[i] = Math.max(0, Math.min(1, bias));
    }
    setOverheadChat(index, opts) {
        this.overheadText[index] = opts.text;
        const colorId = Math.max(0, Math.min(255, opts.color ?? 0)) | 0;
        const effectId = Math.max(0, Math.min(255, opts.effect ?? 0)) | 0;
        const duration = Math.max(1, Math.min(65535, opts.duration ?? 150)) | 0;
        const modIcon = opts.modIcon != null ? opts.modIcon | 0 : -1;
        this.overheadColorId[index] = colorId;
        this.overheadEffect[index] = effectId;
        this.overheadDuration[index] = duration;
        this.overheadCycle[index] = duration;
        this.overheadModIcon[index] = modIcon;
        (this.overheadPattern ?? (this.overheadPattern = []))[index] = opts.pattern;
    }
    clearOverheadChat(index) {
        this.overheadText[index] = undefined;
        if (this.overheadColorId) this.overheadColorId[index] = 0;
        if (this.overheadEffect) this.overheadEffect[index] = 0;
        if (this.overheadDuration) this.overheadDuration[index] = 0;
        if (this.overheadCycle) this.overheadCycle[index] = 0;
        if (this.overheadModIcon) this.overheadModIcon[index] = -1;
        if (this.overheadPattern) this.overheadPattern[index] = undefined;
    }
    getOverheadChat(index) {
        const text = this.overheadText[index];
        if (!text || text.length === 0) return undefined;
        const remaining = this.overheadCycle?.[index] ?? 0;
        if (remaining <= 0) return undefined;
        const duration = this.overheadDuration?.[index] ?? remaining;
        return {
            text,
            color: this.overheadColorId?.[index] ?? 0,
            effect: this.overheadEffect?.[index] ?? 0,
            modIcon: this.overheadModIcon?.[index] ?? -1,
            remaining,
            duration: duration > 0 ? duration : remaining,
            pattern: this.overheadPattern?.[index]
        };
    }
    getHeadIconPrayer(index) {
        const appearance = this.appearances[index];
        if (appearance?.headIcons?.prayer !== undefined) {
            return appearance.headIcons.prayer | 0;
        }
        return (this.headIconPrayer?.[index] ?? -1) | 0;
    }
    setHeadIconPrayer(index, iconId) {
        const normalized = iconId < 0 ? -1 : (iconId | 0) & 0x7f;
        if (this.headIconPrayer) this.headIconPrayer[index] = normalized;
        const appearance = this.appearances[index];
        if (appearance) {
            appearance.headIcons ??= {};
            appearance.headIcons.prayer = normalized;
        }
    }
    getHeadIconPk(index) {
        const appearance = this.appearances[index];
        if (appearance?.headIcons?.skull !== undefined) {
            return appearance.headIcons.skull | 0;
        }
        return (this.headIconPk?.[index] ?? -1) | 0;
    }
    setHeadIconPk(index, iconId) {
        const normalized = iconId < 0 ? -1 : (iconId | 0) & 0x7f;
        if (this.headIconPk) this.headIconPk[index] = normalized;
        const appearance = this.appearances[index];
        if (appearance) {
            appearance.headIcons ??= {};
            appearance.headIcons.skull = normalized;
        }
    }
    getAnimPhaseFromDistance(i) {
        const dist = this.animDistTraveled?.[i] || 0;
        const cycleLength = 128;
        return dist / cycleLength % 1.0;
    }
    updateAnimDistance(i, deltaX, deltaY) {
        const euclidDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.animDistTraveled[i] = ((this.animDistTraveled[i] || 0) + euclidDelta) % 256;
    }
    resetAnimSet(i) {
        if (i < 0 || i >= this.capacity) return;
        this.animIdleSeq[i] = -1;
        this.animWalkSeq[i] = -1;
        this.animWalkBackSeq[i] = -1;
        this.animWalkLeftSeq[i] = -1;
        this.animWalkRightSeq[i] = -1;
        this.animRunSeq[i] = -1;
        this.animRunBackSeq[i] = -1;
        this.animRunLeftSeq[i] = -1;
        this.animRunRightSeq[i] = -1;
        this.animCrawlSeq[i] = -1;
        this.animCrawlBackSeq[i] = -1;
        this.animCrawlLeftSeq[i] = -1;
        this.animCrawlRightSeq[i] = -1;
        this.animTurnLeftSeq[i] = -1;
        this.animTurnRightSeq[i] = -1;
    }
    applyAnimSetValues(i, set) {
        if (!set) return;
        const assign = (arr, val)=>{
            if (typeof val === "number" && val >= 0) arr[i] = val | 0;
        };
        assign(this.animIdleSeq, set.idle);
        assign(this.animWalkSeq, set.walk);
        assign(this.animWalkBackSeq, set.walkBack);
        assign(this.animWalkLeftSeq, set.walkLeft);
        assign(this.animWalkRightSeq, set.walkRight);
        assign(this.animRunSeq, set.run);
        assign(this.animRunBackSeq, set.runBack);
        assign(this.animRunLeftSeq, set.runLeft);
        assign(this.animRunRightSeq, set.runRight);
        assign(this.animCrawlSeq, set.crawl);
        assign(this.animCrawlBackSeq, set.crawlBack);
        assign(this.animCrawlLeftSeq, set.crawlLeft);
        assign(this.animCrawlRightSeq, set.crawlRight);
        assign(this.animTurnLeftSeq, set.turnLeft);
        assign(this.animTurnRightSeq, set.turnRight);
    }
    setAnimSet(i, set, opts = {}) {
        if (!(i >= 0 && i < this.capacity)) return;
        this.resetAnimSet(i);
        if (opts.mergeWithDefault !== false) this.applyAnimSetValues(i, this.defaultAnimSet);
        this.applyAnimSetValues(i, set);
        if (!this.isMoving(i)) {
            const idle = this.animIdleSeq[i] | 0;
            if (idle >= 0) this.animMovementSeqId[i] = idle | 0;
        }
    }
    setDefaultAnimSet(set) {
        this.defaultAnimSet = {
            ...set
        };
        for(let i = 0; i < this.count; i++)this.setAnimSet(i, undefined, {
            mergeWithDefault: true
        });
    }
    getAnimSeq(i, key) {
        if (!(i >= 0 && i < this.capacity)) return -1;
        switch(key){
            case "idle":
                return this.animIdleSeq[i] | 0;
            case "walk":
                return this.animWalkSeq[i] | 0;
            case "walkBack":
                return this.animWalkBackSeq[i] | 0;
            case "walkLeft":
                return this.animWalkLeftSeq[i] | 0;
            case "walkRight":
                return this.animWalkRightSeq[i] | 0;
            case "run":
                return this.animRunSeq[i] | 0;
            case "runBack":
                return this.animRunBackSeq[i] | 0;
            case "runLeft":
                return this.animRunLeftSeq[i] | 0;
            case "runRight":
                return this.animRunRightSeq[i] | 0;
            case "crawl":
                return this.animCrawlSeq[i] | 0;
            case "crawlBack":
                return this.animCrawlBackSeq[i] | 0;
            case "crawlLeft":
                return this.animCrawlLeftSeq[i] | 0;
            case "crawlRight":
                return this.animCrawlRightSeq[i] | 0;
            case "turnLeft":
                return this.animTurnLeftSeq[i] | 0;
            case "turnRight":
                return this.animTurnRightSeq[i] | 0;
            default:
                return -1;
        }
    }
    getName(i) {
        return this.names[i];
    }
    setName(i, name) {
        this.removeNameMapping(i);
        this.names[i] = name;
        if (name) this.nameToIndex.set(name.toLowerCase(), i);
    }
    findIndexByName(name) {
        if (!name) return undefined;
        return this.nameToIndex.get(String(name).toLowerCase());
    }
    getAppearance(i) {
        return this.appearances[i];
    }
    setAppearance(i, appearance) {
        this.appearances[i] = appearance;
    }
    getCombatLevel(i) {
        if (!(i >= 0 && i < this.capacity)) return 0;
        return this.combatLevels[i] | 0;
    }
    setCombatLevel(i, level) {
        if (!(i >= 0 && i < this.capacity)) return;
        const normalized = Number.isFinite(level) ? level | 0 : 0;
        this.combatLevels[i] = normalized < 0 ? 0 : normalized > 126 ? 126 : normalized;
    }
    getTeam(i) {
        if (!(i >= 0 && i < this.capacity)) return 0;
        return this.teams[i] | 0;
    }
    setTeam(i, team) {
        if (!(i >= 0 && i < this.capacity)) return;
        const normalized = Number.isFinite(team) ? team | 0 : 0;
        this.teams[i] = normalized > 0 ? normalized & 0xff : 0;
    }
    getIsHidden(i) {
        if (!(i >= 0 && i < this.capacity)) return false;
        return this.hidden[i] === 1;
    }
    setIsHidden(i, isHidden) {
        if (!(i >= 0 && i < this.capacity)) return;
        this.hidden[i] = isHidden ? 1 : 0;
    }
    getDefaultHeightTiles(i) {
        const appearance = this.appearances[i];
        if (!appearance) return undefined;
        const key = this.getAppearanceCacheKey(appearance);
        return this.appearanceBaseCache.get(key)?.defaultHeightTiles;
    }
    removeNameMapping(index) {
        const current = this.names[index];
        if (!current) return;
        this.nameToIndex.delete(current.toLowerCase());
    }
    getBaseModel(i) {
        return this.baseModels[i];
    }
    setBaseModel(i, model) {
        this.baseModels[i] = model;
    }
    ensureBaseForAppearance(app, deps) {
        try {
            const key = this.getAppearanceCacheKey(app);
            const existing = this.appearanceBaseCache.get(key);
            if (existing) return existing;
            const npcTransformationId = app.npcTransformationId ?? -1;
            let base;
            if (npcTransformationId >= 0) {
                const NpcModelLoader = require("../../rs/config/npctype/NpcModelLoader").NpcModelLoader;
                const nml = new NpcModelLoader(deps.npcTypeLoader, deps.modelLoader, deps.textureLoader, deps.seqTypeLoader, deps.seqFrameLoader, deps.skeletalSeqLoader, deps.varManager);
                const npcType = deps.npcTypeLoader.load(npcTransformationId);
                base = npcType ? nml.getModel(npcType, -1, -1) : undefined;
            } else {
                const PlayerModelLoader = require("../../rs/config/player/PlayerModelLoader").PlayerModelLoader;
                const pml = new PlayerModelLoader(deps.idkTypeLoader, deps.objTypeLoader, deps.modelLoader, deps.textureLoader);
                base = app.firstPersonArmsOnly ? pml.buildFirstPersonModel(app) : pml.buildStaticModelFromEquipment(app, app.equip);
            }
            if (!base) return undefined;
            if (npcTransformationId < 0) try {
                const NpcModelLoader = require("../../rs/config/npctype/NpcModelLoader").NpcModelLoader;
                const nml = new NpcModelLoader(deps.npcTypeLoader, deps.modelLoader, deps.textureLoader, deps.seqTypeLoader, deps.seqFrameLoader, deps.skeletalSeqLoader, deps.varManager);
                let manId = -1;
                const ncount = deps.npcTypeLoader.getCount();
                for(let id = 0; id < ncount; id++){
                    const t = deps.npcTypeLoader.load(id);
                    if (t && typeof t.name === "string" && t.name.toLowerCase() === "man") {
                        manId = id;
                        break;
                    }
                }
                if (manId !== -1) {
                    const manType = deps.npcTypeLoader.load(manId);
                    const manModel = nml.getModel(manType, -1, -1);
                    if (manModel) {
                        try {
                            manModel.calculateBoundsCylinder();
                            base.calculateBoundsCylinder();
                            const dY = manModel.bottomY - base.bottomY;
                            if (dY !== 0) base.translate(0, dY, 0);
                        } catch  {}
                        try {
                            manModel.calculateBounds();
                            base.calculateBounds();
                            const dX = (manModel.xMid | 0) - (base.xMid | 0);
                            const dZ = (manModel.zMid | 0) - (base.zMid | 0);
                            if ((dX | dZ) !== 0) base.translate(dX, 0, dZ);
                        } catch  {}
                    }
                }
            } catch  {}
            if (app.firstPersonArmsOnly) {
                base.translate(0, 0, FIRST_PERSON_ARMS_BACK_OFFSET);
            }
            let defaultHeightTiles = 1.0;
            try {
                base.calculateBoundsCylinder();
                defaultHeightTiles = Math.max(0.5, (base.height | 0) / 128);
            } catch  {}
            let cx = 0, cz = 0;
            try {
                base.calculateBounds();
                cx = base.xMid | 0;
                cz = base.zMid | 0;
            } catch  {}
            const rec = {
                baseModel: base,
                baseCenterX: cx,
                baseCenterZ: cz,
                defaultHeightTiles
            };
            this.appearanceBaseCache.set(key, rec);
            return rec;
        } catch  {
            return undefined;
        }
    }
    cleanupAppearanceCache(cacheKey) {
        if (cacheKey) this.appearanceBaseCache.delete(cacheKey);
        else this.appearanceBaseCache.clear();
    }
    getAppearanceCacheKey(app) {
        const equipKey = app.getEquipKey?.() ?? (Array.isArray(app.equip) ? app.equip.slice(0, 14).join(",") : "");
        return app.getCacheKey?.() ?? `${app.getHash?.().toString() ?? "0"}|${equipKey}`;
    }
    ensureBaseForIndex(i, deps) {
        try {
            const app = this.getAppearance(i);
            if (!app) return undefined;
            const rec = this.ensureBaseForAppearance(app, deps);
            if (!rec) return undefined;
            this.setBaseModel(i, rec.baseModel);
            this.setAnimBasePivot(i, rec.baseCenterX | 0, rec.baseCenterZ | 0);
            try {
                const bas = deps.basTypeLoader?.load?.(0);
                const rawSpeed = bas?.yawMaxSpeed;
                const rawAccel = bas?.yawAcceleration;
                const maxSpeed = Math.max(32, typeof rawSpeed === "number" ? rawSpeed | 0 : 0);
                const accel = Math.max(4, typeof rawAccel === "number" ? rawAccel | 0 : 0);
                this.setRotationParams(i, maxSpeed, accel);
            } catch  {}
            return rec;
        } catch  {
            return undefined;
        }
    }
    getModelIndicesCount(i) {
        return this.modelIndicesCount[i] | 0;
    }
    setModelIndicesCount(i, count) {
        this.modelIndicesCount[i] = count | 0;
    }
    getModelIndicesCountAlpha(i) {
        return this.modelIndicesCountAlpha[i] | 0;
    }
    setModelIndicesCountAlpha(i, count) {
        this.modelIndicesCountAlpha[i] = count | 0;
    }
    getStepParity(i) {
        return this.stepParity?.[i] ? 1 : 0;
    }
    getTargetX(i) {
        return this.targetX[i] | 0;
    }
    getTargetY(i) {
        return this.targetY[i] | 0;
    }
    resetAnim(i) {
        this.animTick[i] = 0;
    }
    setTargetXY(i, x, y) {
        this.targetX[i] = x | 0;
        this.targetY[i] = y | 0;
    }
    setTargetTile(i, tileX, tileY, running) {
        this.targetX[i] = ((tileX | 0) << 7) + 64;
        this.targetY[i] = ((tileY | 0) << 7) + 64;
        this.running[i] = running ? 1 : 0;
        const currTileX = this.x[i] >> 7 | 0;
        const currTileY = this.y[i] >> 7 | 0;
        let or = this.targetRot[i] | 0;
        if (currTileX < tileX) {
            if (currTileY < tileY) or = 1280;
            else if (currTileY > tileY) or = 1792;
            else or = 1536;
        } else if (currTileX > tileX) {
            if (currTileY < tileY) or = 768;
            else if (currTileY > tileY) or = 256;
            else or = 512;
        } else if (currTileY < tileY) or = 1024;
        else if (currTileY > tileY) or = 0;
        this.targetRot[i] = or & 2047;
    }
    isMoving(i) {
        const t = this.srvT?.[i] ?? 1.0;
        if (t < 0.999) return true;
        let qlen = 0;
        try {
            qlen = this._queueLen(i) | 0;
            if (qlen > 0) return true;
        } catch  {}
        try {
            const snapping = (this.srvSnapTicks?.[i] | 0) > 0;
            if (snapping && qlen > 0) return true;
        } catch  {}
        return false;
    }
    isRunning(i) {
        return this.running[i] === 1;
    }
    isRunVisual(i) {
        if (!this.serverInterpEnabled) return this.isRunning(i);
        try {
            const span = this.getServerSegTileSpan(i) | 0;
            if (span >= 2) return true;
        } catch  {}
        try {
            const f = this.srvSegFactor?.[i] || 1.0;
            if (f > 1.01) return true;
        } catch  {}
        return this.isRunning(i);
    }
    setSpeeds(i, walk, run) {
        this.walkSpeed[i] = Math.max(1, walk | 0);
        this.runSpeed[i] = Math.max(this.walkSpeed[i], run | 0);
    }
    setWalkSpeedMultiplier(scale) {
        const s = Number.isFinite(scale) ? scale : 1.0;
        this.walkSpeedMultiplier = Math.max(0.05, Math.min(8.0, s));
    }
    getWalkSpeedMultiplier() {
        return this.walkSpeedMultiplier;
    }
    setRunSpeedMultiplier(scale) {
        const s = Number.isFinite(scale) ? scale : 1.0;
        this.runSpeedMultiplier = Math.max(0.05, Math.min(8.0, s));
    }
    getRunSpeedMultiplier() {
        return this.runSpeedMultiplier;
    }
    setRunning(i, running) {
        this.running[i] = running ? 1 : 0;
    }
    getRotationSpeed(i) {
        return this.rotationSpeed[i] | 0;
    }
    setRotationSpeed(i, rs) {
        this.rotationSpeed[i] = (rs | 0) & 2047;
    }
    setRotationParams(i, maxSpeed, accel) {
        this.rotationSpeed[i] = (maxSpeed | 0) & 2047;
        this.rotationAccel[i] = Math.max(1, accel | 0);
        this.rotationVel[i] = 0;
    }
    setRotationImmediate(i, rot) {
        this.rotation[i] = (rot | 0) & 2047;
        this.rotationVel[i] = 0;
    }
    setTargetRot(i, rot) {
        this.targetRot[i] = (rot | 0) & 2047;
    }
    setFaceTileSub(i, subX, subY) {
        if (!(i >= 0 && i < this.capacity)) return;
        this.faceSubX[i] = subX | 0;
        this.faceSubY[i] = subY | 0;
    }
    setFaceDir(i, orientation, instant = false) {
        if (!(i >= 0 && i < this.capacity)) return;
        this.faceDir[i] = (orientation | 0) & 2047;
        this.faceInstant[i] = instant ? 1 : 0;
    }
    clearFaceOverrides(i) {
        this.faceInstant[i] = 0;
        this.faceDir[i] = -1;
        this.faceSubX[i] = -1;
        this.faceSubY[i] = -1;
    }
    setServerTickMs(ms) {
        const perTick = Math.max(1, ms | 0);
        this.serverTickMs = perTick;
        const base = PlayerEcs.DEFAULT_SERVER_TICK_MS;
        const scale = base > 0 ? Math.max(PlayerEcs.MIN_SPEED_SCALE, Math.min(PlayerEcs.MAX_SPEED_SCALE, base / perTick)) : 1;
        this.speedScale = scale;
        this.updateServerStepPerClientTick();
    }
    setClientTickDurationMs(ms) {
        this.clientTickDurationMs = Math.max(1, ms | 0);
        this.updateServerStepPerClientTick();
    }
    updateServerStepPerClientTick() {
        const perTick = Math.max(1, this.serverTickMs | 0);
        const clientMs = Math.max(1, this.clientTickDurationMs | 0);
        this.srvStepPerClientTick = clientMs / perTick;
    }
    clearServerQueue(i) {
        this.setForcedMovementSteps(i, 0);
        if (!this.serverInterpEnabled) return;
        if (!this.srvQueueLen || i < 0 || i >= this.capacity) return;
        this.srvQueueLen[i] = 0;
        this.srvQueueHead[i] = 0;
        this.srvQueueTail[i] = 0;
        if (this.srvT) this.srvT[i] = 1.0;
        if (this.srvOverrun) this.srvOverrun[i] = 0.0;
        if (this.srvChainActive) this.srvChainActive[i] = 0;
        if (this.movingHold) this.movingHold[i] = 0;
        if (this.srvSnapDX) this.srvSnapDX[i] = 0;
        if (this.srvSnapDY) this.srvSnapDY[i] = 0;
        if (this.srvSnapTicks) this.srvSnapTicks[i] = 0;
        if (this.srvPendingValid) this.srvPendingValid[i] = 0;
        const currX = this.x[i] | 0;
        const currY = this.y[i] | 0;
        if (this.srvLastX) this.srvLastX[i] = currX;
        if (this.srvLastY) this.srvLastY[i] = currY;
        if (this.srvNextX) this.srvNextX[i] = currX;
        if (this.srvNextY) this.srvNextY[i] = currY;
        if (this.targetX) this.targetX[i] = currX;
        if (this.targetY) this.targetY[i] = currY;
    }
    clearQueuedSteps(i) {
        if (!this.serverInterpEnabled) return;
        if (!this.srvQueueLen || i < 0 || i >= this.capacity) return;
        this.srvQueueLen[i] = 0;
        this.srvQueueHead[i] = 0;
        this.srvQueueTail[i] = 0;
    }
    trimQueuedStepsAfter(i, x, y) {
        if (!this.serverInterpEnabled) return true;
        if (!this.srvQueueLen || i < 0 || i >= this.capacity) return false;
        const targetX = x | 0;
        const targetY = y | 0;
        const t = this.srvT?.[i] ?? 1.0;
        if (t < 1.0) {
            const nextX = this.srvNextX?.[i] | 0;
            const nextY = this.srvNextY?.[i] | 0;
            if (nextX === targetX && nextY === targetY) {
                this.clearQueuedSteps(i);
                return true;
            }
        } else if ((this.srvNextX[i] | 0) === targetX && (this.srvNextY[i] | 0) === targetY) {
            this.clearQueuedSteps(i);
            return true;
        }
        const cap = PlayerEcs.MAX_INTERP_QUEUE;
        const off = i * cap;
        const head = this.srvQueueHead[i] | 0;
        const len = this.srvQueueLen[i] | 0;
        for(let n = 0; n < len; n++){
            const slot = (head + n) % cap;
            if ((this.srvQueueX[off + slot] | 0) === targetX && (this.srvQueueY[off + slot] | 0) === targetY) {
                const keep = n + 1;
                this.srvQueueLen[i] = keep & 0xff;
                this.srvQueueTail[i] = (head + keep) % cap & 0xff;
                return true;
            }
        }
        return false;
    }
    activeSegmentTargetMatches(i, subX, subY) {
        if (!this.serverInterpEnabled) return true;
        if (i < 0 || i >= this.capacity) return true;
        const t = this.srvT?.[i] ?? 1.0;
        if (t >= 1.0) return true;
        const nx = this.srvNextX?.[i] | 0;
        const ny = this.srvNextY?.[i] | 0;
        return Math.abs(nx - (subX | 0)) < 64 && Math.abs(ny - (subY | 0)) < 64;
    }
    _queuePush(i, x, y, factor, rotation) {
        const cap = PlayerEcs.MAX_INTERP_QUEUE;
        const off = i * cap;
        let head = this.srvQueueHead[i] | 0;
        let tail = this.srvQueueTail[i] | 0;
        let len = this.srvQueueLen[i] | 0;
        if (len >= cap) {
            return false;
        }
        this.srvQueueX[off + tail] = x | 0;
        this.srvQueueY[off + tail] = y | 0;
        this.srvQueueFactor[off + tail] = Math.max(0.5, factor || 1.0);
        this.srvQueueRot[off + tail] = typeof rotation === "number" ? rotation & 2047 : -1;
        tail = (tail + 1) % cap;
        len++;
        this.srvQueueHead[i] = head & 0xff;
        this.srvQueueTail[i] = tail & 0xff;
        this.srvQueueLen[i] = len & 0xff;
        return true;
    }
    _queueLen(i) {
        return this.srvQueueLen[i] | 0;
    }
    _queuePop(i) {
        const cap = PlayerEcs.MAX_INTERP_QUEUE;
        const off = i * cap;
        let head = this.srvQueueHead[i] | 0;
        let len = this.srvQueueLen[i] | 0;
        if (len <= 0) return undefined;
        const x = this.srvQueueX[off + head] | 0;
        const y = this.srvQueueY[off + head] | 0;
        const factor = this.srvQueueFactor[off + head] || 1.0;
        const rot = this.srvQueueRot[off + head] | 0;
        const rotation = rot >= 0 ? rot & 2047 : undefined;
        head = (head + 1) % cap;
        len--;
        this.srvQueueHead[i] = head & 0xff;
        this.srvQueueLen[i] = len & 0xff;
        return {
            x,
            y,
            factor,
            rotation
        };
    }
    _tryStartNextSegment(i) {
        const qlen = this._queueLen(i);
        if (qlen === 0) {
            return false;
        }
        const next = this._queuePop(i);
        if (!next) return false;
        const hasNext = Number.isFinite(this.srvT?.[i]);
        let lastX;
        let lastY;
        if (hasNext) {
            lastX = this.srvNextX[i] | 0 || this.x[i] | 0;
            lastY = this.srvNextY[i] | 0 || this.y[i] | 0;
        } else {
            lastX = this.x[i] | 0;
            lastY = this.y[i] | 0;
        }
        this.srvLastX[i] = lastX;
        this.srvLastY[i] = lastY;
        this.srvNextX[i] = next.x | 0;
        this.srvNextY[i] = next.y | 0;
        this.srvSegFactor[i] = Math.max(0.5, next.factor || 1.0);
        this.srvT[i] = 0.0;
        this.srvOverrun[i] = 0.0;
        this.movingHold[i] = 2;
        this.stepParity[i] ^= 1;
        this.srvSnapDX[i] = 0;
        this.srvSnapDY[i] = 0;
        this.srvSnapTicks[i] = 0;
        this.targetX[i] = next.x | 0;
        this.targetY[i] = next.y | 0;
        this.srvChainActive[i] = 1;
        return true;
    }
    isActionSequenceBlockingMovement(i, pathLengthLike) {
        if (!(pathLengthLike > 0)) return false;
        const currentSeq = this.animSeqId[i] | 0;
        if (currentSeq < 0) return false;
        const seqDelay = (this.animSeqDelay?.[i] ?? 0) | 0;
        if (seqDelay !== 0) return false;
        const seqType = this.seqTypeLoader?.load?.(currentSeq);
        if (!seqType) return false;
        const movingSnapshot = (this.forcedMovementSteps?.[i] ?? 0) | 0;
        const precedenceAnimating = (seqType.precedenceAnimating ?? -1) | 0;
        const priority = (seqType.priority ?? -1) | 0;
        return movingSnapshot > 0 && precedenceAnimating === 0 || movingSnapshot <= 0 && priority === 0;
    }
    onServerTick() {}
    updateClient(ticks = 1) {
        for(let t = 0; t < ticks; t++){
            this.clientCycle++;
            if (this.overheadCycle) {
                for (const idx of this.indexToServerId.keys()){
                    const i = idx | 0;
                    const remaining = this.overheadCycle[i] | 0;
                    if (remaining <= 0) continue;
                    const next = remaining - 1;
                    this.overheadCycle[i] = next;
                    if (next <= 0) this.clearOverheadChat(i);
                }
            }
            for(let i = 0; i < this.count; i++){
                try {
                    const idle = this.animIdleSeq[i] | 0;
                    if (idle >= 0) this.animMovementSeqId[i] = idle | 0;
                } catch  {}
                let forcedHandled = false;
                if (this.isForcedMovementActive(i, this.clientCycle)) {
                    const startCycle = this.forcedMoveStartCycle[i] >>> 0;
                    const endCycle = this.forcedMoveEndCycle[i] >>> 0;
                    const currentCycle = this.clientCycle >>> 0;
                    if (currentCycle <= endCycle) {
                        forcedHandled = true;
                        const startX = this.forcedMoveStartX[i] | 0;
                        const startY = this.forcedMoveStartY[i] | 0;
                        const endX = this.forcedMoveEndX[i] | 0;
                        const endY = this.forcedMoveEndY[i] | 0;
                        this.movementDelayCounter[i] = 0;
                        const targetRot = this.forcedMoveTargetRot[i] | 0;
                        this.targetRot[i] = targetRot & 2047;
                        if (startCycle >= currentCycle) {
                            const denom = Math.max(1, startCycle - currentCycle | 0);
                            const cx = this.x[i] | 0;
                            const cy = this.y[i] | 0;
                            const dx = startX - cx | 0;
                            const dy = startY - cy | 0;
                            this.x[i] = cx + Math.trunc(dx / denom) | 0;
                            this.y[i] = cy + Math.trunc(dy / denom) | 0;
                        } else {
                            let shouldUpdate = currentCycle === endCycle || (this.animSeqId[i] | 0) === -1 || ((this.animSeqDelay?.[i] ?? 0) | 0) !== 0;
                            if (!shouldUpdate) {
                                try {
                                    const seqId = this.animSeqId[i] | 0;
                                    const seqType = this.seqTypeLoader?.load?.(seqId);
                                    if (seqType && !seqType.isSkeletalSeq?.()) {
                                        const frame = this.animSeqFrame[i] | 0;
                                        const cycle = this.animSeqFrameCycle[i] | 0;
                                        const len = (seqType.frameLengths?.[frame] ?? 0) | 0;
                                        shouldUpdate = (cycle + 1 | 0) > len;
                                    } else {
                                        shouldUpdate = true;
                                    }
                                } catch  {
                                    shouldUpdate = true;
                                }
                            }
                            if (shouldUpdate) {
                                const total = endCycle - startCycle | 0;
                                const elapsed = currentCycle - startCycle | 0;
                                if (total > 0) {
                                    this.x[i] = Math.trunc((elapsed * endX + startX * (total - elapsed)) / total);
                                    this.y[i] = Math.trunc((elapsed * endY + startY * (total - elapsed)) / total);
                                }
                            }
                            this.rotation[i] = targetRot & 2047;
                        }
                    } else {
                        this.clearForcedMovement(i);
                    }
                }
                if (!forcedHandled && this.serverInterpEnabled) {
                    const snapTicks = this.srvSnapTicks?.[i] | 0;
                    if (snapTicks > 0) {
                        let dx = this.srvSnapDX[i] | 0;
                        let dy = this.srvSnapDY[i] | 0;
                        const ticksLeft = snapTicks;
                        const stepX = dx === 0 ? 0 : Math.sign(dx) * Math.max(1, Math.floor((Math.abs(dx) + ticksLeft - 1) / ticksLeft));
                        const stepY = dy === 0 ? 0 : Math.sign(dy) * Math.max(1, Math.floor((Math.abs(dy) + ticksLeft - 1) / ticksLeft));
                        this.x[i] = (this.x[i] | 0) + stepX | 0;
                        this.y[i] = (this.y[i] | 0) + stepY | 0;
                        dx -= stepX;
                        dy -= stepY;
                        this.srvSnapDX[i] = dx | 0;
                        this.srvSnapDY[i] = dy | 0;
                        const nextTicks = ticksLeft - 1;
                        this.srvSnapTicks[i] = nextTicks > 0 && (dx !== 0 || dy !== 0) ? nextTicks : 0;
                        if (this.srvSnapTicks[i] === 0) {
                            this.srvSnapDX[i] = 0;
                            this.srvSnapDY[i] = 0;
                        }
                    }
                }
                try {
                    const tVal = this.srvT?.[i] ?? 1.0;
                    if (!forcedHandled && !(tVal < 1.0)) {
                        const queued = this._queueLen(i) | 0;
                        if (queued > 0) {
                            this._tryStartNextSegment(i);
                        }
                    }
                } catch  {}
                try {
                    const pathLengthLike = ((this.srvT?.[i] ?? 1.0) < 1.0 ? 1 : 0) + (this._queueLen(i) | 0);
                    if (pathLengthLike === 0) this.movementDelayCounter[i] = 0;
                } catch  {}
                const cx = this.x[i] | 0;
                const cy = this.y[i] | 0;
                this.prevX[i] = cx;
                this.prevY[i] = cy;
                if (!forcedHandled && this.serverInterpEnabled) {
                    try {
                        const tVal = this.srvT?.[i] ?? 1.0;
                        const qlen = this._queueLen(i) | 0;
                        const snapping = (this.srvSnapTicks?.[i] | 0) > 0;
                        if (!(tVal < 1.0) && qlen === 0 && !snapping) {
                            this.movingHold[i] = 0;
                        }
                    } catch  {}
                    try {
                        const tVal = this.srvT?.[i] ?? 1.0;
                        const queued = this._queueLen(i) | 0;
                        if (!(tVal < 1.0) && queued === 0) {
                            this.srvOverrun[i] = Math.min(4.0, this.srvOverrun[i] + this.srvStepPerClientTick);
                            this.movementDelayCounter[i] = 0;
                            if (queued === 0) this.movingHold[i] = 0;
                            else if ((this.movingHold[i] | 0) > 0) this.movingHold[i]--;
                        }
                    } catch  {}
                    const segT = this.srvT?.[i] ?? 1.0;
                    const hasSegment = segT < 1.0;
                    if (hasSegment) {
                        if (this.srvOverrun) {
                            this.srvOverrun[i] = Math.max(0, this.srvOverrun[i] - 0.1);
                        }
                        const segFactor = Math.max(0.5, this.srvSegFactor?.[i] || 1.0);
                        const nx = this.srvNextX[i] | 0;
                        const ny = this.srvNextY[i] | 0;
                        let movementBlockedThisTick = false;
                        try {
                            const pathLengthLike = (segT < 1.0 ? 1 : 0) + (this._queueLen(i) | 0);
                            movementBlockedThisTick = this.isActionSequenceBlockingMovement(i, pathLengthLike);
                        } catch  {}
                        if (movementBlockedThisTick) {
                            this.incrementMovementDelay(i);
                        } else {
                            const currX0 = this.x[i] | 0;
                            const currY0 = this.y[i] | 0;
                            const deltaX0 = (nx | 0) - (currX0 | 0);
                            const deltaY0 = (ny | 0) - (currY0 | 0);
                            const within256 = deltaX0 <= 256 && deltaX0 >= -256 && deltaY0 <= 256 && deltaY0 >= -256;
                            if (!within256) {
                                this.prevX[i] = nx | 0;
                                this.prevY[i] = ny | 0;
                                this.x[i] = nx | 0;
                                this.y[i] = ny | 0;
                            }
                            let movementOrientation = 0;
                            if (currX0 === (nx | 0) && currY0 === (ny | 0)) {
                                movementOrientation = (this.targetRot[i] | 0) & 2047;
                            } else if (currX0 < nx) {
                                if (currY0 < ny) movementOrientation = 1280;
                                else if (currY0 > ny) movementOrientation = 1792;
                                else movementOrientation = 1536;
                            } else if (currX0 > nx) {
                                if (currY0 < ny) movementOrientation = 768;
                                else if (currY0 > ny) movementOrientation = 256;
                                else movementOrientation = 512;
                            } else if (currY0 < ny) movementOrientation = 1024;
                            else if (currY0 > ny) movementOrientation = 0;
                            movementOrientation &= 2047;
                            const rot = (this.rotation[i] | 0) & 2047;
                            const isInteracting = this.getInteractionIndex(i) !== NO_INTERACTION;
                            if (within256 && !isInteracting && ((currX0 | 0) !== (nx | 0) || (currY0 | 0) !== (ny | 0))) {
                                this.targetRot[i] = movementOrientation & 2047;
                            }
                            let cx2 = this.x[i] | 0;
                            let cy2 = this.y[i] | 0;
                            if (within256) {
                                let yaw = movementOrientation - rot & 2047;
                                if (yaw > 1024) yaw -= 2048;
                                const walkSeq = this.animWalkSeq[i] | 0;
                                const walkBackSeq = this.animWalkBackSeq[i] | 0;
                                const walkLeftSeq = this.animWalkLeftSeq[i] | 0;
                                const walkRightSeq = this.animWalkRightSeq[i] | 0;
                                const runSeq = this.animRunSeq[i] | 0;
                                const runBackSeq = this.animRunBackSeq[i] | 0;
                                const runLeftSeq = this.animRunLeftSeq[i] | 0;
                                const runRightSeq = this.animRunRightSeq[i] | 0;
                                const crawlSeq = this.animCrawlSeq[i] | 0;
                                const crawlBackSeq = this.animCrawlBackSeq[i] | 0;
                                const crawlLeftSeq = this.animCrawlLeftSeq[i] | 0;
                                const crawlRightSeq = this.animCrawlRightSeq[i] | 0;
                                let movementSeq = walkBackSeq;
                                if (yaw >= -256 && yaw <= 256) movementSeq = walkSeq;
                                else if (yaw >= 256 && yaw < 768) movementSeq = walkRightSeq;
                                else if (yaw >= -768 && yaw <= -256) movementSeq = walkLeftSeq;
                                if (movementSeq === -1) movementSeq = walkSeq;
                                const pathLength = (this.srvT?.[i] ?? 1.0) < 1.0 ? 1 + (this._queueLen(i) | 0) : this._queueLen(i) | 0;
                                let var8 = 4;
                                const turnPenalty = rot !== movementOrientation && !isInteracting && (this.rotationSpeed[i] | 0) !== 0;
                                if (turnPenalty) var8 = 2;
                                if (pathLength > 2) var8 = 6;
                                if (pathLength > 3) var8 = 8;
                                if ((this.movementDelayCounter[i] | 0) > 0 && pathLength > 1) {
                                    var8 = 8;
                                    this.decrementMovementDelay(i);
                                }
                                const traversal = segFactor >= 1.5 ? 2 : segFactor <= 0.5 ? 0 : 1;
                                if (traversal === 2) var8 = var8 << 1;
                                else if (traversal === 0) var8 = var8 >> 1;
                                if (var8 >= 8) {
                                    if (movementSeq === walkSeq && runSeq !== -1) movementSeq = runSeq;
                                    else if (movementSeq === walkBackSeq && runBackSeq !== -1) movementSeq = runBackSeq;
                                    else if (movementSeq === walkLeftSeq && runLeftSeq !== -1) movementSeq = runLeftSeq;
                                    else if (movementSeq === walkRightSeq && runRightSeq !== -1) movementSeq = runRightSeq;
                                } else if (var8 <= 2) {
                                    if (movementSeq === walkSeq && crawlSeq !== -1) movementSeq = crawlSeq;
                                    else if (movementSeq === walkBackSeq && crawlBackSeq !== -1) movementSeq = crawlBackSeq;
                                    else if (movementSeq === walkLeftSeq && crawlLeftSeq !== -1) movementSeq = crawlLeftSeq;
                                    else if (movementSeq === walkRightSeq && crawlRightSeq !== -1) movementSeq = crawlRightSeq;
                                }
                                if (movementSeq >= 0) this.animMovementSeqId[i] = movementSeq | 0;
                                const pixelStep = Math.max(1, var8 | 0);
                                if (cx2 !== (nx | 0) || cy2 !== (ny | 0)) {
                                    if (cx2 < nx) cx2 = Math.min(nx, cx2 + (pixelStep | 0));
                                    else if (cx2 > nx) cx2 = Math.max(nx, cx2 - (pixelStep | 0));
                                    if (cy2 < ny) cy2 = Math.min(ny, cy2 + (pixelStep | 0));
                                    else if (cy2 > ny) cy2 = Math.max(ny, cy2 - (pixelStep | 0));
                                }
                            }
                            const movedX = cx2 - (this.prevX[i] | 0);
                            const movedY = cy2 - (this.prevY[i] | 0);
                            if (movedX !== 0 || movedY !== 0) {
                                this.updateAnimDistance(i, movedX, movedY);
                            }
                            this.x[i] = cx2 | 0;
                            this.y[i] = cy2 | 0;
                            const reached = (this.x[i] | 0) === (nx | 0) && (this.y[i] | 0) === (ny | 0);
                            this.srvT[i] = reached ? 1.0 : 0.0;
                            this.animPhaseBias[i] = this.getAnimPhaseFromDistance(i);
                            if (reached) {
                                if ((this.forcedMovementSteps?.[i] ?? 0) > 0) {
                                    this.forcedMovementSteps[i] = (this.forcedMovementSteps[i] | 0) - 1 & 0xff;
                                }
                                const remainX = (nx | 0) - (this.x[i] | 0);
                                const remainY = (ny | 0) - (this.y[i] | 0);
                                if (remainX !== 0 || remainY !== 0) {
                                    this.srvSnapDX[i] = Math.max(-32768, Math.min(32767, remainX)) | 0;
                                    this.srvSnapDY[i] = Math.max(-32768, Math.min(32767, remainY)) | 0;
                                    const settle = Math.max(1, Math.min(8, Math.ceil(Math.max(Math.abs(remainX), Math.abs(remainY)) / 8)));
                                    this.srvSnapTicks[i] = settle;
                                } else {
                                    this.srvSnapDX[i] = 0;
                                    this.srvSnapDY[i] = 0;
                                    this.srvSnapTicks[i] = 0;
                                    if ((this.x[i] | 0) !== (nx | 0) || (this.y[i] | 0) !== (ny | 0)) {
                                        this.x[i] = nx | 0;
                                        this.y[i] = ny | 0;
                                    }
                                }
                                let startedNextSegment = false;
                                try {
                                    const qlen = this._queueLen(i) | 0;
                                    if (qlen > 0 && (this.srvChainActive?.[i] | 0) === 1) {
                                        startedNextSegment = this._tryStartNextSegment(i);
                                    }
                                } catch  {}
                                if (!startedNextSegment && (this.srvPendingValid?.[i] | 0) === 1) {
                                    this.srvLastX[i] = this.srvNextX[i] | 0;
                                    this.srvLastY[i] = this.srvNextY[i] | 0;
                                    this.srvNextX[i] = this.srvPendingX[i] | 0;
                                    this.srvNextY[i] = this.srvPendingY[i] | 0;
                                    this.srvSegFactor[i] = Math.max(0.5, this.srvPendingFactor?.[i] || 1.0);
                                    this.srvPendingValid[i] = 0;
                                    this.srvT[i] = 0.0;
                                    this.srvOverrun[i] = 0.0;
                                    this.stepParity[i] ^= 1;
                                } else if (!startedNextSegment) {
                                    const qlenNow = this._queueLen(i) | 0;
                                    if (qlenNow === 0) this.movingHold[i] = 0;
                                    else if ((this.movingHold[i] | 0) > 0) this.movingHold[i]--;
                                    if (qlenNow === 0) this.srvChainActive[i] = 0;
                                }
                            }
                        }
                    }
                }
                try {
                    const pathLengthLike = ((this.srvT?.[i] ?? 1.0) < 1.0 ? 1 : 0) + (this._queueLen(i) | 0);
                    if ((this.getInteractionIndex(i) | 0) !== NO_INTERACTION) {
                        const interactionOrientation = this.interactionOrientationProvider?.(i);
                        if (typeof interactionOrientation === "number" && Number.isFinite(interactionOrientation)) {
                            this.targetRot[i] = interactionOrientation & 2047;
                        }
                    }
                    if (pathLengthLike === 0 || (this.movementDelayCounter[i] | 0) > 0) {
                        let faceOrientation = -1;
                        const fsx = this.faceSubX[i] | 0;
                        const fsy = this.faceSubY[i] | 0;
                        if (fsx >= 0 && fsy >= 0) {
                            const selfX = this.x[i] | 0;
                            const selfY = this.y[i] | 0;
                            if (selfX !== fsx || selfY !== fsy) {
                                faceOrientation = faceAngleRs(selfX, selfY, fsx, fsy) & 2047;
                            }
                        } else {
                            const dir = this.faceDir[i] | 0;
                            if (dir >= 0) faceOrientation = dir & 2047;
                        }
                        if (faceOrientation !== -1) {
                            this.targetRot[i] = faceOrientation & 2047;
                            if ((this.faceInstant[i] | 0) === 1) {
                                this.rotation[i] = faceOrientation & 2047;
                            }
                        }
                        this.clearFaceOverrides(i);
                    }
                    const orientation = (this.targetRot[i] | 0) & 2047;
                    const rot0 = (this.rotation[i] | 0) & 2047;
                    const diff = orientation - rot0 & 2047;
                    if (diff !== 0) {
                        this.incrementRotationCounter(i);
                        const dir = diff > 1024 ? -1 : 1;
                        const turnStep = (this.rotationSpeed[i] | 0) & 2047;
                        let rot = rot0;
                        if (turnStep !== 0) {
                            rot = rot + dir * turnStep + 2048 & 2047;
                        }
                        let stillTurning = true;
                        if (turnStep !== 0 && (diff < turnStep || diff > 2048 - turnStep)) {
                            rot = orientation;
                            stillTurning = false;
                        }
                        this.rotation[i] = rot & 2047;
                        this.rotationVel[i] = turnStep & 0xffff;
                        if (turnStep > 0 && (this.animIdleSeq[i] | 0) === (this.animMovementSeqId[i] | 0) && ((this.rotationCounter[i] | 0) > 25 || stillTurning)) {
                            const turnLeft = this.animTurnLeftSeq[i] | 0;
                            const turnRight = this.animTurnRightSeq[i] | 0;
                            let seq = -1;
                            if (dir === -1 && turnLeft !== -1) seq = turnLeft;
                            else if (dir === 1 && turnRight !== -1) seq = turnRight;
                            else seq = this.animWalkSeq[i] | 0;
                            if (seq >= 0) this.animMovementSeqId[i] = seq | 0;
                        }
                    } else {
                        this.resetRotationCounter(i);
                        if ((this.rotationVel[i] | 0) !== 0) this.rotationVel[i] = 0;
                    }
                } catch  {}
                this.animTick[i] = (this.animTick[i] | 0) + 1 & 0xffff;
                try {
                    const cx = this.x[i] | 0;
                    const cy = this.y[i] | 0;
                    const txc = cx >> 7 | 0;
                    const tyc = cy >> 7 | 0;
                    const centered = (cx & 127) === 64 && (cy & 127) === 64;
                    if (centered) {
                        if ((this.dwellTileX[i] | 0) !== txc || (this.dwellTileY[i] | 0) !== tyc) {
                            this.dwellTileX[i] = txc;
                            this.dwellTileY[i] = tyc;
                            this.dwellTicks[i] = 0;
                        } else {
                            this.dwellTicks[i] = Math.min(0xffffffff, (this.dwellTicks[i] | 0) + 1);
                        }
                    } else {
                        this.dwellTicks[i] = Math.min(0xffffffff, (this.dwellTicks[i] | 0) + 1);
                    }
                } catch  {}
                if (this.movementDebugEnabled) {
                    this._emitMovementDebug(i);
                }
            }
        }
    }
    setServerAuthoritative(enabled) {}
    setServerPos(i, x, y, factor = 1, rotation) {
        return this._queuePush(i, x | 0, y | 0, factor, rotation);
    }
    enableMovementDebug(enabled, sink) {
        this.movementDebugEnabled = !!enabled;
        this.movementDebugSink = typeof sink === "function" ? sink : undefined;
    }
    setTelemetryServerClockProvider(provider) {
        this.telemetryClockProvider = provider;
    }
    setTelemetrySampleSource(source) {
        this.telemetrySampleSource = source;
    }
    _dirFromDelta(dx, dy) {
        const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        if (sx === -1 && sy === -1) return 0;
        if (sx === 0 && sy === -1) return 1;
        if (sx === 1 && sy === -1) return 2;
        if (sx === -1 && sy === 0) return 3;
        if (sx === 1 && sy === 0) return 4;
        if (sx === -1 && sy === 1) return 5;
        if (sx === 0 && sy === 1) return 6;
        if (sx === 1 && sy === 1) return 7;
        return undefined;
    }
    _queuePeek(i) {
        try {
            const cap = this.capacity | 0;
            if (i < 0 || i >= cap) return undefined;
            const off = (i | 0) * 32;
            let head = (this.srvQueueHead[i] | 0) & 0xff;
            const len = (this.srvQueueLen[i] | 0) & 0xff;
            if (len <= 0) return undefined;
            const x = this.srvQueueX[off + head] | 0;
            const y = this.srvQueueY[off + head] | 0;
            return {
                x,
                y
            };
        } catch  {
            return undefined;
        }
    }
    _emitMovementDebug(i) {
        try {
            const x = this.x[i] | 0;
            const y = this.y[i] | 0;
            const tileX = x >> 7 | 0;
            const tileY = y >> 7 | 0;
            const worldX = x / 128.0;
            const worldY = y / 128.0;
            const rot = (this.rotation[i] | 0) & 2047;
            const targ = (this.targetRot[i] | 0) & 2047;
            const t = this.getServerStepT(i);
            const segTiles = this.getServerSegTileSpan(i) | 0;
            const over = this.getServerOverrun(i);
            const running = this.isRunning(i);
            const runVisual = this.isRunVisual(i);
            const moving = this.isMoving(i);
            const rotationDeg = rot * (360 / 2048);
            const lastX = this.srvLastX?.[i] | 0;
            const lastY = this.srvLastY?.[i] | 0;
            const nextX = this.srvNextX?.[i] | 0;
            const nextY = this.srvNextY?.[i] | 0;
            const dx = nextX - lastX;
            const dy = nextY - lastY;
            const moveDir = this._dirFromDelta(dx, dy);
            let turnDir = "none";
            let dYaw = (targ - rot + 1024 & 2047) - 1024;
            if (dYaw > 0) turnDir = "right";
            else if (dYaw < 0) turnDir = "left";
            const turnTicks = this.rotationCounter?.[i] | 0;
            const dwellMs = (this.dwellTicks?.[i] | 0) * (this.clientTickDurationMs | 0);
            const qPeek = this._queuePeek(i);
            const destTileX = qPeek ? qPeek.x >> 7 | 0 : undefined;
            const destTileY = qPeek ? qPeek.y >> 7 | 0 : undefined;
            const cheb = destTileX !== undefined && destTileY !== undefined ? Math.max(Math.abs((destTileX | 0) - tileX), Math.abs((destTileY | 0) - tileY)) : undefined;
            const pathQueueLength = this._queueLen(i) | 0;
            let interactingType = "none";
            let interactingIndex = -1;
            let interactingNpcId = -1;
            let interactingName = "";
            try {
                const rawIdx = this.getInteractionIndex?.(i) ?? -1;
                if ((rawIdx | 0) >= 0) {
                    const info = decodeInteractionIndex(rawIdx | 0);
                    if (info) {
                        interactingType = info.type;
                        interactingIndex = info.id | 0;
                        if (info.type === "npc") interactingNpcId = info.id | 0;
                        if (info.type === "player") {
                            const targetEcs = this.getIndexForServerId?.(info.id | 0);
                            if (targetEcs !== undefined) interactingName = this.getName(targetEcs) || "";
                        }
                    }
                }
            } catch  {}
            const poseSeq = this.getAnimSeqId?.(i) ?? -1;
            const actionSeq = this.getAnimActionSeqId?.(i) ?? -1;
            let movementSeq = this.getAnimMovementSeqId?.(i) ?? -1;
            if (movementSeq < 0) movementSeq = poseSeq | 0;
            const animationSeq = actionSeq >= 0 ? actionSeq | 0 : -1;
            const poseFrame = -1;
            const movementFrame = -1;
            const msBetweenPoseFrameIncrements = -1.0;
            const msSincePoseFrameChange = -1.0;
            const msBetweenMovementFrameIncrements = -1.0;
            const msSinceMovementFrameChange = -1.0;
            const clock = this.telemetryClockProvider ? this.telemetryClockProvider() : undefined;
            const row = {
                id: this.indexToServerId.get(i),
                epochMs: Date.now(),
                renderTimeMs: (this.clientCycle | 0) * (this.clientTickDurationMs | 0),
                frame: this.clientCycle | 0,
                serverTick: clock && Number.isFinite(clock.tick) ? clock.tick | 0 : undefined,
                serverPhase: clock && Number.isFinite(clock.phase) ? clock.phase : t,
                worldX,
                worldY,
                subX: x,
                subY: y,
                tileX,
                tileY,
                plane: this.level?.[i] | 0,
                rotation: rot,
                targetRotation: targ,
                rotationDeg,
                orientation: targ,
                isMoving: moving,
                isRunning: running,
                isRunVisual: runVisual,
                stepT: t,
                segTiles,
                overrun: over,
                moveDir,
                direction: moveDir,
                turnTicks,
                turnDir,
                tileDwellMs: dwellMs,
                destTileX,
                destTileY,
                destDistCheb: cheb,
                pathLenHint: -1,
                pathQueueLength,
                interactingType,
                interactingName,
                interactingIndex,
                interactingNpcId,
                animation: animationSeq,
                movementSeq,
                pose: poseSeq | 0,
                movementFrame,
                poseFrame,
                msBetweenPoseFrameIncrements,
                msSincePoseFrameChange,
                msBetweenMovementFrameIncrements,
                msSinceMovementFrameChange,
                graphic: -1,
                sampleSource: this.telemetrySampleSource
            };
            if (this.movementDebugSink) {
                this.movementDebugSink(row);
            } else if (typeof console !== "undefined") {
                try {
                    console.log("mvdbg", row);
                } catch  {}
            }
        } catch  {}
    }
    getServerStepT(i) {
        if (!this.serverInterpEnabled) return 1.0;
        const t = this.srvT?.[i];
        if (t == null || Number.isNaN(t)) return 1.0;
        return Math.max(0, Math.min(1, t));
    }
    getServerOverrun(i) {
        if (!this.serverInterpEnabled) return 0.0;
        const v = this.srvOverrun?.[i];
        if (v == null || Number.isNaN(v)) return 0.0;
        return Math.max(0, Math.min(4.0, v));
    }
    getServerPathLengthLike(i) {
        if (!(i >= 0 && i < this.capacity)) return 0;
        if (!this.serverInterpEnabled) return 0;
        const hasActiveSegment = (this.srvT?.[i] ?? 1.0) < 1.0 ? 1 : 0;
        return hasActiveSegment + (this._queueLen(i) | 0) | 0;
    }
    getServerSegTileSpan(i) {
        if (!this.serverInterpEnabled) return 1;
        const lx = this.srvLastX?.[i] | 0;
        const ly = this.srvLastY?.[i] | 0;
        const nx = this.srvNextX?.[i] | 0;
        const ny = this.srvNextY?.[i] | 0;
        const dx = Math.abs(nx - lx);
        const dy = Math.abs(ny - ly);
        const cheb = Math.max(dx, dy);
        let steps = Math.max(1, Math.min(2, Math.round(cheb / 128)));
        try {
            if (steps === 1 && (this.srvSegFactor?.[i] || 1) > 1.01) steps = 2;
        } catch  {}
        return steps | 0;
    }
    getClientCycle() {
        return this.clientCycle | 0;
    }
    getOccTileX(i) {
        return this.occTileX[i] | 0;
    }
    getOccTileY(i) {
        return this.occTileY[i] | 0;
    }
    getOccPlane(i) {
        return this.occPlane[i] | 0;
    }
    getOccMapX(i) {
        return this.occMapX[i] | 0;
    }
    getOccMapY(i) {
        return this.occMapY[i] | 0;
    }
    setOccTile(i, x, y, plane) {
        this.occTileX[i] = (x | 0) & 63;
        this.occTileY[i] = (y | 0) & 63;
        this.occPlane[i] = (plane | 0) & 255;
    }
    setOccTileWithMap(i, mapX, mapY, x, y, plane) {
        this.setOccTile(i, x, y, plane);
        this.occMapX[i] = (mapX | 0) & 255;
        this.occMapY[i] = (mapY | 0) & 255;
    }
    teleport(i, tileX, tileY, plane) {
        const sx = ((tileX | 0) << 7) + 64;
        const sy = ((tileY | 0) << 7) + 64;
        this.prevX[i] = sx;
        this.prevY[i] = sy;
        this.x[i] = sx;
        this.y[i] = sy;
        this.targetX[i] = sx;
        this.targetY[i] = sy;
        this.running[i] = 0;
        this.rotationVel[i] = 0;
        if (this.animDistTraveled) this.animDistTraveled[i] = 0.0;
        if (this.animPhaseBias) this.animPhaseBias[i] = 0.0;
        this.clearServerQueue(i);
        this.clearForcedMovement(i);
        this.resetMovementDelay(i);
        if (plane !== undefined) this.setLevel(i, plane);
        const mapX = (tileX | 0) >> 6;
        const mapY = (tileY | 0) >> 6;
        const localX = (tileX | 0) & 63;
        const localY = (tileY | 0) & 63;
        this.setOccTileWithMap(i, mapX, mapY, localX, localY, (plane ?? this.level[i]) | 0);
    }
    setInteractionIndex(i, index) {
        if (!this.interactionIndex) return;
        const next = typeof index === "number" && index >= 0 ? index | 0 : NO_INTERACTION;
        this.interactionIndex[i] = next;
    }
    getInteractionIndex(i) {
        return this.interactionIndex ? this.interactionIndex[i] | 0 : NO_INTERACTION;
    }
    getInteractingId(i) {
        const decoded = decodeInteractionIndex(this.getInteractionIndex(i));
        return decoded?.id;
    }
}
