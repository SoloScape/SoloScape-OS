import {NativePlayerSync} from "./player-sync.mjs";
import {decodeRebuild,encodeMoveDestination,encodeWindowStatus,MOVE_GAMECLICK,MAP_BUILD_COMPLETE,WINDOW_STATUS} from "./player-protocol.mjs";
import {loadNativeTerrain} from "./terrain-world.mjs";
import {loadFloorMaterials} from "./floor-materials.mjs";
import {loadStaticScenery} from "./scenery-models.mjs";
import {combineRegionMeshes} from "./world-webgl.mjs";
import {NativePlayerModels,buildPlayerMesh,playerGroundHeight} from "./player-models.mjs";
import {SceneTextures} from "./texture-cache.mjs";

export function rebuildRegions(rebuild,player){
    const regions=[];
    for(let x=Math.floor((rebuild.zoneX-6)/8);x<=Math.floor((rebuild.zoneX+6)/8);x++)
        for(let y=Math.floor((rebuild.zoneY-6)/8);y<=Math.floor((rebuild.zoneY+6)/8);y++)
            if(x>=0&&y>=0&&x<=255&&y<=255)regions.push({x,y});
    const px=player.x>>>6,py=player.y>>>6;
    regions.sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py));
    return regions;
}
export function interpolatePlayer(motion,now){
    const t=Math.max(0,Math.min(1,(now-motion.started)/600));
    return {...motion.target,x:motion.from.x+(motion.target.x-motion.from.x)*t,y:motion.from.y+(motion.target.y-motion.from.y)*t};
}

export class NativeGameplay {
    constructor({cache,viewport,session,onStatus=()=>{},onRegion=()=>{},run=()=>false,
        loadTerrain=loadNativeTerrain,loadMaterials=loadFloorMaterials,loadScenery=loadStaticScenery,
        models=new NativePlayerModels(cache),now=()=>performance.now()}={}){
        this.cache=cache;this.viewport=viewport;this.session=session;this.onStatus=onStatus;this.onRegion=onRegion;this.run=run;
        this.loadTerrain=loadTerrain;this.loadMaterials=loadMaterials;this.loadScenery=loadScenery;this.models=models;this.now=now;
        this.generation=0;this.closed=false;this.regions=new Map();this.packetCount=0;this.animationStarted=now();
        this.viewport.onDestination=tile=>this.move(tile);
    }
    authenticated(account){
        this.sync=new NativePlayerSync(account.playerIndex);
        const c=this.viewport.canvas;
        this.session.sendGame(WINDOW_STATUS,encodeWindowStatus(Math.max(1,Math.min(65535,c.clientWidth)),Math.max(1,Math.min(65535,c.clientHeight))));
        this.timer=setInterval(()=>void this.drawPlayer(),50);
    }
    handle(packet){
        if(this.closed)return;this.packetCount++;
        if(packet.name==="REBUILD_NORMAL_V2"){
            this.rebuild=decodeRebuild(packet.payload,this.sync);
            this.updateMotion(this.sync.local);
            const loading=this.loadRebuild(this.rebuild),generation=this.generation;
            void loading.catch(error=>{if(generation===this.generation)this.fail(error);});
        }else if(packet.name==="PLAYER_INFO"){
            const local=this.sync.decode(packet.payload);this.updateMotion(local);
            if(local.plane!==this.viewport.visibleLevel)this.viewport.setSceneLevel(local.plane);
            this.report();
        }else if(packet.name==="REBUILD_REGION_V2"||packet.name.startsWith("REBUILD_WORLDENTITY")){
            // Never place an instanced player into the preceding overworld geometry.
            throw new Error("Instanced region rendering is not yet supported");
        }
    }
    updateMotion(player){
        if(!player)return;
        const now=this.now(),previous=this.motion?.target;
        if(!previous||previous.x!==player.x||previous.y!==player.y||previous.plane!==player.plane){
            const snap=!previous||player.teleported||previous.plane!==player.plane||Math.max(Math.abs(previous.x-player.x),Math.abs(previous.y-player.y))>2;
            this.motion={from:snap?{x:player.x,y:player.y}:interpolatePlayer(this.motion,now),target:{...player},started:now};
        }else this.motion.target={...player};
        if(player.moving!==previous?.moving||player.sequence!==previous?.sequence){this.animationStarted=now;this.animationId=null;}
        if(player.appearance!==previous?.appearance){this.renderError=null;this.drawBlockedUntil=0;this.modelReady=false;}
        if(this.destination&&player.x===this.destination.x&&player.y===this.destination.y)this.destination=null;
    }
    async loadRebuild(rebuild){
        const generation=++this.generation,current=()=>!this.closed&&generation===this.generation;
        this.loading=true;this.modelReady=false;this.renderError=null;this.regions=new Map();this.viewport.setActors(null);this.viewport.setScenery(null);
        this.onStatus("Loading your server location…");
        // Rebuild is queued BEFORE teleport player info, so sync.local may still be in the old map.
        const player=this.sync.local,origin={mapX:rebuild.zoneX>>>3,mapY:rebuild.zoneY>>>3};
        this.origin=origin;
        const unavailable=[];
        for(const {x,y} of rebuildRegions(rebuild,{x:origin.mapX*64,y:origin.mapY*64})){
            if(!current())return;
            try{
                const region=await this.loadTerrain(this.cache,x,y);
                if(!current())return;this.regions.set(`${x},${y}`,region);
                // The confirmed player's region displays first. Other regions fill the build area.
                if(x===origin.mapX&&y===origin.mapY){this.viewport.setTerrain(region);this.viewport.setSceneLevel(player.plane);this.onRegion(region);}
            }catch(error){
                if(x===origin.mapX&&y===origin.mapY)throw error;
                unavailable.push(`${x},${y}`);
            }
        }
        const regions=[...this.regions.values()],textureSource=new SceneTextures(this.cache,{isCurrent:current});
        for(const region of regions){
            region.neighbours=new Map();
            for(const other of regions)if(other!==region&&Math.abs(other.mapX-region.mapX)<=1&&Math.abs(other.mapY-region.mapY)<=1)
                region.neighbours.set(`${other.mapX-region.mapX},${other.mapY-region.mapY}`,other);
            region.floorMaterials=await this.loadMaterials(this.cache,region);
            if(!current())return;
            for(const def of [...region.floorMaterials.underlays.values(),...region.floorMaterials.overlays.values()])
                if(def.textureId>=0){await textureSource.load(def.textureId);if(!current())return;}
            region.textures=textureSource.textures;
        }
        const center=this.regions.get(`${origin.mapX},${origin.mapY}`);
        this.viewport.setTerrain({...center,regions},{resetCamera:false});
        const scenes=[],textures=new Map();
        let keys={};
        try{const response=await fetch("/region-keys.json");if(response.ok)keys=await response.json();}catch{}
        for(const region of regions){
            if(!current())return;
            let scene;
            try{scene=await this.loadScenery(this.cache,region,{key:keys[region.mapX<<8|region.mapY],isCurrent:current,textureSource});}
            catch(error){if(!current())return;unavailable.push(`scenery ${region.mapX},${region.mapY}`);continue;}
            if(!current())return;if(!scene)continue;
            region.scenery=scene;region.textures=scene.textures;
            scenes.push({scene,dx:(region.mapX-origin.mapX)*64,dy:(region.mapY-origin.mapY)*64});
            for(const [id,data] of scene.textures)textures.set(id,data);
            this.viewport.setScenery({...combineRegionMeshes(scenes),textures});
        }
        if(!current())return;
        this.viewport.addTextures(textureSource.textures);
        this.viewport.setTerrain({...center,regions},{resetCamera:false});
        this.session.sendGame(MAP_BUILD_COMPLETE);this.loading=false;this.unavailable=unavailable;
        this.report();await this.drawPlayer();
    }
    move(tile){
        if(this.closed||this.loading||!this.sync?.local||!this.origin)return;
        const x=this.origin.mapX*64+tile.x,y=this.origin.mapY*64+tile.y;
        if(x<0||x>16383||y<0||y>16383)return;
        const region=this.regions.get(`${x>>>6},${y>>>6}`);if(!region)return;
        const player=this.sync.local;
        try{
            // Require loaded ground. Server pathfinding decides reachability and plane changes.
            playerGroundHeight(region,(x&63)+.5,(y&63)+.5,player.plane);
            this.session.sendGame(MOVE_GAMECLICK,encodeMoveDestination(x,y,{run:tile.run||this.run()}),-1);
            this.destination={x,y};this.report();
        }catch(error){this.onStatus("Movement unavailable: "+error.message);}
    }
    async drawPlayer(){
        if(this.closed||this.loading||this.drawing||!this.motion||!this.origin||this.now()<(this.drawBlockedUntil??0))return;
        const player=interpolatePlayer(this.motion,this.now()),appearance=player.appearance;
        if(!appearance||appearance.hidden){this.viewport.setActors(null);return;}
        const region=this.regions.get(`${Math.floor(player.x/64)},${Math.floor(player.y/64)}`);if(!region)return;
        const generation=this.generation;this.drawing=true;
        try{
            const model=await this.models.composition(appearance),animations=appearance.animations;
            const speed=player.temporaryMoveSpeed??player.moveSpeed;
            const locomotion=player.moving?(speed===2?animations.run:animations.walk):animations.idle;
            let id=locomotion,actionElapsed=0;
            if(player.sequence?.id>=0){
                actionElapsed=Math.max(0,this.now()-this.animationStarted-(player.sequence.delay??0)*20);
                try{
                    const sequence=await this.models.animations.sequence(player.sequence.id);
                    const duration=sequence.frameLengths.reduce((sum,length)=>sum+Math.max(1,length),0)*20*Math.max(1,sequence.maxLoops??99);
                    if(actionElapsed<duration)id=player.sequence.id;
                }catch{}
            }
            if(id!==this.animationId){this.animationId=id;this.animationStarted=this.now();}
            const posed=id>=0?await this.models.animations.pose(model,id,actionElapsed):model;
            const mesh=buildPlayerMesh(posed,region,player,{textures:this.models.textures.textures});
            const dx=(region.mapX-this.origin.mapX)*64,dy=(region.mapY-this.origin.mapY)*64;
            for(const v of [mesh.vertices,...mesh.texturedBatches.map(b=>b.vertices)])for(let i=0;i<v.length;i+=6){v[i]+=dx;v[i+2]+=dy;}
            if(this.closed||generation!==this.generation)return;
            this.viewport.setActors(mesh);
            const ground=playerGroundHeight(region,player.x-region.mapX*64+.5,player.y-region.mapY*64+.5,player.plane);
            this.viewport.target=[player.x-this.origin.mapX*64-31,-ground.height/128+1,player.y-this.origin.mapY*64-31];
            if(!this.cameraSet){this.viewport.distance=22;this.viewport.pitch=.65;this.cameraSet=true;}
            this.modelReady=true;this.renderError=null;this.report();
        }catch(error){if(!this.closed&&generation===this.generation){this.viewport.setActors(null);this.modelReady=false;this.renderError=error.message;this.drawBlockedUntil=this.now()+5000;this.report();}}
        finally{this.drawing=false;}
    }
    report(){
        if(this.closed||this.loading||!this.sync?.local)return;
        const p=this.sync.local;
        this.onStatus(`Authenticated · tile ${p.x}, ${p.y} · plane ${p.plane}`+
            (this.renderError?" · Player rendering unavailable: "+this.renderError:this.modelReady?" · Click/tap ground to move":" · Loading player appearance…")+
            (this.destination?` · Destination ${this.destination.x}, ${this.destination.y}`:"")+
            (this.unavailable?.length?` · ${this.unavailable.length} map edges unavailable`:""));
    }
    fail(error){if(!this.closed){this.onStatus("Native scene failed: "+error.message);this.session.close();}}
    close(){this.closed=true;this.generation++;clearInterval(this.timer);this.viewport.setActors(null);this.viewport.onDestination=()=>{};}
}
