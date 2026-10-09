/**
 * Authenticated world bridge for the TeaVM title-shell.
 *
 * Native JS5 cache -> server-authoritative REBUILD/PLAYER_INFO/NPC packets ->
 * SoloScape's established WebGL terrain, scenery and local-player rendering.
 * This is deliberately NOT a claim that the original OpenOSRS Rasterizer3D
 * or its complete Java game loop is executing in TeaVM.
 *
 * One NativeGameSession owns both login and world; do not open a second login.
 */
import {NativeTerrainViewport} from "./world-webgl.mjs";
import {NativeGameplay} from "./native-gameplay.mjs";

export class TeaVmWorldBridge {
    constructor({cache,canvas,stage,title,overlay,worldStatus,onStatus=()=>{},onReady=()=>{},
        createViewport=c=>new NativeTerrainViewport(c),
        createGameplay=options=>new NativeGameplay(options)}={}) {
        if(!cache||!canvas||!stage||!title||!overlay||!worldStatus)
            throw new Error("TeaVM world bridge requires verified cache and canvas");
        this.cache=cache;this.canvas=canvas;this.stage=stage;this.title=title;
        this.overlay=overlay;this.worldStatus=worldStatus;
        this.onStatus=onStatus;this.onReady=onReady;
        this.createViewport=createViewport;this.createGameplay=createGameplay;
        this.viewport=null;this.gameplay=null;this.session=null;this.active=false;
        this.generation=0;
    }

    activate(session,account){
        if(this.active)throw new Error("A world is already open");
        if(!session?.connected||!Number.isInteger(account?.playerIndex))
            throw new Error("Cannot render the world before native authentication");
        const token=++this.generation;
        this.session=session;
        // The viewport must have nonzero layout size before WINDOW_STATUS is sent.
        this.stage.hidden=false;this.title.hidden=true;
        this.overlay.hidden=false;
        this.worldStatus.textContent="Loading your revision-240 world...";
        try{
            this.viewport=this.createViewport(this.canvas);
            const current=()=>this.active&&token===this.generation;
            this.gameplay=this.createGameplay({
                cache:this.cache,viewport:this.viewport,session,
                onStatus:message=>{
                    if(!current())return;
                    this.worldStatus.textContent=message;
                    this.onStatus(message);
                },
                onRegion:region=>{
                    if(!current())return;
                    this.worldStatus.textContent=
                        "Loading real map m"+region.mapX+"_"+region.mapY+" and your character...";
                },
                onLoading:()=>{
                    if(!current())return;
                    this.overlay.hidden=false;
                    this.worldStatus.textContent="Loading verified cache terrain, models and textures...";
                },
                onReady:()=>{
                    if(!current())return;
                    // Keep the loading cover until WebGL actually draws a world
                    // frame with player geometry, not merely until JS5 completes.
                    this.viewport.onSceneFrame=()=>{
                        if(!current())return;
                        this.overlay.hidden=true;
                        this.worldStatus.textContent="World and local player rendered from revision-240 cache";
                        this.onReady();
                    };
                },
                onNpcMenu:()=>{},onExamine:()=>{}
            });
            this.active=true;
            this.gameplay.authenticated(account);
        }catch(error){
            this.dispose();
            throw error;
        }
    }

    // Called for EVERY packet, including the first packet sharing the login
    // success WebSocket frame. No parsing/decoding should be duplicated here.
    handle(packet){
        if(!this.active||!this.gameplay)return;
        try{this.gameplay.handle(packet);}
        catch(error){
            const message="Revision-240 world packet failed: "+(error?.message||String(error));
            this.worldStatus.textContent=message;
            this.onStatus(message);
            // Fatal protocol errors must end the session, never leave it half-alive.
            this.session?.stop?.(new Error(message));
        }
    }

    dispose(){
        ++this.generation;
        this.active=false;
        try{this.gameplay?.close();}finally{
            this.gameplay=null;
            try{this.viewport?.dispose();}finally{
                this.viewport=null;this.session=null;
                this.stage.hidden=true;this.title.hidden=false;this.overlay.hidden=false;
            }
        }
    }
}
