// Cache-backed native world viewport and revision-240 account login.
import { NativeJs5Cache } from "./native-js5.mjs";
import { loadNativeTerrain, loadTerrainNeighbours } from "./terrain-world.mjs";
import { NativeTerrainViewport } from "./world-webgl.mjs";
import { loadFloorMaterials } from "./floor-materials.mjs";
import { displayTerrainProgressively } from "./world-startup.mjs";
import { loadStaticScenery } from "./scenery-models.mjs";
import {SceneTextures} from "./texture-cache.mjs";
import {NativeGameSession} from "./native-login.mjs";
import {loginCacheCrcs} from "./login-protocol.mjs";
import {NativeGameplay} from "./native-gameplay.mjs";
import {NativeChooseOptionMenu} from "./native-menu.mjs";

const byId=id=>document.getElementById(id);
const details=byId("loading-detail"),loading=byId("loading"),status=byId("map-status");
const button=byId("load-world"),x=byId("map-x"),y=byId("map-y");
const network=byId("network"),dot=byId("network-dot");
const worldLabel=byId("world-label");
const sceneryStatus=byId("scenery-status");
const levelSelector=byId("scene-level");
const cache=new NativeJs5Cache({revision:240});
let renderer=null,attempt=0;

function showFailure(error){
    const message=error?.message||String(error);
    const offline=/websocket|connection closed|timed out|handshake|network|failed to fetch/i.test(message);
    status.textContent="World load failed: "+message+(offline?". Check the local Java server and WebSocket gateway.":" The native cache connected, but the map could not be loaded.");
    network.textContent=offline?"World cache unavailable":"Map data unavailable";
    dot.classList.remove("ready");dot.classList.add("failed");
}
async function enterWorld(allowFallback=false){
    const sequence=++attempt;
    button.disabled=true;
    loading.hidden=false;
    details.textContent="Loading a real revision-240 map from SoloScape…";
    status.textContent="";
    sceneryStatus.textContent="Waiting for terrain before loading scenery…";
    dot.classList.remove("failed","ready");
    try{
        const mapX=Number(x.value),mapY=Number(y.value);
        // Refuse invalid/unsupported map coordinates, never fake a region.
        if(!Number.isInteger(mapX)||!Number.isInteger(mapY)||mapX<0||mapX>255||mapY<0||mapY>255){
            throw new Error("Region coordinates must be integers from 0 to 255");
        }
        if(!renderer)renderer=new NativeTerrainViewport(byId("world-canvas"));
        renderer.setSceneLevel(Number(levelSelector.value));
        const region=await loadNativeTerrain(cache,mapX,mapY,{allowFallback});
        if(sequence!==attempt)return;
        const fallbackNote=region.fallback?
            `Requested m${mapX}_${mapY} is absent; loaded the nearest actual terrain region m${region.mapX}_${region.mapY}. `:"";
        const sceneDescription=fallbackNote+
            `Native world terrain: m${region.mapX}_${region.mapY} (JS5 5:${region.group}). `+
            `${region.sourceBytes.toLocaleString()} decoded bytes, `+
            `${region.containerBytes.toLocaleString()} CRC-verified container bytes. `+
            `Terrain: ${region.terrainFormat} tile opcodes, `+
            `${region.consumedBytes.toLocaleString()} consumed, `+
            `${region.trailingBytes.toLocaleString()} trailing bytes (not interpreted). `;
        let displayedTerrain=region;
        void displayTerrainProgressively({
            terrain:region,
            isCurrent:()=>sequence===attempt,
            renderTerrain:scene=>{
                renderer.setTerrain(scene);
                loading.hidden=true;
                network.textContent="Verified SoloScape cache online";
                dot.classList.add("ready");
                if(scene.fallback){
                    x.value=String(scene.mapX);
                    y.value=String(scene.mapY);
                }
                worldLabel.textContent=`Region ${scene.mapX}, ${scene.mapY}`;
                status.textContent=sceneDescription+
                    "Cache geometry wireframe displayed. Loading floor definitions and neighbouring terrain. Scenery follows; no players yet.";
            },
            fetchNeighbours:scene=>loadTerrainNeighbours(cache,scene,{isCurrent:()=>sequence===attempt}),
            applyNeighbours:scene=>{
                displayedTerrain=scene;
                renderer.setTerrain(scene,{resetCamera:false});
                status.textContent=sceneDescription+
                    `${scene.neighbours.size}/8 neighbouring regions loaded. Updating edge floor colours. `+
                    (scene.unavailableNeighbours.length?"Unavailable neighbours leave incomplete edges. ":"");
            },
            onNeighbourError:error=>{
                status.textContent=sceneDescription+"Neighbouring terrain unavailable: "+error.message;
            },
            fetchMaterials:scene=>loadFloorMaterials(cache,scene),
            applyMaterials:(scene,floors)=>{
                scene.floorMaterials=floors;
                displayedTerrain=scene;
                renderer.setTerrain(scene,{resetCamera:false});
                status.textContent=sceneDescription+
                    `Cache-defined tiles with blended HSL and vertex lighting: ${floors.loadedUnderlays}/${floors.selectedUnderlays} underlays, `+
                    `${floors.loadedOverlays}/${floors.selectedOverlays} overlays. `+
                    (scene.neighbours?`${scene.neighbours.size}/8 neighbouring regions supply edge heights, normals and blend colours. `:
                        "Neighbouring terrain is still loading. ")+
                    (scene.unavailableNeighbours?.length?"Unavailable neighbours leave incomplete edges. ":"")+
                    "Textures and scenery load next. Missing materials are omitted; shadows and players remain unavailable.";
            },
            onMaterialError:error=>{
                status.textContent=sceneDescription+
                    "Verified terrain remains displayed. Floor configuration unavailable ("+
                    (error?.message??String(error))+"). Scenery loads separately; no players yet.";
            },
        }).then(async()=>{
            if(sequence!==attempt)return;
            sceneryStatus.textContent="Loading cache-backed static scenery…";
            // Optional local map decryption keys; no keys are logged or committed.
            let key;
            const response=await fetch("/region-keys.json");
            if(!response.ok)throw new Error("Local region key configuration unavailable");
            const keys=await response.json();key=keys[(region.mapX<<8)|region.mapY];
            const textureSource=new SceneTextures(cache,{isCurrent:()=>sequence===attempt});
            for(const def of [...(displayedTerrain.floorMaterials?.underlays?.values()??[]),...(displayedTerrain.floorMaterials?.overlays?.values()??[])]){
                if(sequence!==attempt)return;
                if(def.textureId>=0)await textureSource.load(def.textureId);
            }
            const scenery=await loadStaticScenery(cache,displayedTerrain,{key,textureSource,
                isCurrent:()=>sequence===attempt,
                onProgress:progress=>{
                    if(sequence===attempt)sceneryStatus.textContent=
                        `Loading scenery: ${progress.rendered} placements prepared, ${progress.models} models loaded…`;
                },
            });
            if(!scenery||sequence!==attempt)return;
            renderer.setScenery(scenery);
            renderer.setTerrain({...displayedTerrain,textures:scenery.textures},{resetCamera:false});
            sceneryStatus.textContent=`Static scenery: ${scenery.rendered} placements across four map planes, `+
                `${scenery.models} verified models; ${scenery.skipped} placements and ${scenery.omittedFaces} faces omitted. `+
                `${scenery.textures.size} textures loaded; bridge surfaces retain their map heights. `+
                "Floor view controls upper-plane visibility. Animated/state-dependent objects and blended alpha faces remain unsupported."+
                (scenery.errors.length?` ${scenery.errors.length} asset/placement errors; first: ${scenery.errors[0].reason}.`:"");
            status.textContent=sceneDescription+"Four-plane terrain and static scenery use verified cache textures and HSL lighting. Ground view includes bridges and their underlying terrain. Shadows, animated textures and players remain unavailable.";
        }).catch(error=>{
            if(sequence===attempt)sceneryStatus.textContent="Static scenery unavailable: "+error.message+". Terrain remains visible.";
        });
    }catch(error){
        if(sequence===attempt){
            loading.hidden=true;showFailure(error);
        }
    }finally{
        if(sequence===attempt)button.disabled=false;
    }
}
button.addEventListener("click",()=>enterWorld(false));
levelSelector.addEventListener("change",()=>renderer?.setSceneLevel(Number(levelSelector.value)));
const loginForm=byId("login-form"),loginButton=byId("login-submit"),disconnect=byId("login-disconnect"),loginStatus=byId("login-status");
let loginConfig=null,gameSession=null,gameplay=null,loginBusy=false,sessionAttempt=0;
const examineResult=byId("npc-examine-result");
let examineTimer=null;
function showExamine({name,description}){
    clearTimeout(examineTimer);
    examineResult.textContent=`${name}: ${description}`;examineResult.hidden=false;
    examineTimer=setTimeout(()=>{examineResult.hidden=true;},9000);
}
const menuUi=new NativeChooseOptionMenu(byId("osrs-menu-canvas"),{
    onEntry:(entry,info)=>{
        try{
            if(entry.kind==="walk")gameplay?.move({...info.tile,run:info.run});
            else if(entry.kind==="npc")gameplay?.interactNpc(info.index,entry.slot,{run:info.run});
            else if(entry.kind==="examine")gameplay?.examineNpc(info.index);
        }catch(error){loginStatus.textContent="Menu action unavailable: "+error.message;}
    }
});
function showNpcMenu(info){menuUi.open(info);}
async function prepareLogin(){
    try{
        const response=await fetch("/login-config.json");
        if(!response.ok)throw new Error("Native login configuration unavailable");
        const config=await response.json();
        if(config.unavailable)throw new Error(config.message);
        loginConfig=config;loginButton.disabled=false;loginButton.textContent="Log in";
        loginStatus.textContent="Log in to load your player and server location. Tap NPCs for actions or ground to move.";
    }catch(error){loginButton.textContent="Login unavailable";loginStatus.textContent=error.message;}
}
loginForm.addEventListener("submit",async event=>{
    event.preventDefault();if(loginBusy||gameSession?.connected||!loginConfig)return;
    const sequence=++sessionAttempt;loginBusy=true;loginButton.disabled=true;disconnect.hidden=false;
    examineResult.hidden=true;
    const credentials={username:byId("login-username").value,password:byId("login-password").value,otp:byId("login-otp").value};
    byId("login-password").value="";byId("login-otp").value="";
    loginStatus.textContent="Checking the login cache manifest…";
    try{
        // This must be the manifest from the same gateway/server as the account connection.
        const loginCache=loginConfig.gatewayUrl===cache.url?cache:new NativeJs5Cache({url:loginConfig.gatewayUrl,revision:240});
        const crcs=loginCacheCrcs(await loginCache.loadMaster());
        void menuUi.load(loginCache).catch(error=>{
            if(sequence===sessionAttempt)loginStatus.textContent="Native cache font unavailable: "+error.message;
        });
        if(sequence!==sessionAttempt)return;
        // Cancel every preview continuation before authenticated scene ownership begins.
        attempt++;if(!renderer)renderer=new NativeTerrainViewport(byId("world-canvas"));
        button.disabled=true;levelSelector.disabled=true;
        gameSession=new NativeGameSession({url:loginConfig.gatewayUrl,
            onStatus:message=>{if(sequence===sessionAttempt)loginStatus.textContent=message;},
            onAuthenticated:account=>gameplay.authenticated(account),
            onPacket:packet=>{
                if(sequence!==sessionAttempt)return;
                gameplay.handle(packet);
            },
            onClose:message=>{
                if(sequence!==sessionAttempt)return;
                gameplay?.close();button.disabled=false;levelSelector.disabled=false;loading.hidden=true;
                loginStatus.textContent=message;loginButton.disabled=false;disconnect.hidden=true;
            },
        });
        gameplay=new NativeGameplay({cache:loginCache,viewport:renderer,session:gameSession,onNpcMenu:showNpcMenu,onExamine:showExamine,
            run:()=>byId("run-movement").checked,
            onStatus:message=>{if(sequence===sessionAttempt)loginStatus.textContent=message;},
            onRegion:region=>{
                if(sequence!==sessionAttempt)return;
                loading.hidden=true;x.value=String(region.mapX);y.value=String(region.mapY);
                worldLabel.textContent=`Region ${region.mapX}, ${region.mapY}`;
                status.textContent="Your player location and movement are supplied by the SoloScape server.";
                sceneryStatus.textContent="Loading scenery around your server location…";
            },
        });
        const pending=gameSession.login(credentials,{...loginConfig,crcs,
            width:Math.max(1,Math.min(65535,byId("world-canvas").clientWidth)),
            height:Math.max(1,Math.min(65535,byId("world-canvas").clientHeight))});
        credentials.password="";credentials.otp="";
        const result=await pending;
        if(sequence===sessionAttempt&&gameSession.connected&&!gameplay.sync?.initialized)
            loginStatus.textContent=`Authenticated · player slot ${result.playerIndex}. Waiting for your server location…`;
    }catch(error){
        if(sequence===sessionAttempt){gameplay?.close();button.disabled=false;levelSelector.disabled=false;loginStatus.textContent=error.message;loginButton.disabled=false;disconnect.hidden=true;}
    }finally{credentials.password="";credentials.otp="";if(sequence===sessionAttempt)loginBusy=false;}
});
disconnect.addEventListener("click",()=>{
    sessionAttempt++;gameplay?.close();menuUi.close();clearTimeout(examineTimer);examineResult.hidden=true;gameSession?.close();gameSession=null;gameplay=null;loginBusy=false;
    button.disabled=false;levelSelector.disabled=false;loading.hidden=true;
    loginButton.disabled=!loginConfig;disconnect.hidden=true;loginStatus.textContent="Disconnected";
});
window.addEventListener("pagehide",()=>{sessionAttempt++;clearTimeout(examineTimer);menuUi.dispose();gameplay?.close();gameSession?.close();renderer?.dispose();},{once:true});
void prepareLogin();
enterWorld(true);
