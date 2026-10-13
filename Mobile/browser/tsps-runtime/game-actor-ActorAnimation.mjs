// Generated from pinned RSPSApp/tsps: client/game/actor/ActorAnimation.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export class ActorAnimController {
    seqId;
    clip;
    frameIndex = 0;
    frameTick = 0;
    loopCount = 0;
    constructor(seqId, clip){
        this.seqId = seqId | 0;
        this.clip = clip;
    }
    reset() {
        this.frameIndex = 0;
        this.frameTick = 0;
        this.loopCount = 0;
    }
    step(ticks = 1) {
        if (!this.clip || this.clip.frameCount <= 0) return;
        for(let t = 0; t < (ticks | 0); t++){
            if (this.clip.isSkeletal) {
                this.frameIndex++;
                const frameCount = this.clip.frameCount;
                if (this.frameIndex >= frameCount) {
                    if (this.clip.frameStep > 0) {
                        this.frameIndex -= this.clip.frameStep;
                        if (this.clip.looping) {
                            this.loopCount++;
                        }
                        const shouldReset = this.frameIndex < 0 || this.frameIndex >= frameCount || this.clip.looping && this.loopCount >= this.clip.maxLoops;
                        if (shouldReset) {
                            this.frameTick = 0;
                            this.frameIndex = 0;
                            this.loopCount = 0;
                        } else {
                            this.frameTick = 0;
                        }
                    } else {
                        this.frameTick = 0;
                        this.frameIndex = 0;
                    }
                }
            } else {
                this.frameTick++;
                const frameCount = this.clip.frameCount;
                const lengths = this.clip.frameLengths;
                if (!lengths || frameCount <= 0) {
                    this.frameIndex = (this.frameIndex + 1) % Math.max(frameCount, 1);
                    this.frameTick = 0;
                    continue;
                }
                const safeFrameIndex = Math.min(this.frameIndex, lengths.length - 1);
                const currLen = (lengths[safeFrameIndex] ?? 0) | 0;
                if (this.frameTick > currLen) {
                    this.frameTick = 1;
                    this.frameIndex++;
                }
                if (this.frameIndex >= frameCount) {
                    if (this.clip.frameStep > 0) {
                        this.frameIndex -= this.clip.frameStep;
                        if (this.clip.looping) {
                            this.loopCount++;
                        }
                        const shouldReset = this.frameIndex < 0 || this.frameIndex >= frameCount || this.clip.looping && this.loopCount >= this.clip.maxLoops;
                        if (shouldReset) {
                            this.frameTick = 0;
                            this.frameIndex = 0;
                            this.loopCount = 0;
                        } else {
                            this.frameTick = 0;
                        }
                    } else {
                        this.frameTick = 0;
                        this.frameIndex = 0;
                    }
                }
            }
        }
    }
}
