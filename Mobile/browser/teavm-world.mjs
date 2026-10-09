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
import {NativeChooseOptionMenu} from "./native-menu.mjs";
import {NativeInterfaceCanvas} from "./interface-canvas.mjs";
import {ServerInterfaces} from "./server-interfaces.mjs";
import {NativeDialogueModels} from "./dialogue-models.mjs";
import {GamePerformanceOverlay} from "./game-performance.mjs";

export class TeaVmWorldBridge {
    constructor({cache,canvas,stage,title,overlay,worldStatus,menuCanvas,interfaceCanvas,performanceRoot=null,onStatus=()=>{},onReady=()=>{},
        createViewport=c=>new NativeTerrainViewport(c),
        createGameplay=options=>new NativeGameplay(options),
        createMenu=(c,options)=>new NativeChooseOptionMenu(c,options),
        createInterfaceView=(c,cache)=>new NativeInterfaceCanvas(c,cache),
        createInterfaces=options=>new ServerInterfaces(options),
        createPerformanceOverlay=root=>new GamePerformanceOverlay(root)}={}) {
        if(!cache||!canvas||!stage||!title||!overlay||!worldStatus)
            throw new Error("TeaVM world bridge requires verified cache and canvas");
        this.cache=cache;this.canvas=canvas;this.stage=stage;this.title=title;
        this.overlay=overlay;this.worldStatus=worldStatus;
        this.onStatus=onStatus;this.onReady=onReady;
        this.createViewport=createViewport;this.createGameplay=createGameplay;
        this.menuCanvas=menuCanvas;this.interfaceCanvas=interfaceCanvas;
        this.performanceRoot=performanceRoot;this.createPerformanceOverlay=createPerformanceOverlay;this.performanceOverlay=null;
        this.createMenu=createMenu;this.createInterfaceView=createInterfaceView;this.createInterfaces=createInterfaces;
        this.menu=null;this.interfaces=null;
        this.resize=()=>{
            this.gameplay?.updateWindowStatus?.();
            if(this.interfaces?.view.active)this.interfaces.view.paint();
            this.menu?.render();
        };
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
        this.worldStatus.textContent="Loading - Please wait.";
        try{
            this.viewport=this.createViewport(this.canvas);
            if(this.performanceRoot){
                this.performanceOverlay=this.createPerformanceOverlay(this.performanceRoot);
                this.performanceOverlay.start();
                this.viewport.onFrame=timestamp=>this.performanceOverlay?.frame(timestamp);
            }
            const current=()=>this.active&&token===this.generation;
            if(this.interfaceCanvas){
                this.interfaces=this.createInterfaces({
                    view:this.createInterfaceView(this.interfaceCanvas,this.cache),session,
                    onStatus:message=>{if(current())this.onStatus(message);}
                });
                this.interfaces.bindInput(this.canvas.parentElement);
            }
            if(this.menuCanvas){
                this.menu=this.createMenu(this.menuCanvas,{onEntry:(entry,info)=>{
                    if(!current()||!this.overlay.hidden)return;
                    try{
                        if(entry.kind==="walk")this.gameplay.move({...info.tile,run:info.run,screenX:info.x,screenY:info.y});
                        else if(entry.kind==="npc")this.gameplay.interactNpc(info.index,entry.slot,{run:info.run});
                        else if(entry.kind==="object")this.gameplay.interactObject(entry.slot,{run:info.run});
                        else if(entry.kind==="examine")this.gameplay.examineNpc(info.index);
                        else if(entry.kind==="examine-object")this.gameplay.examineObject();
                    }catch(error){this.onStatus("Menu action unavailable: "+error.message);}
                }});
                void this.menu.load(this.cache).catch(error=>{if(current())this.onStatus("Menu font unavailable: "+error.message);});
            }
            this.gameplay=this.createGameplay({
                cache:this.cache,viewport:this.viewport,session,interfaces:this.interfaces,
                onServerTick:timestamp=>{if(current())this.performanceOverlay?.tick(timestamp);},
                onStatus:message=>{
                    if(!current())return;
                    this.onStatus(message);
                },
                onLoading:()=>{
                    if(!current())return;
                    this.overlay.hidden=false;
                    this.menu?.close();
                    this.worldStatus.textContent="Loading - Please wait.";
                },
                onReady:()=>{
                    if(!current())return;
                    // Keep the loading label until WebGL actually draws a world
                    // frame with player geometry, not merely until JS5 completes.
                    this.viewport.onSceneFrame=()=>{
                        if(!current())return;
                        this.overlay.hidden=true;
                        this.worldStatus.textContent="";
                        this.onReady();
                    };
                },
                onNpcMenu:info=>{if(current())this.menu?.open(info);},
                onExamine:({description})=>{if(current())this.onStatus(description);}
            });
            if(this.interfaces)this.interfaces.view.portraits=new NativeDialogueModels(this.gameplay.models,{
                appearance:()=>this.gameplay.sync?.local?.appearance,
                npc:index=>this.gameplay.npcs.npcs.get(index)
            });
            this.active=true;
            globalThis.window?.addEventListener("resize",this.resize);
            globalThis.window?.visualViewport?.addEventListener("resize",this.resize);
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
        globalThis.window?.removeEventListener("resize",this.resize);
        globalThis.window?.visualViewport?.removeEventListener("resize",this.resize);
        try{this.gameplay?.close();}finally{
            this.gameplay=null;
            try{this.menu?.dispose();this.menu=null;this.interfaces?.close();this.interfaces=null;}finally{
                try{this.viewport?.dispose();}finally{
                    this.performanceOverlay?.dispose();this.performanceOverlay=null;
                    this.viewport=null;this.session=null;
                    this.stage.hidden=true;this.title.hidden=false;this.overlay.hidden=false;
                }
            }
        }
    }
}
