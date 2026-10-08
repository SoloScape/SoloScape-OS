// Actual native world viewport: no diagnostic buttons, mock logins or assets.
import { NativeJs5Cache } from "./native-js5.mjs";
import { loadNativeTerrain, loadTerrainNeighbours } from "./terrain-world.mjs";
import { NativeTerrainViewport } from "./world-webgl.mjs";
import { loadFloorMaterials } from "./floor-materials.mjs";
import { displayTerrainProgressively } from "./world-startup.mjs";
import { loadStaticScenery } from "./scenery-models.mjs";
import {SceneTextures} from "./texture-cache.mjs";

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
window.addEventListener("pagehide",()=>renderer?.dispose(),{once:true});
enterWorld(true);
