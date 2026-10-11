// Generated from pinned TSPS client/game/state/GameStateMachine.ts
// BSD-2-Clause: see Mobile/licenses/tsps-BSD-2-Clause.txt.
// Regenerate using: node scripts/adapt-tsps-loading.mjs
import { GameState } from "./game-login-GameState.mjs";
const VALID_TRANSITIONS = new Map([
    [
        GameState.DOWNLOADING,
        [
            GameState.LOADING,
            GameState.ERROR
        ]
    ],
    [
        GameState.LOADING,
        [
            GameState.LOGIN_SCREEN,
            GameState.ERROR
        ]
    ],
    [
        GameState.LOGIN_SCREEN,
        [
            GameState.CONNECTING,
            GameState.SPECIAL_LOGIN,
            GameState.ERROR
        ]
    ],
    [
        GameState.CONNECTING,
        [
            GameState.LOADING_GAME,
            GameState.LOGIN_SCREEN,
            GameState.ERROR
        ]
    ],
    [
        GameState.LOADING_GAME,
        [
            GameState.LOGGED_IN,
            GameState.LOGIN_SCREEN,
            GameState.CONNECTION_LOST,
            GameState.ERROR
        ]
    ],
    [
        GameState.LOGGED_IN,
        [
            GameState.LOGIN_SCREEN,
            GameState.CONNECTION_LOST,
            GameState.RECONNECTING,
            GameState.PLEASE_WAIT,
            GameState.LOADING_GAME,
            GameState.ERROR
        ]
    ],
    [
        GameState.RECONNECTING,
        [
            GameState.LOGGED_IN,
            GameState.LOGIN_SCREEN,
            GameState.CONNECTION_LOST,
            GameState.ERROR
        ]
    ],
    [
        GameState.PLEASE_WAIT,
        [
            GameState.LOGGED_IN,
            GameState.LOGIN_SCREEN,
            GameState.CONNECTION_LOST,
            GameState.ERROR
        ]
    ],
    [
        GameState.CONNECTION_LOST,
        [
            GameState.RECONNECTING,
            GameState.LOGIN_SCREEN,
            GameState.LOADING_GAME,
            GameState.LOGGED_IN,
            GameState.ERROR
        ]
    ],
    [
        GameState.SPECIAL_LOGIN,
        [
            GameState.CONNECTING,
            GameState.LOGIN_SCREEN,
            GameState.ERROR
        ]
    ],
    [
        GameState.ERROR,
        [
            GameState.LOGIN_SCREEN
        ]
    ]
]);
export class GameStateMachine {
    state = GameState.DOWNLOADING;
    listeners = new Set();
    transitionHistory = [];
    maxHistorySize = 20;
    constructor(initialState = GameState.DOWNLOADING){
        this.state = initialState;
    }
    getState() {
        return this.state;
    }
    getStateName() {
        const stateName = GameState[this.state];
        return typeof stateName === "string" ? stateName : `UNKNOWN(${this.state})`;
    }
    transition(newState, force = false) {
        if (this.state === newState) {
            return true;
        }
        if (!force && !this.isValidTransition(this.state, newState)) {
            console.warn(`[GameStateMachine] Invalid transition: ${GameState[this.state]} -> ${GameState[newState]}`);
            return false;
        }
        const transition = {
            from: this.state,
            to: newState,
            timestamp: performance.now()
        };
        const oldState = this.state;
        this.state = newState;
        this.transitionHistory.push(transition);
        if (this.transitionHistory.length > this.maxHistorySize) {
            this.transitionHistory.shift();
        }
        console.log(`[GameStateMachine] ${GameState[oldState]} -> ${GameState[newState]}`);
        for (const listener of this.listeners){
            try {
                listener(transition);
            } catch (e) {
                console.error("[GameStateMachine] Listener error:", e);
            }
        }
        return true;
    }
    isValidTransition(from, to) {
        const validTargets = VALID_TRANSITIONS.get(from);
        return validTargets ? validTargets.includes(to) : false;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return ()=>{
            this.listeners.delete(listener);
        };
    }
    getListenerCount() {
        return this.listeners.size;
    }
    getHistory() {
        return this.transitionHistory;
    }
    isOnLoginScreen() {
        return this.state === GameState.LOGIN_SCREEN || this.state === GameState.CONNECTING || this.state === GameState.SPECIAL_LOGIN;
    }
    isLoggedIn() {
        return this.state === GameState.LOADING_GAME || this.state === GameState.LOGGED_IN || this.state === GameState.RECONNECTING || this.state === GameState.PLEASE_WAIT;
    }
    isLoading() {
        return this.state === GameState.DOWNLOADING || this.state === GameState.LOADING || this.state === GameState.LOADING_GAME;
    }
    isDownloading() {
        return this.state === GameState.DOWNLOADING;
    }
    reset() {
        this.transitionHistory = [];
        this.state = GameState.DOWNLOADING;
    }
}
