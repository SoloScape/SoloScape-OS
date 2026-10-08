// Actual native world viewport: no diagnostic buttons, mock logins or assets.
import { NativeJs5Cache } from "./native-js5.mjs";
import { loadNativeTerrain } from "./terrain-world.mjs";
import { NativeTerrainViewport } from "./world-webgl.mjs";

const byId=id=>document.getElementById(id);
const details=byId("loading-detail"),loading=byId("loading"),status=byId("map-status");
const button=byId("load-world"),x=byId("map-x"),y=byId("map-y");
const network=byId("network"),dot=byId("network-dot");
const worldLabel=byId("world-label");
const cache=new NativeJs5Cache({revision:240});
let renderer=null,attempt=0;

function showFailure(error){
    status.textContent="World load failed: "+(error?.message||String(error))+". Check that the Java server and local WebSocket gateway are running.";
    network.textContent="World cache unavailable";
    dot.classList.remove("ready");dot.classList.add("failed");
}
async function enterWorld(){
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
        const region=await loadNativeTerrain(cache,mapX,mapY);
        if(sequence!==attempt)return;
        renderer.setTerrain(region);
        loading.hidden=true;
        network.textContent="Verified SoloScape cache online";
        dot.classList.add("ready");
        worldLabel.textContent=`Region ${mapX}, ${mapY}`;
        status.textContent=`Native world terrain: m${mapX}_${mapY} (JS5 5:${region.group}). ${region.sourceBytes.toLocaleString()} decoded bytes, ${region.containerBytes.toLocaleString()} CRC-verified container bytes. Ground geometry from real SoloScape data; provisional floor colours, no objects or players yet.`;
    }catch(error){
        if(sequence===attempt){
            loading.hidden=true;showFailure(error);
        }
    }finally{
        if(sequence===attempt)button.disabled=false;
    }
}
button.addEventListener("click",enterWorld);
window.addEventListener("pagehide",()=>renderer?.dispose(),{once:true});
enterWorld();
