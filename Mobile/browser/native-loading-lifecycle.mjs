// Native revision-240 login adapter: use the pinned TSPS state machine/tracker.
// Keep native OSRS login, cache CRC and game packets unchanged.
import {GameState} from "./tsps-runtime/game-login-GameState.mjs";
import {GameStateMachine} from "./tsps-runtime/game-state-GameStateMachine.mjs";
import {LoadingTracker,LoadingRequirement} from "./tsps-runtime/game-state-LoadingTracker.mjs";

export {GameState,LoadingRequirement};

export class NativeOsrsLoadingLifecycle {
    constructor({now=()=>performance.now(),fogMs=1000,minDisplayMs=500,onState=()=>{}}={}){
        this.now=now;this.fogMs=fogMs;this.minDisplayMs=minDisplayMs;
        this.states=new GameStateMachine(GameState.LOGIN_SCREEN);
        this.tracker=new LoadingTracker();
        this.states.subscribe(({from,to})=>onState({from,to,progress:this.tracker.getProgress()}));
        this.fogTimer=null;this.completionTimer=null;this.loadingStarted=0;
        this.mapFrameSeen=false;this.closed=false;
    }
    get state(){return this.states.getState();}
    get progress(){return this.tracker.getProgress();}
    clearTimers(){
        clearTimeout(this.fogTimer);clearTimeout(this.completionTimer);
        this.fogTimer=null;this.completionTimer=null;
    }
    prepareRequirements(){
        this.clearTimers();this.mapFrameSeen=false;
        this.tracker.reset();
        this.tracker.setRequirements([
            LoadingRequirement.HANDSHAKE_COMPLETE,LoadingRequirement.MAP_DATA_LOADED,
        ]);
        this.tracker.setOnComplete(()=>this.completeAfterMinimum());
    }
    begin(){
        if(this.closed)return;
        this.prepareRequirements();
        this.states.transition(GameState.CONNECTING,true);
    }
    authenticated(){
        if(this.closed||this.state!==GameState.CONNECTING)return;
        this.loadingStarted=this.now();
        this.states.transition(GameState.LOADING_GAME);
        this.tracker.markComplete(LoadingRequirement.HANDSHAKE_COMPLETE);
    }
    beginRegionLoad(){
        if(this.closed)return;
        if(this.state!==GameState.LOGGED_IN)return;
        this.prepareRequirements();
        this.loadingStarted=this.now();
        this.states.transition(GameState.LOADING_GAME);
        this.tracker.markComplete(LoadingRequirement.HANDSHAKE_COMPLETE);
    }
    // Called after the renderer has a valid map and actually schedules its first
    // frame, not on receipt of REBUILD or while a map fetch is pending.
    mapFrameReady(){
        if(this.closed||this.state!==GameState.LOADING_GAME||this.mapFrameSeen)return;
        this.mapFrameSeen=true;
        this.fogTimer=setTimeout(()=>{
            this.fogTimer=null;
            if(this.closed||this.state!==GameState.LOADING_GAME)return;
            this.tracker.markComplete(LoadingRequirement.MAP_DATA_LOADED);
        },this.fogMs);
    }
    completeAfterMinimum(){
        if(this.closed||this.state!==GameState.LOADING_GAME)return;
        const remain=Math.max(0,this.minDisplayMs-(this.now()-this.loadingStarted));
        this.completionTimer=setTimeout(()=>{
            this.completionTimer=null;
            if(this.closed||this.state!==GameState.LOADING_GAME||!this.tracker.isComplete())return;
            this.states.transition(GameState.LOGGED_IN);
        },remain);
    }
    reset(){
        this.clearTimers();this.tracker.reset();
        this.mapFrameSeen=false;
        if(!this.closed)this.states.transition(GameState.LOGIN_SCREEN,true);
    }
    dispose(){
        this.reset();this.closed=true;
    }
}
