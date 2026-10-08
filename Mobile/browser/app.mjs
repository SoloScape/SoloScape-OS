// Actual native world viewport: no diagnostic buttons, mock logins or assets.
import { NativeJs5Cache } from "./native-js5.mjs";
import { loadNativeTerrain } from "./terrain-world.mjs";
import { NativeTerrainViewport } from "./world-webgl.mjs";
import { loadFloorMaterials } from "./floor-materials.mjs";

const byId=id=>document.getElementById(id);
const details=byId("loading-detail"),loading=byId("loading"),status=byId("map-status");
const button=byId("load-world"),x=byId("map-x"),y=byId("map-y");
const network=byId("network"),dot=byId("network-dot");
const worldLabel=byId("world-label");
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
    dot.classList.remove("failed","ready");
    try{
        const mapX=Number(x.value),mapY=Number(y.value);
        // Refuse invalid/unsupported map coordinates, never fake a region.
        if(!Number.isInteger(mapX)||!Number.isInteger(mapY)||mapX<0||mapX>255||mapY<0||mapY>255){
            throw new Error("Region coordinates must be integers from 0 to 255");
        }
        if(!renderer)renderer=new NativeTerrainViewport(byId("world-canvas"));
        const region=await loadNativeTerrain(cache,mapX,mapY,{allowFallback});
        if(sequence!==attempt)return;
        let floorNote;
        try{
            const floors=await loadFloorMaterials(cache,region);
            region.floorMaterials=floors;
            floorNote=`Cache floor colours: ${floors.loadedUnderlays}/${floors.selectedUnderlays} underlays, ${floors.loadedOverlays}/${floors.selectedOverlays} overlays. Flat RGB only; textures and blended lighting not yet implemented.`;
        }catch(floorError){
            floorNote="Floor configuration unavailable ("+floorError.message+"); using temporary tints.";
        }
        if(sequence!==attempt)return;
        renderer.setTerrain(region);
        loading.hidden=true;
        network.textContent="Verified SoloScape cache online";
        dot.classList.add("ready");
        if(region.fallback){ x.value=String(region.mapX);y.value=String(region.mapY); }
        worldLabel.textContent=`Region ${region.mapX}, ${region.mapY}`;
        const fallbackNote=region.fallback?`Requested m${mapX}_${mapY} is absent; loaded the nearest actual terrain region m${region.mapX}_${region.mapY}. `:"";
        status.textContent=fallbackNote+`Native world terrain: m${region.mapX}_${region.mapY} (JS5 5:${region.group}). ${region.sourceBytes.toLocaleString()} decoded bytes, ${region.containerBytes.toLocaleString()} CRC-verified container bytes. Terrain: ${region.terrainFormat} tile opcodes, ${region.consumedBytes.toLocaleString()} consumed, ${region.trailingBytes.toLocaleString()} trailing bytes (not interpreted). Ground geometry from real SoloScape data. ${floorNote} No objects or players yet.`;
    }catch(error){
        if(sequence===attempt){
            loading.hidden=true;showFailure(error);
        }
    }finally{
        if(sequence===attempt)button.disabled=false;
    }
}
button.addEventListener("click",()=>enterWorld(false));
window.addEventListener("pagehide",()=>renderer?.dispose(),{once:true});
enterWorld(true);
