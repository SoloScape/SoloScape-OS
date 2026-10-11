import {loadNativeTerrain,baseTileHeight} from "./terrain-world.mjs";
import {loadRegionLocations,verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeObjectDefinition} from "./object-definitions.mjs";
import {mapBounded} from "./bounded-work.mjs";

export function rotateInstanceTile(x,y,rotation){
    switch(rotation&3){case 0:return [x,y];case 1:return [y,7-x];case 2:return [7-x,7-y];default:return [7-y,x];}
}
export function rotateInstanceLocation(x,y,rotation,sizeX,sizeY,face){
    if(face&1)[sizeX,sizeY]=[sizeY,sizeX];
    switch(rotation&3){case 0:return [x,y];case 1:return [y,8-x-sizeX];
        case 2:return [8-x-sizeX,8-y-sizeY];default:return [8-y-sizeY,x];}
}
function emptyRegion(mapX,mapY){
    const planes=Array.from({length:4},()=>({heights:new Int32Array(4096),underlays:new Uint16Array(4096),
        overlays:new Int16Array(4096),overlayShapes:new Uint8Array(4096),overlayRotations:new Uint8Array(4096),
        renderFlags:new Uint8Array(4096),heightOpcodes:new Uint8Array(4096),heightValues:new Uint8Array(4096)}));
    return {mapX,mapY,side:64,planes,...planes[0],instance:true,sourceBytes:0,consumedBytes:0,trailingBytes:0,
        locationSource:{group:null,locations:[],keyUsed:false}};
}

/** Copy cache chunks into real destination-coordinate regions used by actors, roofs and picking. */
export async function loadInstance(cache,rebuild,{keys={},isCurrent=()=>true,loadTerrain=loadNativeTerrain,
    loadLocations=loadRegionLocations,loadDefinitions=null}={}){
    if(!rebuild?.instance||!Array.isArray(rebuild.templates))throw new Error("Invalid instance templates");
    const sources=new Map(),regions=new Map();
    const sourceTargets=new Map();
    for(const t of rebuild.templates){
        const mapX=t.sourceZoneX>>>3,mapY=t.sourceZoneY>>>3;
        sourceTargets.set(`${mapX},${mapY}`,{mapX,mapY});
    }
    await mapBounded([...sourceTargets.values()],6,async({mapX,mapY})=>{
        if(!isCurrent())return;
        const terrain=await loadTerrain(cache,mapX,mapY);
        const locations=await loadLocations(cache,terrain,{key:keys[mapX<<8|mapY]});
        sources.set(`${mapX},${mapY}`,{terrain,locations});
    });
    if(!isCurrent())return null;
    const ids=new Set([...sources.values()].flatMap(s=>s.locations.locations.map(l=>l.id)));
    let definitions;
    if(loadDefinitions)definitions=await loadDefinitions(ids);
    else if(ids.size){
        const table=await verifiedCatalog(cache,2),files=table.fileIdsForGroup.get(6);
        if(!files)throw new Error("Object configuration group 2:6 is missing");
        const bytes=unpackArchiveFiles(await decodeGroup(await cache.loadGroup(2,6)),files,ids,{maxFiles:100000});
        definitions=new Map([...bytes].map(([id,data])=>[id,decodeObjectDefinition(data,id)]));
    }else definitions=new Map();
    if(!isCurrent())return null;
    const getRegion=(worldX,worldY)=>{
        const mapX=Math.floor(worldX/64),mapY=Math.floor(worldY/64),key=`${mapX},${mapY}`;
        if(!regions.has(key))regions.set(key,emptyRegion(mapX,mapY));
        return regions.get(key);
    };
    // Empty slots belong to the build area too; create them so actor lookup cannot use an old map.
    for(let x=0;x<13;x++)for(let y=0;y<13;y++)getRegion(rebuild.baseX+x*8,rebuild.baseY+y*8);
    const templates=new Map(rebuild.templates.map(t=>[`${t.plane},${t.x},${t.y}`,t]));
    const readHeight=(plane,x,y)=>{
        const region=getRegion(x,y);return region.planes[plane].heights[(x&63)*64+(y&63)];
    };
    const writeHeight=(plane,x,y,height)=>{
        const region=getRegion(x,y);region.planes[plane].heights[(x&63)*64+(y&63)]=height;
    };
    // Traverse absent chunks as well: zero their heights and inherit the loaded west/south edges.
    // Plane order matters because height opcodes reference the destination plane below.
    for(let plane=0;plane<4;plane++)for(let chunkX=0;chunkX<13;chunkX++)for(let chunkY=0;chunkY<13;chunkY++){
        const t=templates.get(`${plane},${chunkX},${chunkY}`);
        if(!t){
            const x=rebuild.baseX+chunkX*8,y=rebuild.baseY+chunkY*8;
            for(let dx=0;dx<8;dx++)for(let dy=0;dy<8;dy++)writeHeight(plane,x+dx,y+dy,0);
            if(chunkX>0)for(let dy=1;dy<8;dy++)writeHeight(plane,x,y+dy,readHeight(plane,x-1,y+dy));
            if(chunkY>0)for(let dx=1;dx<8;dx++)writeHeight(plane,x+dx,y,readHeight(plane,x+dx,y-1));
            const west=chunkX>0?readHeight(plane,x-1,y):0,south=chunkY>0?readHeight(plane,x,y-1):0;
            const southwest=chunkX>0&&chunkY>0?readHeight(plane,x-1,y-1):0;
            writeHeight(plane,x,y,west||south||southwest);
            continue;
        }
        const source=sources.get(`${t.sourceZoneX>>>3},${t.sourceZoneY>>>3}`),src=source.terrain.planes[t.sourcePlane];
        const sourceX=(t.sourceZoneX&7)*8,sourceY=(t.sourceZoneY&7)*8;
        const worldX=rebuild.baseX+t.x*8,worldY=rebuild.baseY+t.y*8;
        for(let x=0;x<8;x++)for(let y=0;y<8;y++){
            const [rx,ry]=rotateInstanceTile(x,y,t.rotation),region=getRegion(worldX+rx,worldY+ry);
            const target=region.planes[t.plane],at=((worldX+rx)&63)*64+((worldY+ry)&63),from=(sourceX+x)*64+sourceY+y;
            for(const field of ["underlays","overlays","overlayShapes","renderFlags"])
                target[field][at]=src[field][from];
            target.overlayRotations[at]=(src.overlayRotations[from]+t.rotation)&3;
            const opcode=src.heightOpcodes?.[from],height=src.heightValues?.[from];
            if(opcode!==undefined){
                target.heightOpcodes[at]=opcode;target.heightValues[at]=height;
                const delta=opcode===1?-height*8:-240;
                target.heights[at]=t.plane>0?region.planes[t.plane-1].heights[at]+delta:
                    opcode===1?delta:-8*baseTileHeight(t.sourceZoneX*8+x+932731,t.sourceZoneY*8+y+556238);
            }else target.heights[at]=src.heights[from];
        }
        for(const loc of source.locations.locations){
            if(loc.plane!==t.sourcePlane||loc.x<sourceX||loc.x>=sourceX+8||loc.y<sourceY||loc.y>=sourceY+8)continue;
            const d=definitions.get(loc.id);
            if(!d)throw new Error("Missing instanced location definition "+loc.id);
            const [rx,ry]=rotateInstanceLocation(loc.x-sourceX,loc.y-sourceY,t.rotation,d.sizeX,d.sizeY,loc.rotation);
            const x=worldX+rx,y=worldY+ry,region=getRegion(x,y);
            region.locationSource.locations.push({...loc,x:x-region.mapX*64,y:y-region.mapY*64,
                plane:t.plane,rotation:(loc.rotation+t.rotation)&3});
            region.locationSource.keyUsed ||= source.locations.keyUsed;
        }
    }
    for(const region of regions.values()){
        region.neighbours=new Map();
        for(const other of regions.values())if(other!==region&&Math.abs(region.mapX-other.mapX)<=1&&Math.abs(region.mapY-other.mapY)<=1)
            region.neighbours.set(`${other.mapX-region.mapX},${other.mapY-region.mapY}`,other);
    }
    return {regions,sources};
}
