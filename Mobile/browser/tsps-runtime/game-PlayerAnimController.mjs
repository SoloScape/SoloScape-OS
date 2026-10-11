// Generated from pinned RSPSApp/tsps: client/game/PlayerAnimController.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export class PlayerAnimController {
    playerEcs;
    seqTypeLoader;
    seqFrameLoader;
    states = new Map();
    movementStates = new Map();
    constructor(playerEcs, seqTypeLoader, seqFrameLoader){
        this.playerEcs = playerEcs;
        this.seqTypeLoader = seqTypeLoader;
        this.seqFrameLoader = seqFrameLoader;
    }
    handleServerSequence(serverId, seqId, options = {}) {
        if (!(serverId >= 0) || !(typeof seqId === "number")) return;
        const delay = Math.max(0, typeof options.delay === "number" ? options.delay : 0) | 0;
        const nextSeq = seqId | 0;
        const state = this.stateFor(serverId);
        const currentSeq = state.seqId | 0;
        if (currentSeq === nextSeq && nextSeq !== -1) {
            const restartMode = this.getRestartMode(nextSeq);
            if (restartMode === 1) {
                state.frame = 0;
                state.frameCycle = 0;
                state.delay = delay;
                state.loopCounter = 0;
                this.writeEcsDelayAndLoop(serverId, state);
            } else if (restartMode === 2) {
                state.loopCounter = 0;
                this.writeEcsLoop(serverId, state);
            }
            return;
        }
        if (nextSeq === -1) {
            this.clearSequence(serverId, state);
            return;
        }
        if (currentSeq === -1 || this.getForcedPriority(nextSeq) >= this.getForcedPriority(currentSeq)) {
            state.seqId = nextSeq;
            state.frame = 0;
            state.frameCycle = 0;
            state.delay = delay;
            state.loopCounter = 0;
            this.writeEcsFull(serverId, state, {
                seqChanged: true
            });
        }
    }
    cancelSequenceOnMove(serverId) {
        if (!(serverId >= 0)) return;
        const state = this.states.get(serverId);
        if (!state || (state.seqId | 0) < 0) return;
        const seqType = this.safeLoadSeqType(state.seqId | 0);
        if (!seqType) return;
        const priority = typeof seqType.priority === "number" ? seqType.priority : -1;
        if ((priority | 0) === 1) {
            this.clearSequence(serverId, state);
        }
    }
    tick(clientTicks) {
        const total = Math.max(0, clientTicks | 0);
        if (total === 0) return;
        for(let t = 0; t < total; t++){
            for (const serverId of this.playerEcs.getAllServerIds()){
                const idx = this.playerEcs.getIndexForServerId(serverId);
                if (idx === undefined) continue;
                const state = this.stateFor(serverId);
                const seqId = state.seqId | 0;
                if (seqId >= 0) {
                    let pauseAtDelayOne = false;
                    if ((state.delay | 0) <= 1) {
                        const seqType = this.safeLoadSeqType(seqId);
                        const precedenceAnimating = typeof seqType?.precedenceAnimating === "number" ? seqType.precedenceAnimating : -1;
                        if ((precedenceAnimating | 0) === 1) {
                            const movingSnapshot = this.playerEcs.getForcedMovementSteps(idx) | 0;
                            if (movingSnapshot > 0) {
                                const cycle = this.playerEcs.getClientCycle() >>> 0;
                                const forcedStart = this.playerEcs.getForcedMoveStartCycle(idx) >>> 0;
                                const forcedEnd = this.playerEcs.getForcedMoveEndCycle(idx) >>> 0;
                                if (forcedStart <= cycle && forcedEnd < cycle) {
                                    pauseAtDelayOne = true;
                                    if ((state.delay | 0) !== 1) {
                                        state.delay = 1;
                                        this.writeEcsDelay(serverId, state);
                                    }
                                }
                            }
                        }
                    }
                    if (!pauseAtDelayOne && (state.delay | 0) === 0) {
                        this.stepActiveSequence(serverId, state);
                    }
                    if (!pauseAtDelayOne && (state.delay | 0) > 0) {
                        state.delay = (state.delay | 0) - 1 | 0;
                        this.writeEcsDelay(serverId, state);
                    }
                } else {
                    if ((state.delay | 0) !== 0) {
                        state.delay = 0;
                        this.writeEcsDelay(serverId, state);
                    }
                }
                const liveSeqId = state.seqId | 0;
                if (liveSeqId >= 0) {
                    this.playerEcs.setAnimSeqFrame(idx, state.frame | 0);
                    this.playerEcs.setAnimSeqFrameCycle(idx, state.frameCycle | 0);
                } else {
                    this.playerEcs.setAnimSeqFrame(idx, 0);
                    this.playerEcs.setAnimSeqFrameCycle(idx, 0);
                }
                this.stepMovementSequence(serverId, idx);
            }
        }
    }
    getSequenceState(serverId) {
        if (!(serverId >= 0)) return undefined;
        const s = this.states.get(serverId);
        if (!s || (s.seqId | 0) < 0) return undefined;
        return s;
    }
    getMovementSequenceState(serverId) {
        if (!(serverId >= 0)) return undefined;
        const s = this.movementStates.get(serverId);
        if (!s || (s.seqId | 0) < 0) return undefined;
        return s;
    }
    release(serverId) {
        if (!(serverId >= 0)) return;
        const state = this.states.get(serverId);
        if (state) {
            this.clearSequence(serverId, state);
        }
        this.states.delete(serverId);
        this.movementStates.delete(serverId);
    }
    reset() {
        for (const [serverId, state] of this.states){
            this.clearSequence(serverId, state);
        }
        this.states.clear();
        this.movementStates.clear();
    }
    stateFor(serverId) {
        let state = this.states.get(serverId);
        if (!state) {
            state = {
                seqId: -1,
                frame: 0,
                frameCycle: 0,
                delay: 0,
                loopCounter: 0
            };
            this.states.set(serverId, state);
        }
        return state;
    }
    movementStateFor(serverId) {
        let state = this.movementStates.get(serverId);
        if (!state) {
            state = {
                seqId: -1,
                frame: 0,
                frameCycle: 0,
                loopCounter: 0
            };
            this.movementStates.set(serverId, state);
        }
        return state;
    }
    safeLoadSeqType(seqId) {
        try {
            return this.seqTypeLoader.load(seqId | 0);
        } catch  {
            return undefined;
        }
    }
    getRestartMode(seqId) {
        const seqType = this.safeLoadSeqType(seqId);
        const replyMode = typeof seqType?.replyMode === "number" ? seqType.replyMode : 2;
        return replyMode | 0;
    }
    getForcedPriority(seqId) {
        const seqType = this.safeLoadSeqType(seqId);
        const forcedPriority = typeof seqType?.forcedPriority === "number" ? seqType.forcedPriority : 5;
        return Math.max(0, forcedPriority | 0);
    }
    stepActiveSequence(serverId, state) {
        const seqId = state.seqId | 0;
        const seqType = this.safeLoadSeqType(seqId);
        if (!seqType) {
            this.clearSequence(serverId, state);
            return;
        }
        if (seqType.isSkeletalSeq?.()) {
            this.stepCachedSequence(serverId, state, seqType);
        } else if (Array.isArray(seqType.frameIds) && seqType.frameIds.length > 0) {
            this.stepFrameSequence(serverId, state, seqType);
        } else {
            this.clearSequence(serverId, state);
        }
    }
    stepFrameSequence(serverId, state, seqType) {
        const frameIds = seqType.frameIds;
        const frameCount = frameIds.length | 0;
        if (frameCount <= 0) {
            this.clearSequence(serverId, state);
            return;
        }
        let frame = state.frame | 0;
        let cycle = (state.frameCycle | 0) + 1;
        let loopCounter = state.loopCounter | 0;
        if (frame < frameCount) {
            const len = seqType.getFrameLength(this.seqFrameLoader, frame) | 0;
            if (cycle > len) {
                cycle = 1;
                frame++;
            }
        }
        if (frame >= frameCount) {
            frame -= seqType.frameStep | 0;
            loopCounter = loopCounter + 1 | 0;
            const maxLoops = Math.max(0, seqType.maxLoops | 0);
            if (loopCounter >= maxLoops) {
                this.clearSequence(serverId, state);
                return;
            }
            if (frame < 0 || frame >= frameCount) {
                this.clearSequence(serverId, state);
                return;
            }
        }
        state.frame = frame | 0;
        state.frameCycle = cycle | 0;
        if ((state.loopCounter | 0) !== (loopCounter | 0)) {
            state.loopCounter = loopCounter | 0;
            this.writeEcsLoop(serverId, state);
        }
    }
    stepCachedSequence(serverId, state, seqType) {
        const duration = Math.max(0, seqType.getSkeletalDuration?.() | 0);
        if (!(duration > 0)) {
            this.clearSequence(serverId, state);
            return;
        }
        let frame = (state.frame | 0) + 1;
        let loopCounter = state.loopCounter | 0;
        if (frame >= duration) {
            frame -= seqType.frameStep | 0;
            loopCounter = loopCounter + 1 | 0;
            const maxLoops = Math.max(0, seqType.maxLoops | 0);
            if (loopCounter >= maxLoops) {
                this.clearSequence(serverId, state);
                return;
            }
            if (frame < 0 || frame >= duration) {
                this.clearSequence(serverId, state);
                return;
            }
        }
        state.frame = frame | 0;
        state.frameCycle = 0;
        if ((state.loopCounter | 0) !== (loopCounter | 0)) {
            state.loopCounter = loopCounter | 0;
            this.writeEcsLoop(serverId, state);
        }
    }
    clearSequence(serverId, state) {
        state.seqId = -1;
        state.frame = 0;
        state.frameCycle = 0;
        state.delay = 0;
        state.loopCounter = 0;
        this.writeEcsFull(serverId, state, {
            seqChanged: true
        });
    }
    stepMovementSequence(serverId, ecsIndex) {
        const nextSeqId = this.playerEcs.getAnimMovementSeqId(ecsIndex) | 0;
        const state = this.movementStateFor(serverId);
        if ((state.seqId | 0) !== (nextSeqId | 0)) {
            state.seqId = nextSeqId | 0;
        }
        const seqId = state.seqId | 0;
        if (seqId < 0) {
            if ((state.frame | 0) !== 0 || (state.frameCycle | 0) !== 0 || (state.loopCounter | 0) !== 0) {
                state.frame = 0;
                state.frameCycle = 0;
                state.loopCounter = 0;
            }
            return;
        }
        const seqType = this.safeLoadSeqType(seqId);
        if (!seqType) {
            state.seqId = -1;
            state.frame = 0;
            state.frameCycle = 0;
            state.loopCounter = 0;
            return;
        }
        if (seqType.isSkeletalSeq?.()) {
            this.stepMovementCachedSequence(state, seqType);
        } else if (Array.isArray(seqType.frameIds) && seqType.frameIds.length > 0) {
            this.stepMovementFrameSequence(state, seqType);
        } else {
            state.seqId = -1;
            state.frame = 0;
            state.frameCycle = 0;
            state.loopCounter = 0;
        }
    }
    stepMovementFrameSequence(state, seqType) {
        const frameIds = seqType.frameIds;
        const frameCount = frameIds.length | 0;
        if (frameCount <= 0) {
            state.seqId = -1;
            state.frame = 0;
            state.frameCycle = 0;
            state.loopCounter = 0;
            return;
        }
        let frame = state.frame | 0;
        let cycle = (state.frameCycle | 0) + 1;
        let loopCounter = state.loopCounter | 0;
        if (frame < frameCount) {
            const len = seqType.getFrameLength(this.seqFrameLoader, frame) | 0;
            if (cycle > len) {
                cycle = 1;
                frame++;
            }
        }
        if (frame >= frameCount) {
            if ((seqType.frameStep | 0) > 0) {
                frame -= seqType.frameStep | 0;
                if (seqType.looping) {
                    loopCounter = loopCounter + 1 | 0;
                }
                const maxLoops = Math.max(0, seqType.maxLoops | 0);
                const shouldReset = frame < 0 || frame >= frameCount || seqType.looping && loopCounter >= maxLoops;
                if (shouldReset) {
                    frame = 0;
                    cycle = 0;
                    loopCounter = 0;
                }
            } else {
                frame = 0;
                cycle = 0;
                loopCounter = 0;
            }
        }
        state.frame = frame | 0;
        state.frameCycle = cycle | 0;
        state.loopCounter = loopCounter | 0;
    }
    stepMovementCachedSequence(state, seqType) {
        const duration = Math.max(0, seqType.getSkeletalDuration?.() | 0);
        if (!(duration > 0)) {
            state.seqId = -1;
            state.frame = 0;
            state.frameCycle = 0;
            state.loopCounter = 0;
            return;
        }
        let frame = (state.frame | 0) + 1;
        let loopCounter = state.loopCounter | 0;
        if (frame >= duration) {
            if ((seqType.frameStep | 0) > 0) {
                frame -= seqType.frameStep | 0;
                if (seqType.looping) {
                    loopCounter = loopCounter + 1 | 0;
                }
                const maxLoops = Math.max(0, seqType.maxLoops | 0);
                const shouldReset = frame < 0 || frame >= duration || seqType.looping && loopCounter >= maxLoops;
                if (shouldReset) {
                    frame = 0;
                    loopCounter = 0;
                }
            } else {
                frame = 0;
                loopCounter = 0;
            }
        }
        state.frame = frame | 0;
        state.frameCycle = 0;
        state.loopCounter = loopCounter | 0;
    }
    writeEcsFull(serverId, state, opts) {
        const idx = this.playerEcs.getIndexForServerId(serverId);
        if (idx === undefined) return;
        if (opts.seqChanged) {
            this.playerEcs.setAnimSeqId(idx, state.seqId | 0);
        }
        this.playerEcs.setAnimSeqDelay?.(idx, state.delay | 0);
        this.playerEcs.setAnimLoopCounter?.(idx, state.loopCounter | 0);
        this.playerEcs.setAnimSeqFrame(idx, state.frame | 0);
        this.playerEcs.setAnimSeqFrameCycle(idx, state.frameCycle | 0);
    }
    writeEcsDelay(serverId, state) {
        const idx = this.playerEcs.getIndexForServerId(serverId);
        if (idx === undefined) return;
        this.playerEcs.setAnimSeqDelay?.(idx, state.delay | 0);
    }
    writeEcsLoop(serverId, state) {
        const idx = this.playerEcs.getIndexForServerId(serverId);
        if (idx === undefined) return;
        this.playerEcs.setAnimLoopCounter?.(idx, state.loopCounter | 0);
    }
    writeEcsDelayAndLoop(serverId, state) {
        const idx = this.playerEcs.getIndexForServerId(serverId);
        if (idx === undefined) return;
        this.playerEcs.setAnimSeqDelay?.(idx, state.delay | 0);
        this.playerEcs.setAnimLoopCounter?.(idx, state.loopCounter | 0);
        this.playerEcs.setAnimSeqFrame(idx, state.frame | 0);
        this.playerEcs.setAnimSeqFrameCycle(idx, state.frameCycle | 0);
    }
}
