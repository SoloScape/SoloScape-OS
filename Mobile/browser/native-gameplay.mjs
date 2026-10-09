import {NativePlayerSync} from "./player-sync.mjs";
import {NativeTspsPlayerController} from "./tsps-game-controller.mjs";
import {NativeNpcSync} from "./npc-sync.mjs";
import {NativeNpcModels} from "./npc-models.mjs";
import {encodeNpcInteraction,encodeNpcExamine,npcActionOptions} from "./npc-interactions.mjs";
import {encodeLocInteraction,encodeLocExamine,objectActionOptions} from "./loc-interactions.mjs";
import {decodeRebuild,encodeMoveDestination,encodeWindowStatus,MOVE_GAMECLICK,MAP_BUILD_COMPLETE,WINDOW_STATUS} from "./player-protocol.mjs";
import {loadNativeTerrain} from "./terrain-world.mjs";
import {loadFloorMaterials} from "./floor-materials.mjs";
import {loadStaticScenery} from "./scenery-models.mjs";
import {combineRegionMeshes,GAME_CAMERA_ZOOM} from "./world-webgl.mjs";
import {NativePlayerModels,buildPlayerMesh,playerGroundHeight} from "./player-models.mjs";
import {SceneTextures} from "./texture-cache.mjs";
import {mapBounded} from "./bounded-work.mjs";
import {NativeSceneAnimations} from "./scene-animation.mjs";
import {NativeSpotEffects} from "./spot-effects.mjs";

export function rebuildRegions(rebuild,player){
    const regions=[];
    for(let x=Math.floor((rebuild.zoneX-6)/8);x<=Math.floor((rebuild.zoneX+6)/8);x++)
        for(let y=Math.floor((rebuild.zoneY-6)/8);y<=Math.floor((rebuild.zoneY+6)/8);y++)
            if(x>=0&&y>=0&&x<=255&&y<=255)regions.push({x,y});
    const px=player.x>>>6,py=player.y>>>6;
    regions.sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py));
    return regions;
}
function movementUnits(motion){
    const speed=motion.speed??motion.target.temporaryMoveSpeed??motion.target.moveSpeed??1;
    // Estimate remaining queued tiles from the authoritative endpoint. Like
    // PlayerEcs, catch up when 600 ms server updates outrun 640 ms walk steps.
    const pathLength=Math.ceil(Math.max(Math.abs(motion.target.x-motion.from.x),Math.abs(motion.target.y-motion.from.y)));
    const base=pathLength>3?8:pathLength>2?6:4;
    return base*(speed===2?2:speed===0?.5:1);
}
export function interpolatePlayer(motion,now){
    const step=Math.max(0,now-motion.started)/20*movementUnits(motion)/128;
    const axis=(from,to)=>from+Math.sign(to-from)*Math.min(Math.abs(to-from),step);
    const x=axis(motion.from.x,motion.target.x),y=axis(motion.from.y,motion.target.y);
    return {...motion.target,x,y,moving:x!==motion.target.x||y!==motion.target.y};
}

export class NativeGameplay {
    constructor({cache,viewport,session,interfaces=null,onStatus=()=>{},onRegion=()=>{},onLoading=()=>{},onReady=()=>{},onNpcMenu=()=>{},onExamine=()=>{},run=()=>false,
        loadTerrain=loadNativeTerrain,loadMaterials=loadFloorMaterials,loadScenery=loadStaticScenery,
        models=new NativePlayerModels(cache),now=()=>performance.now(),onServerTick=()=>{}}={}){
        this.cache=cache;this.viewport=viewport;this.session=session;this.onStatus=onStatus;this.onRegion=onRegion;this.onNpcMenu=onNpcMenu;this.onExamine=onExamine;this.run=run;
        this.interfaces=interfaces;
        this.onReady=onReady;this.onLoading=onLoading;this.onServerTick=onServerTick;
        this.loadTerrain=loadTerrain;this.loadMaterials=loadMaterials;this.loadScenery=loadScenery;this.models=models;this.now=now;
        this.generation=0;this.closed=false;this.regions=new Map();this.packetCount=0;this.animationStarted=now();
        this.scenePrepared=false;this.ready=false;this.lastWindowSize=null;
        this.playerController=new NativeTspsPlayerController(this.models.animations,now);
        this.sceneAnimations=new NativeSceneAnimations(this.models.animations);
        this.spotEffects=new NativeSpotEffects(this.models);
        this.localServerId=0;this.movementFrames={};this.sequenceStarted=this.animationStarted;
        this.npcs=new NativeNpcSync();this.npcModels=new NativeNpcModels(models);this.npcMotions=new Map();this.npcDrawn=0;this.selectionToken=0;this.selectedNpc=null;
        this.viewport.onDestination=tile=>this.move(tile);
        this.viewport.onNpc=hit=>void this.selectNpc(hit);
        this.viewport.onObject=hit=>this.selectObject(hit);
        this.viewport.onGroundMenu=hit=>this.showGroundMenu(hit);
        this.viewport.onNpcCancel=()=>this.clearNpcMenu();
    }
    authenticated(account){
        this.sync=new NativePlayerSync(account.playerIndex);
        this.localServerId=account.playerIndex;
        this.viewport.distance=GAME_CAMERA_ZOOM.default;this.viewport.pitch=.65;
        this.updateWindowStatus();
        this.timer=setInterval(()=>{this.playerController.advance(this.now());void this.drawActors();},20);
    }
    updateWindowStatus(){
        // The iPhone viewport changes on rotation and Safari toolbar resize.
        // Report the actual CSS world size, without redundant network packets.
        if(this.closed||!this.sync||!this.session?.sendGame)return;
        const canvas=this.viewport?.canvas;
        if(!canvas?.clientWidth||!canvas?.clientHeight)return;
        const width=Math.max(1,Math.min(65535,Math.round(canvas.clientWidth)));
        const height=Math.max(1,Math.min(65535,Math.round(canvas.clientHeight)));
        const size=width+":"+height;
        if(size===this.lastWindowSize)return;
        this.session.sendGame(WINDOW_STATUS,encodeWindowStatus(width,height));
        this.lastWindowSize=size;
    }
    handle(packet){
        if(this.closed)return;this.packetCount++;
        if(this.interfaces?.handle(packet)){
            if(["IF_OPENTOP","IF_OPENSUB","IF_RESYNC_V2"].includes(packet.name))this.clearNpcMenu();
            return;
        }
        if(packet.name==="REBUILD_NORMAL_V2"){
            this.rebuild=decodeRebuild(packet.payload,this.sync);
            this.updateMotion(this.sync.local);
            const loading=this.loadRebuild(this.rebuild),generation=this.generation;
            void loading.catch(error=>{if(generation===this.generation)this.fail(error);});
        }else if(packet.name==="PLAYER_INFO"){
            const local=this.sync.decode(packet.payload);this.updateMotion(local);this.onServerTick(this.now());
            if(local.plane!==this.viewport.visibleLevel)this.viewport.setSceneLevel(local.plane);
            this.report();
        }else if(packet.name==="SET_NPC_UPDATE_ORIGIN"){
            if(!this.rebuild)throw new Error("NPC origin before map rebuild");
            this.npcs.setOrigin(packet.payload,this.rebuild.baseX,this.rebuild.baseY);
        }else if(packet.name==="NPC_INFO_SMALL_V6"||packet.name==="NPC_INFO_LARGE_V6"){
            this.npcs.decode(packet.payload,{large:packet.name==="NPC_INFO_LARGE_V6",plane:this.sync.local?.plane??0});
            this.updateNpcMotions();this.report();
        }else if(packet.name==="REBUILD_REGION_V2"||packet.name.startsWith("REBUILD_WORLDENTITY")){
            // Never place an instanced player into the preceding overworld geometry.
            throw new Error("Instanced region rendering is not yet supported");
        }
    }
    updateMotion(player){
        if(!player)return;
        this.spotEffects.update("player",player.spotanims,this.now());
        const previous=this.motion?.target;
        this.playerController.accept(this.localServerId||this.sync?.localIndex||1,player);
        // Renderer consumes the TSPS ECS simulation, never the protocol endpoint.
        this.motion={target:{...player}};
        if(player.appearance!==previous?.appearance){
            this.renderError=null;this.drawBlockedUntil=0;this.modelReady=false;this.interfaces?.refreshPortraits?.();
            // Begin verified player equipment/model downloads while the terrain
            // and scenery load; drawActors() consumes the same cached promise.
            if(player.appearance&&!player.appearance.hidden)
                void this.models.composition(player.appearance).catch(()=>{});
        }
        if(this.destination&&player.x===this.destination.x&&player.y===this.destination.y)this.destination=null;
    }
    async loadRebuild(rebuild){
        const generation=++this.generation,current=()=>!this.closed&&generation===this.generation;
        this.clearNpcMenu();this.npcs.reset();this.npcMotions.clear();this.npcDrawn=0;
        this.sceneAnimations.reset();
        this.spotEffects.reset();
        this.spotEffects.update("player",this.sync.local?.spotanims,this.now());
        this.loading=true;this.scenePrepared=false;this.ready=false;this.modelReady=false;this.renderError=null;this.sceneWarnings=[];this.regions=new Map();this.viewport.setActors(null);this.viewport.setScenery(null);
        const started=this.now();this.loadStarted=started;this.loadCheckpoint=started;this.loadTimings=[];
        this.onLoading();
        this.onStatus("Loading server map data…");
        // The rebuild packet can arrive before the follow-up player position update.
        const player=this.sync.local,origin={mapX:rebuild.zoneX>>>3,mapY:rebuild.zoneY>>>3};
        this.origin=origin;
        const unavailable=[],targets=rebuildRegions(rebuild,{x:origin.mapX*64,y:origin.mapY*64});
        // Prioritize the player's region. Remaining terrain groups can fetch
        // concurrently; a missing neighbour must not block or invalidate the centre.
        const loadRegion=async({x,y})=>{
            if(!current())return;
            try{
                const region=await this.loadTerrain(this.cache,x,y);
                if(!current())return;
                this.regions.set(`${x},${y}`,region);
                if(x===origin.mapX&&y===origin.mapY){
                    this.viewport.setTerrain(region);
                    this.viewport.setSceneLevel(player.plane);
                    this.onRegion(region);
                }
            }catch(error){
                if(!current())return;
                if(x===origin.mapX&&y===origin.mapY)throw error;
                unavailable.push(`${x},${y}`);
            }
        };
        await loadRegion({x:origin.mapX,y:origin.mapY});
        if(!current())return;
        this.recordStage("spawn terrain");
        const neighbours=targets.filter(({x,y})=>x!==origin.mapX||y!==origin.mapY);
        // A bounded worker pool fills the map edges without the latency of
        // waiting for each previous 3-region batch to finish.
        await mapBounded(neighbours,6,loadRegion);
        if(!current())return;
        this.recordStage("neighbour terrain");
        const center=this.regions.get(`${origin.mapX},${origin.mapY}`);
        if(!center)throw new Error("Server map centre did not load");
        const regions=[...this.regions.values()];
        for(const region of regions){
            region.neighbours=new Map();
            for(const other of regions)
                if(other!==region&&Math.abs(other.mapX-region.mapX)<=1&&Math.abs(other.mapY-region.mapY)<=1)
                    region.neighbours.set(`${other.mapX-region.mapX},${other.mapY-region.mapY}`,other);
        }
        // Terrain alone is a wireframe: it is NOT a map-ready frame.
        // Wait for floor colours/textures and location meshes before allowing the
        // TSPS loading tracker to fade away the cover over the world.
        // Acknowledge the validated terrain grid promptly; the acknowledgement
        // is protocol state, not permission to remove the visual loading screen.
        this.session.sendGame(MAP_BUILD_COMPLETE);
        this.onStatus("Loading floor materials and world scenery…");
        await this.loadRebuildScenery({regions,center,origin,unavailable,current});
        if(!current())return;
        // Never declare the scene ready if floor-building produced no visible ground.
        if(typeof this.viewport.count==="number"&&this.viewport.count===0&&
            !this.viewport.terrainBatches?.some(batch=>batch.count>0))
            throw new Error("Spawn map has no renderable floor geometry");
        this.loading=false;this.scenePrepared=true;this.unavailable=unavailable;
        this.report();
        await this.drawActors();
        if(!current())return;
        this.maybeReady();
        if(!this.ready)this.onStatus("Map ready; waiting for the local player model…");
        else this.onStatus(`World scene ready in ${Math.round(this.now()-started)} ms`);
    }
    recordStage(stage){
        if(this.loadCheckpoint===undefined)return;
        const at=this.now(),record={stage,ms:Math.max(0,Math.round(at-this.loadCheckpoint)),
            totalMs:Math.max(0,Math.round(at-this.loadStarted))};
        this.loadCheckpoint=at;this.loadTimings.push(record);
        if(typeof window!=="undefined")console.info(`[native-perf] ${stage}: +${record.ms} ms (${record.totalMs} ms total)`);
    }
    async loadRebuildScenery({regions,center,origin,unavailable,current}){
        const textureSource=new SceneTextures(this.cache,{isCurrent:current});
        // Load all required floor definitions together: repeated JS5 requests
        // coalesce, and no wireframe region is considered game-ready.
        await Promise.all(regions.map(async region=>{
            if(!current())return;
            try{region.floorMaterials=await this.loadMaterials(this.cache,region);}
            catch(error){
                if(!current())return;
                throw new Error(`Floor definitions for map ${region.mapX},${region.mapY} unavailable: ${error.message}`,{cause:error});
            }
        }));
        if(!current())return;
        this.recordStage("floor definitions");
        this.onStatus("Loading verified floor textures…");
        const textureIds=new Set();
        for(const region of regions)
            for(const def of [...region.floorMaterials.underlays.values(),...region.floorMaterials.overlays.values()])
                if(def.textureId>=0)textureIds.add(def.textureId);
        // Bound outstanding gateway streams instead of fetching each texture
        // serially (or spawning hundreds of simultaneous sockets).
        const ids=[...textureIds];
        const values=await mapBounded(ids,8,id=>textureSource.load(id));
        if(!current())return;
        const missing=ids.filter((_,index)=>!values[index]);
        if(missing.length)throw new Error(`Missing required floor textures: ${missing.join(", ")}`);
        this.recordStage("floor textures");
        for(const region of regions)region.textures=textureSource.textures;
        this.viewport.addTextures(textureSource.textures);
        this.viewport.setTerrain({...center,regions},{resetCamera:false});
        if(!current())return;
        this.onStatus("Loading verified location models…");
        let keys={};
        try{const response=await fetch("/region-keys.json");if(response.ok)keys=await response.json();}catch{}
        // Process independent region scenery in small parallel batches. No
        // incomplete scene is published as a finished map.
        const modelStore=new Map();
        const scenes=await mapBounded(regions,3,async region=>{
                if(!current())return;
                let scene;
                try{
                    scene=await this.loadScenery(this.cache,region,{
                        key:keys[region.mapX<<8|region.mapY],isCurrent:current,textureSource,modelStore,
                    });
                }catch(error){
                    if(!current())return;
                    if(region===center)throw new Error(`Spawn-region scenery unavailable: ${error.message}`,{cause:error});
                    unavailable.push(`scenery ${region.mapX},${region.mapY}`);
                    return;
                }
                if(!current())return;
                if(!scene){
                    if(region===center)throw new Error("Spawn-region scenery did not produce a scene");
                    unavailable.push(`scenery ${region.mapX},${region.mapY}`);
                    return;
                }
                if(scene.errors?.length){
                    this.sceneWarnings??=[];
                    this.sceneWarnings.push({region:`${region.mapX},${region.mapY}`,count:scene.errors.length});
                }
                region.scenery=scene;region.textures=textureSource.textures;
                return {scene,dx:(region.mapX-origin.mapX)*64,dy:(region.mapY-origin.mapY)*64};
            });
        if(!current())return;
        this.viewport.addTextures(textureSource.textures);
        // Keep the GPU's scene textures even when a scenery region has no meshes.
        this.viewport.setScenery({
            ...combineRegionMeshes(scenes.filter(Boolean)),
            textures:textureSource.textures,
        });
        this.sceneAnimations.reset(scenes.filter(Boolean).flatMap(({scene})=>scene.animatedLocations??[]),this.now());
        if(this.viewport.setDynamicScenery&&this.sync.local){
            const dynamic=await this.sceneAnimations.scene(this.now(),origin,this.sync.local,textureSource.textures);
            if(!current())return;
            this.viewport.setDynamicScenery(dynamic);
        }
        if(!current())return;
        this.unavailable=unavailable;
        this.recordStage("scenery meshes");
    }
    showGroundMenu({tile,x,y,run=false}){
        this.clearNpcMenu();
        if(this.closed||this.loading||!this.sync?.local||!this.origin)return;
        const worldX=this.origin.mapX*64+tile.x,worldY=this.origin.mapY*64+tile.y;
        if(worldX<0||worldX>16383||worldY<0||worldY>16383||
            !this.regions.has(`${worldX>>>6},${worldY>>>6}`))return;
        this.onNpcMenu({kind:"ground",name:"Ground",tile,x,y,run});
    }
    clearNpcMenu(){
        this.selectionToken++;this.selectedNpc=null;this.selectedObject=null;this.onNpcMenu(null);
    }
    async selectNpc({index,x,y,run=false,mode="menu"}){
        if(this.closed||this.loading||!this.sync?.local)return;
        const npc=this.npcs.npcs.get(index);
        if(!npc)return;
        this.clearNpcMenu();
        const token=this.selectionToken,generation=this.generation,type=npc.type;
        try{
            const definition=await this.npcModels.definition(type);
            if(this.closed||this.loading||token!==this.selectionToken||generation!==this.generation||
                this.npcs.npcs.get(index)?.type!==type)return;
            const actions=npcActionOptions(definition,this.npcs.npcs.get(index));
            this.selectedNpc={index,type,slots:actions.map(a=>a.slot),definition,x,y};
            if(mode==="default"&&actions.length){this.interactNpc(index,actions[0].slot,{run});return;}
            this.onNpcMenu({index,name:this.npcs.npcs.get(index).name||definition.name||`NPC ${type}`,
                actions,x,y,run});
        }catch(error){
            if(token===this.selectionToken&&!this.closed)this.onStatus("NPC options unavailable: "+error.message);
        }
    }
    selectObject({id,name,actions,tileX,tileY,plane,x,y,run=false,mode="menu"}){
        if(this.closed||this.loading||!this.sync?.local||!this.origin||
            plane!==this.sync.local.plane)return;
        const worldX=this.origin.mapX*64+tileX,worldY=this.origin.mapY*64+tileY;
        if(worldX<0||worldX>16383||worldY<0||worldY>16383||
            !this.regions.has(`${worldX>>>6},${worldY>>>6}`))return;
        this.clearNpcMenu();
        const options=objectActionOptions({actions});
        this.selectedObject={id,name,worldX,worldY,slots:options.map(a=>a.slot),x,y};
        if(mode==="default"){
            if(options.length)this.interactObject(options[0].slot,{run});
            else{this.clearNpcMenu();this.move({x:tileX,y:tileY,run,screenX:x,screenY:y});}
            return;
        }
        this.onNpcMenu({kind:"object",id,name,actions:options,x,y,run});
    }
    interactObject(slot,{run=false}={}){
        const target=this.selectedObject;
        if(this.closed||this.loading||!target||!target.slots.includes(slot))return false;
        const {opcode,payload}=encodeLocInteraction(target.id,target.worldX,target.worldY,slot,
            {controlKey:Boolean(run||this.run())});
        this.session.sendGame(opcode,payload);
        this.viewport.onClickCross?.(target.x,target.y);
        this.clearNpcMenu();return true;
    }
    examineObject(){
        const target=this.selectedObject;
        if(this.closed||this.loading||!target)return false;
        const {opcode,payload}=encodeLocExamine(target.id);
        this.session.sendGame(opcode,payload);
        this.viewport.onClickCross?.(target.x,target.y);
        this.onExamine({name:target.name,description:"Examine requested from the server."});
        this.clearNpcMenu();return true;
    }
    examineNpc(index){
        const selected=this.selectedNpc,npc=this.npcs.npcs.get(index);
        if(this.closed||this.loading||!selected||selected.index!==index||selected.type!==npc?.type)return false;
        const {opcode,payload}=encodeNpcExamine(selected.type);
        this.session.sendGame(opcode,payload);
        const name=npc.name||selected.definition.name||`NPC ${selected.type}`;
        this.onExamine({name,description:selected.definition.examine||"No cache description available."});
        this.clearNpcMenu();
        return true;
    }
    interactNpc(index,slot,{run=false}={}){
        const selected=this.selectedNpc,npc=this.npcs.npcs.get(index);
        if(this.closed||this.loading||!selected||selected.index!==index||selected.type!==npc?.type||
            !selected.slots.includes(slot)||npc.visibleOps!==undefined&&(npc.visibleOps&(1<<slot))===0)return false;
        const {opcode,payload}=encodeNpcInteraction(index,slot,{controlKey:Boolean(run||this.run())});
        this.session.sendGame(opcode,payload);
        if(this.selectedNpc)this.viewport.onClickCross?.(this.selectedNpc.x,this.selectedNpc.y);
        this.clearNpcMenu();
        return true;
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
            this.destination={x,y};
            if(Number.isFinite(tile.screenX)&&Number.isFinite(tile.screenY))
                this.viewport.onClickCross?.(tile.screenX,tile.screenY);
            this.report();
        }catch(error){this.onStatus("Movement unavailable: "+error.message);}
    }
    updateNpcMotions(){
        const now=this.now();
        if(this.selectedNpc){
            const npc=this.npcs.npcs.get(this.selectedNpc.index);
            if(!npc||npc.type!==this.selectedNpc.type||npc.plane!==this.sync?.local?.plane||
                npc.visibleOps!==undefined&&this.selectedNpc.slots.some(slot=>(npc.visibleOps&(1<<slot))===0))this.clearNpcMenu();
        }
        for(const [index,motion] of this.npcMotions)if(!this.npcs.npcs.has(index)){
            this.npcMotions.delete(index);this.spotEffects.actors.delete(`npc:${index}`);
        }
        for(const [index,npc] of this.npcs.npcs){
            this.spotEffects.update(`npc:${index}`,npc.spotanims,now);
            const previous=this.npcMotions.get(index),target={...npc},old=previous?.target;
            const changed=!old||old.x!==npc.x||old.y!==npc.y||old.plane!==npc.plane||old.type!==npc.type;
            const snap=!old||npc.teleported||old.plane!==npc.plane||old.type!==npc.type||
                Math.max(Math.abs(old.x-npc.x),Math.abs(old.y-npc.y))>2;
            const from=changed?(snap?{x:npc.x,y:npc.y}:interpolatePlayer(previous,now)):previous.from;
            const sequenceChanged=old?.sequence?.id!==npc.sequence?.id||old?.sequence?.delay!==npc.sequence?.delay;
            this.npcMotions.set(index,{from,target,started:changed?now:previous.started,
                speed:changed?npc.moveSpeed:previous.speed,
                animationStarted:!previous||old?.moving!==npc.moving?now:previous.animationStarted,
                sequenceStarted:!previous||sequenceChanged?now:previous.sequenceStarted});
        }
    }
    maybeReady(){
        if(this.closed||this.loading||!this.scenePrepared||this.ready||!this.modelReady||
            !this.sync?.local?.appearance)return false;
        this.ready=true;
        this.recordStage("first playable character");
        this.onReady();
        return true;
    }
    async drawActors(){
        if(this.closed||this.loading||this.drawing||!this.origin)return;
        const generation=this.generation,now=this.now(),meshes=[],npcPickMeshes=[];
        this.drawing=true;
        const add=(mesh,region)=>{
            const dx=(region.mapX-this.origin.mapX)*64,dy=(region.mapY-this.origin.mapY)*64;
            for(const v of [mesh.vertices,...mesh.texturedBatches.map(b=>b.vertices),...(mesh.transparentBatches??[]).map(b=>b.vertices)])
                for(let i=0;i<v.length;i+=6){v[i]+=dx;v[i+2]+=dy;}
            meshes.push(mesh);
        };
        try{
            const player=this.playerController.sample(this.localServerId||this.sync?.localIndex||1),appearance=player?.appearance;
        if(player&&this.viewport.setRoofContext)
            this.viewport.setRoofContext(this.regions,this.origin,player);
            if(appearance&&!appearance.hidden&&now>=(this.drawBlockedUntil??0)){
                const region=this.regions.get(`${player.x>>>6},${player.y>>>6}`);
                if(region)try{
                    const model=await this.models.composition(appearance),animations=appearance.animations;
                    const locomotion=player.locomotionId>=0?player.locomotionId:animations.idle;
                    const action=player.actionId>=0;
                    const id=action?player.actionId:locomotion;
                    const frame=action?player.actionFrame:player.locomotionFrame;
                    // If a movement sequence is unavailable, keep the cached
                    // appearance visible in bind pose rather than hiding the
                    // entire character behind an animation fetch failure.
                    let posed=model;
                    if(id>=0)try{posed=this.models.animations.poseFrameAvailable?
                        this.models.animations.poseFrameAvailable(model,id,frame):await this.models.animations.poseFrame(model,id,frame);this.animationRenderError=null;}
                    catch(error){this.animationRenderError=error.message;}
                    const mesh=buildPlayerMesh(posed,region,player,{textures:this.models.textures.textures});
                    if(!mesh.vertices.length&&!mesh.texturedBatches.some(batch=>batch.vertices.length)&&!mesh.transparentBatches.some(batch=>batch.vertices.length))
                        throw new Error("Local player model produced no visible triangles");
                    add(mesh,region);
                    if(this.closed||generation!==this.generation)return;
                    // The player and complete floor/scenery are sufficient for
                    // first-playable readiness. NPC models can stream in after
                    // the first frame instead of delaying login for every NPC.
                    if(this.scenePrepared&&!this.ready){
                        this.viewport.setActors({vertices:mesh.vertices,
                            texturedBatches:mesh.texturedBatches,
                            transparentBatches:mesh.transparentBatches,
                            textures:this.models.textures.textures,npcPickMeshes:[]});
                    }
                    const ground=playerGroundHeight(region,player.x-region.mapX*64+.5,player.y-region.mapY*64+.5,player.plane);
                    this.viewport.target=[player.x-this.origin.mapX*64-31,-ground.height/128+1,player.y-this.origin.mapY*64-31];
                    this.modelReady=true;this.renderError=null;
                    if(this.scenePrepared&&!this.ready)this.maybeReady();
                    for(const effect of await this.spotEffects.meshes("player",player,region,now))add(effect,region);
                }catch(error){
                    this.modelReady=false;this.renderError=error.message;
                    this.drawBlockedUntil=now+5000;
                    if(this.scenePrepared&&!this.ready)
                        this.onStatus("Player appearance unavailable: "+error.message);
                }
            }
            let drawn=0,missing=0;
            const nearby=[...this.npcMotions.values()].filter(m=>
                m.target.plane===this.sync?.local?.plane&&this.regions.has(`${m.target.x>>>6},${m.target.y>>>6}`))
                .sort((a,b)=>Math.hypot(a.target.x-(player?.x??0),a.target.y-(player?.y??0))-
                    Math.hypot(b.target.x-(player?.x??0),b.target.y-(player?.y??0))).slice(0,48);
            const npcResults=await mapBounded(nearby,6,async motion=>{
                if(this.closed||generation!==this.generation)return null;
                const npc=interpolatePlayer(motion,now),region=this.regions.get(`${npc.x>>>6},${npc.y>>>6}`);
                if(!region)return null;
                try{
                    const mesh=await this.npcModels.mesh(npc,region,{
                        waitForAssets:false,
                        elapsed:Math.max(0,now-motion.animationStarted),
                        sequenceElapsed:Math.max(0,now-motion.sequenceStarted-(npc.sequence?.delay??0)*20)});
                    if(!mesh)return null;
                    const key=`npc:${npc.index}`,active=this.spotEffects.actors.get(key)?.slots.size;
                    const effects=active?await this.spotEffects.meshes(key,npc,region,now,(await this.npcModels.definition(npc.type)).size):[];
                    return {mesh,effects,region,index:motion.target.index};
                }catch{return null;}
            });
            if(this.closed||generation!==this.generation)return;
            for(const result of npcResults){
                if(!result){missing++;continue;}
                const {mesh,effects,region,index}=result;
                add(mesh,region);drawn++;
                for(const effect of effects)add(effect,region);
                npcPickMeshes.push({index,vertices:mesh.vertices});
                for(const batch of mesh.texturedBatches)npcPickMeshes.push({index,vertices:batch.vertices});
                for(const batch of mesh.transparentBatches??[])npcPickMeshes.push({index,vertices:batch.vertices});
            }
            if(this.closed||generation!==this.generation)return;
            const length=meshes.reduce((n,m)=>n+m.vertices.length,0),vertices=new Float32Array(length);
            let offset=0;for(const mesh of meshes){vertices.set(mesh.vertices,offset);offset+=mesh.vertices.length;}
            this.viewport.setActors({vertices,texturedBatches:meshes.flatMap(m=>m.texturedBatches),
                transparentBatches:meshes.flatMap(m=>m.transparentBatches??[]),
                textures:this.models.textures.textures,npcPickMeshes});
            if(player&&this.viewport.setDynamicScenery){
                const dynamic=await this.sceneAnimations.scene(now,this.origin,player,this.viewport.textureMeta??new Map());
                if(this.closed||generation!==this.generation)return;
                this.viewport.setDynamicScenery(dynamic);
            }
            this.maybeReady();
            const renderWarnings=this.sceneAnimations.errors.length+this.spotEffects.errors.length;
            if(this.npcDrawn!==drawn||this.npcMissing!==missing||this.renderWarnings!==renderWarnings){
                this.npcDrawn=drawn;this.npcMissing=missing;this.renderWarnings=renderWarnings;this.report();
            }
        }catch(error){
            if(!this.closed&&generation===this.generation)this.onStatus("Actor drawing unavailable: "+error.message);
        }finally{this.drawing=false;}
    }
    report(){
        if(this.closed||this.loading||!this.sync?.local)return;
        const p=this.sync.local;
        this.onStatus(`Authenticated · tile ${p.x}, ${p.y} · plane ${p.plane}`+
            (this.renderError?" · Player rendering unavailable: "+this.renderError:this.modelReady?" · Click/tap ground to move":" · Loading player appearance…")+
            ` · NPCs ${this.npcDrawn}/${this.npcs.npcs.size} rendered`+
            (this.npcMissing?` (${this.npcMissing} models pending/unavailable)`:"")+
            (this.sceneAnimations.errors.length?` · ${this.sceneAnimations.errors.length} location animations unsupported`:"")+
            (this.spotEffects.errors.length?` · ${this.spotEffects.errors.length} spot effects unavailable`:"")+
            (this.animationRenderError?` · Animation unavailable: ${this.animationRenderError}`:"")+
            (this.sceneWarnings?.length?` · ${this.sceneWarnings.length} scenery areas contain missing/unsupported objects`:"")+
            (this.destination?` · Destination ${this.destination.x}, ${this.destination.y}`:"")+
            (this.unavailable?.length?` · ${this.unavailable.length} map edges unavailable`:""));
    }
    fail(error){
        if(this.closed)return;
        const message="Native scene failed: "+error.message;
        this.onStatus(message);
        // Preserve the actual cache/model failure on the title screen instead
        // of replacing it with the generic "Disconnected" close message.
        if(typeof this.session.stop==="function")this.session.stop(new Error(message));
        else this.session.close();
    }
    close(){this.closed=true;this.generation++;clearInterval(this.timer);this.playerController.clear();this.sceneAnimations.reset();this.spotEffects.reset();this.viewport.setDynamicScenery?.(null);this.interfaces?.close();this.clearNpcMenu();this.viewport.setActors(null);this.viewport.setRoofContext?.(null,null,null);this.viewport.onDestination=()=>{};this.viewport.onNpc=()=>{};this.viewport.onObject=()=>{};this.viewport.onNpcCancel=()=>{};this.viewport.onGroundMenu=()=>{};}
}
