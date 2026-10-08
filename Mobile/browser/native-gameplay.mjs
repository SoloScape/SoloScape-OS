import {NativePlayerSync} from "./player-sync.mjs";
import {NativeNpcSync} from "./npc-sync.mjs";
import {NativeNpcModels} from "./npc-models.mjs";
import {encodeNpcInteraction,encodeNpcExamine,npcActionOptions} from "./npc-interactions.mjs";
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
    constructor({cache,viewport,session,interfaces=null,onStatus=()=>{},onRegion=()=>{},onNpcMenu=()=>{},onExamine=()=>{},run=()=>false,
        loadTerrain=loadNativeTerrain,loadMaterials=loadFloorMaterials,loadScenery=loadStaticScenery,
        models=new NativePlayerModels(cache),now=()=>performance.now()}={}){
        this.cache=cache;this.viewport=viewport;this.session=session;this.onStatus=onStatus;this.onRegion=onRegion;this.onNpcMenu=onNpcMenu;this.onExamine=onExamine;this.run=run;
        this.interfaces=interfaces;
        this.loadTerrain=loadTerrain;this.loadMaterials=loadMaterials;this.loadScenery=loadScenery;this.models=models;this.now=now;
        this.generation=0;this.closed=false;this.regions=new Map();this.packetCount=0;this.animationStarted=now();
        this.npcs=new NativeNpcSync();this.npcModels=new NativeNpcModels(models);this.npcMotions=new Map();this.npcDrawn=0;this.selectionToken=0;this.selectedNpc=null;
        this.viewport.onDestination=tile=>this.move(tile);
        this.viewport.onNpc=hit=>void this.selectNpc(hit);
        this.viewport.onGroundMenu=hit=>this.showGroundMenu(hit);
        this.viewport.onNpcCancel=()=>this.clearNpcMenu();
    }
    authenticated(account){
        this.sync=new NativePlayerSync(account.playerIndex);
        const c=this.viewport.canvas;
        this.session.sendGame(WINDOW_STATUS,encodeWindowStatus(Math.max(1,Math.min(65535,c.clientWidth)),Math.max(1,Math.min(65535,c.clientHeight))));
        this.timer=setInterval(()=>void this.drawActors(),50);
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
            const local=this.sync.decode(packet.payload);this.updateMotion(local);
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
        this.clearNpcMenu();this.npcs.reset();this.npcMotions.clear();this.npcDrawn=0;
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
        this.report();await this.drawActors();
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
        this.selectionToken++;this.selectedNpc=null;this.onNpcMenu(null);
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
            this.selectedNpc={index,type,slots:actions.map(a=>a.slot),definition};
            if(mode==="default"&&actions.length){this.interactNpc(index,actions[0].slot,{run});return;}
            this.onNpcMenu({index,name:this.npcs.npcs.get(index).name||definition.name||`NPC ${type}`,
                actions,x,y,run});
        }catch(error){
            if(token===this.selectionToken&&!this.closed)this.onStatus("NPC options unavailable: "+error.message);
        }
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
            this.destination={x,y};this.report();
        }catch(error){this.onStatus("Movement unavailable: "+error.message);}
    }
    updateNpcMotions(){
        const now=this.now();
        if(this.selectedNpc){
            const npc=this.npcs.npcs.get(this.selectedNpc.index);
            if(!npc||npc.type!==this.selectedNpc.type||npc.plane!==this.sync?.local?.plane||
                npc.visibleOps!==undefined&&this.selectedNpc.slots.some(slot=>(npc.visibleOps&(1<<slot))===0))this.clearNpcMenu();
        }
        for(const [index,motion] of this.npcMotions)if(!this.npcs.npcs.has(index))this.npcMotions.delete(index);
        for(const [index,npc] of this.npcs.npcs){
            const previous=this.npcMotions.get(index),target={...npc},old=previous?.target;
            const changed=!old||old.x!==npc.x||old.y!==npc.y||old.plane!==npc.plane||old.type!==npc.type;
            const snap=!old||npc.teleported||old.plane!==npc.plane||old.type!==npc.type||
                Math.max(Math.abs(old.x-npc.x),Math.abs(old.y-npc.y))>2;
            const from=changed?(snap?{x:npc.x,y:npc.y}:interpolatePlayer(previous,now)):previous.from;
            const sequenceChanged=old?.sequence?.id!==npc.sequence?.id||old?.sequence?.delay!==npc.sequence?.delay;
            this.npcMotions.set(index,{from,target,started:changed?now:previous.started,
                animationStarted:!previous||old?.moving!==npc.moving?now:previous.animationStarted,
                sequenceStarted:!previous||sequenceChanged?now:previous.sequenceStarted});
        }
    }
    async drawActors(){
        if(this.closed||this.loading||this.drawing||!this.origin)return;
        const generation=this.generation,now=this.now(),meshes=[],npcPickMeshes=[];
        this.drawing=true;
        const add=(mesh,region)=>{
            const dx=(region.mapX-this.origin.mapX)*64,dy=(region.mapY-this.origin.mapY)*64;
            for(const v of [mesh.vertices,...mesh.texturedBatches.map(b=>b.vertices)])
                for(let i=0;i<v.length;i+=6){v[i]+=dx;v[i+2]+=dy;}
            meshes.push(mesh);
        };
        try{
            const player=this.motion&&interpolatePlayer(this.motion,now),appearance=player?.appearance;
            if(appearance&&!appearance.hidden&&now>=(this.drawBlockedUntil??0)){
                const region=this.regions.get(`${player.x>>>6},${player.y>>>6}`);
                if(region)try{
                    const model=await this.models.composition(appearance),animations=appearance.animations;
                    const speed=player.temporaryMoveSpeed??player.moveSpeed;
                    const locomotion=player.moving?(speed===2?animations.run:animations.walk):animations.idle;
                    let id=locomotion,elapsed=now-this.animationStarted;
                    if(player.sequence?.id>=0){
                        const actionElapsed=Math.max(0,now-this.animationStarted-(player.sequence.delay??0)*20);
                        try{
                            const sequence=await this.models.animations.sequence(player.sequence.id);
                            const duration=sequence.frameLengths.reduce((sum,length)=>sum+Math.max(1,length),0)*20*Math.max(1,sequence.maxLoops??99);
                            if(actionElapsed<duration){id=player.sequence.id;elapsed=actionElapsed;}
                        }catch{}
                    }
                    if(id!==this.animationId){this.animationId=id;this.animationStarted=now;elapsed=0;}
                    const posed=id>=0?await this.models.animations.pose(model,id,elapsed):model;
                    add(buildPlayerMesh(posed,region,player,{textures:this.models.textures.textures}),region);
                    const ground=playerGroundHeight(region,player.x-region.mapX*64+.5,player.y-region.mapY*64+.5,player.plane);
                    this.viewport.target=[player.x-this.origin.mapX*64-31,-ground.height/128+1,player.y-this.origin.mapY*64-31];
                    if(!this.cameraSet){this.viewport.distance=22;this.viewport.pitch=.65;this.cameraSet=true;}
                    this.modelReady=true;this.renderError=null;
                }catch(error){this.modelReady=false;this.renderError=error.message;this.drawBlockedUntil=now+5000;}
            }
            let drawn=0,missing=0;
            const nearby=[...this.npcMotions.values()].filter(m=>
                m.target.plane===this.sync?.local?.plane&&this.regions.has(`${m.target.x>>>6},${m.target.y>>>6}`))
                .sort((a,b)=>Math.hypot(a.target.x-(player?.x??0),a.target.y-(player?.y??0))-
                    Math.hypot(b.target.x-(player?.x??0),b.target.y-(player?.y??0))).slice(0,48);
            for(const motion of nearby){
                if(this.closed||generation!==this.generation)return;
                const npc=interpolatePlayer(motion,now),region=this.regions.get(`${npc.x>>>6},${npc.y>>>6}`);
                if(!region){missing++;continue;}
                try{
                    const mesh=await this.npcModels.mesh(npc,region,{
                        elapsed:Math.max(0,now-motion.animationStarted),
                        sequenceElapsed:Math.max(0,now-motion.sequenceStarted-(npc.sequence?.delay??0)*20)});
                    add(mesh,region);drawn++;
                    npcPickMeshes.push({index:motion.target.index,vertices:mesh.vertices});
                    for(const batch of mesh.texturedBatches)npcPickMeshes.push({index:motion.target.index,vertices:batch.vertices});
                }catch{missing++;}
            }
            if(this.closed||generation!==this.generation)return;
            const length=meshes.reduce((n,m)=>n+m.vertices.length,0),vertices=new Float32Array(length);
            let offset=0;for(const mesh of meshes){vertices.set(mesh.vertices,offset);offset+=mesh.vertices.length;}
            this.viewport.setActors({vertices,texturedBatches:meshes.flatMap(m=>m.texturedBatches),
                textures:this.models.textures.textures,npcPickMeshes});
            if(this.npcDrawn!==drawn||this.npcMissing!==missing){this.npcDrawn=drawn;this.npcMissing=missing;this.report();}
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
            (this.destination?` · Destination ${this.destination.x}, ${this.destination.y}`:"")+
            (this.unavailable?.length?` · ${this.unavailable.length} map edges unavailable`:""));
    }
    fail(error){if(!this.closed){this.onStatus("Native scene failed: "+error.message);this.session.close();}}
    close(){this.closed=true;this.generation++;clearInterval(this.timer);this.interfaces?.close();this.clearNpcMenu();this.viewport.setActors(null);this.viewport.onDestination=()=>{};this.viewport.onNpc=()=>{};this.viewport.onNpcCancel=()=>{};this.viewport.onGroundMenu=()=>{};}
}
