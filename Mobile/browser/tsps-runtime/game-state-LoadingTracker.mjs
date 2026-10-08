// Generated from pinned TSPS client/game/state/LoadingTracker.ts
// BSD-2-Clause: see Mobile/licenses/tsps-BSD-2-Clause.txt.
// Regenerate using: node scripts/adapt-tsps-loading.mjs
export var LoadingRequirement = /*#__PURE__*/ function(LoadingRequirement) {
    LoadingRequirement["HANDSHAKE_COMPLETE"] = "handshake";
    LoadingRequirement["MAP_DATA_LOADED"] = "map";
    LoadingRequirement["PLAYER_DATA_LOADED"] = "player";
    LoadingRequirement["WIDGETS_INITIALIZED"] = "widgets";
    return LoadingRequirement;
}({});
export class LoadingTracker {
    requirements = new Set();
    completed = new Set();
    onCompleteCallback;
    progressListeners = new Set();
    progressNotifyPending = false;
    static DEBOUNCE_MS = 16;
    setRequirements(requirements) {
        this.requirements = new Set(requirements);
        this.completed.clear();
        this.notifyProgressListeners();
    }
    markComplete(requirement) {
        if (!this.requirements.has(requirement)) {
            console.warn(`[LoadingTracker] Marking unknown requirement: ${requirement}`);
            return;
        }
        if (this.completed.has(requirement)) {
            return;
        }
        this.completed.add(requirement);
        console.log(`[LoadingTracker] Requirement complete: ${requirement} (${this.completed.size}/${this.requirements.size})`);
        this.notifyProgressListeners();
        if (this.isComplete()) {
            console.log("[LoadingTracker] All requirements complete!");
            this.onCompleteCallback?.();
        }
    }
    isComplete() {
        if (this.requirements.size === 0) {
            return false;
        }
        return this.completed.size >= this.requirements.size;
    }
    getProgress() {
        const total = this.requirements.size;
        const completedCount = this.completed.size;
        const percent = total > 0 ? Math.round(completedCount / total * 100) : 0;
        return {
            completed: completedCount,
            total,
            percent,
            isComplete: this.isComplete(),
            pending: [
                ...this.requirements
            ].filter((r)=>!this.completed.has(r)),
            completedList: [
                ...this.completed
            ]
        };
    }
    setOnComplete(callback) {
        this.onCompleteCallback = callback;
        if (this.isComplete()) {
            callback();
        }
    }
    subscribeProgress(listener) {
        this.progressListeners.add(listener);
        try {
            listener(this.getProgress());
        } catch (e) {
            console.error("[LoadingTracker] Progress listener error:", e);
        }
        return ()=>{
            this.progressListeners.delete(listener);
        };
    }
    reset() {
        this.requirements.clear();
        this.completed.clear();
        this.onCompleteCallback = undefined;
        this.notifyProgressListeners();
    }
    isRequirementComplete(requirement) {
        return this.completed.has(requirement);
    }
    getPendingRequirements() {
        return [
            ...this.requirements
        ].filter((r)=>!this.completed.has(r));
    }
    notifyProgressListeners() {
        if (this.progressNotifyPending) {
            return;
        }
        this.progressNotifyPending = true;
        setTimeout(()=>{
            this.progressNotifyPending = false;
            this.doNotifyProgressListeners();
        }, LoadingTracker.DEBOUNCE_MS);
    }
    doNotifyProgressListeners() {
        const progress = this.getProgress();
        for (const listener of this.progressListeners){
            try {
                listener(progress);
            } catch (e) {
                console.error("[LoadingTracker] Progress listener error:", e);
            }
        }
    }
}
