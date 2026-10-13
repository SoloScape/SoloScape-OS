// Bridge the native four-plane map squares to the original pinned TSPS
// computeRoofPlaneLimit() with no approximation to its tile-flag algorithm.
import {computeRoofPlaneLimit} from "./tsps-runtime/game-roof-RoofVisibility.mjs";

export function roofMapManager(regions){
    if(!(regions instanceof Map))throw new TypeError("Expected loaded map squares");
    const getMap=(mapX,mapY)=>{
        const region=regions.get(mapX+","+mapY);
        if(!region)return undefined;
        return {
            mapX,mapY,
            getTileRenderFlag:(level,x,y)=>{
                if(level<0||level>3||x<0||x>=64||y<0||y>=64)return 0;
                return region.planes?.[level]?.renderFlags?.[x*64+y]??0;
            },
            isBridgeSurface:(level,x,y)=>{
                if(level<0||level>=3||x<0||x>=64||y<0||y>=64)return false;
                return !!(region.planes?.[level+1]?.renderFlags?.[x*64+y]&2);
            },
        };
    };
    return {
        getMap,
        getMapForWorldTile:(tileX,tileY)=>getMap(Math.floor(tileX/64),Math.floor(tileY/64)),
    };
}
export function nativeRoofPlaneLimit(regions,{
    origin,player,position,yaw,pitch,distance,roofsHidden=false,
}){
    if(!origin||!player||!Array.isArray(position))return player?.plane??0;
    const toTile=(x,y)=>({x:Math.floor(origin.mapX*64+x+31.5),y:Math.floor(origin.mapY*64+y+31.5)});
    const camera=toTile(position[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
                        position[2]-Math.cos(yaw)*Math.cos(pitch)*distance);
    const target=toTile(position[0],position[2]);
    const rsPitch=Math.max(128,Math.min(383,Math.round(128+(pitch-.18)*255/1.2)));
    return computeRoofPlaneLimit(roofMapManager(regions),3,{
        playerRawPlane:player.plane,cameraPitch:rsPitch,roofsHidden,
        playerTile:{x:Math.floor(player.x),y:Math.floor(player.y)},
        cameraTile:camera,targetTile:target,
    });
}
