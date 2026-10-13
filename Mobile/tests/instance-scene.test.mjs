import test from "node:test";
import assert from "node:assert/strict";
import {decodeInstanceRebuild} from "../browser/player-protocol.mjs";
import {loadInstance,rotateInstanceTile,rotateInstanceLocation} from "../browser/instance-scene.mjs";
import {decodeTerrainRegion} from "../browser/terrain-world.mjs";

function packet(templates){
    const zoneX=406,zoneY=414,distinct=new Set(templates.map(t=>`${t.sourceZoneX>>>3},${t.sourceZoneY>>>3}`)).size;
    const bytes=[zoneY>>>8,(zoneY+128)&255,zoneX&255,zoneX>>>8,129,distinct>>>8,distinct&255],bits=[];
    const write=(n,width)=>{for(let i=width-1;i>=0;i--)bits.push(n>>>i&1);};
    for(let p=0;p<4;p++)for(let x=0;x<13;x++)for(let y=0;y<13;y++){
        const t=templates.find(t=>t.plane===p&&t.x===x&&t.y===y);write(t?1:0,1);
        if(t)write(t.sourcePlane<<24|t.sourceZoneX<<14|t.sourceZoneY<<3|t.rotation<<1,26);
    }
    for(let i=0;i<bits.length;i+=8){let n=0;for(let j=0;j<8;j++)n=n<<1|(bits[i+j]??0);bytes.push(n);}
    return Uint8Array.from(bytes);
}
const template={plane:0,x:0,y:0,sourcePlane:2,sourceZoneX:80,sourceZoneY:160,rotation:1};
test("revision 240 instance rebuild reads transformed headers and all template bits",()=>{
    const bytes=packet([template]),rebuild=decodeInstanceRebuild(bytes);
    assert.equal(rebuild.zoneX,406);assert.equal(rebuild.zoneY,414);assert.equal(rebuild.reload,true);
    assert.equal(rebuild.baseX,3200);assert.equal(rebuild.baseY,3264);
    assert.deepEqual({...rebuild.templates[0],packed:undefined},{...template,packed:undefined});
    assert.throws(()=>decodeInstanceRebuild(bytes.slice(0,-1)),/Truncated/);
    assert.throws(()=>decodeInstanceRebuild(Uint8Array.from([...bytes,0])),/Unexpected/);
    const mismatch=bytes.slice();mismatch[6]=2;assert.throws(()=>decodeInstanceRebuild(mismatch),/count mismatch/);
});
test("chunk rotations account for asymmetric, rotated object footprints",()=>{
    assert.deepEqual([0,1,2,3].map(r=>rotateInstanceTile(2,3,r)),[[2,3],[3,5],[5,4],[4,2]]);
    assert.deepEqual(rotateInstanceLocation(2,3,1,2,3,0),[3,4]);
    assert.deepEqual(rotateInstanceLocation(2,3,1,2,3,1),[3,3]);
});
test("instance copies height opcodes onto destination planes and remaps objects and floor metadata",async()=>{
    const terrain=decodeTerrainRegion(Uint8Array.from(Array.from({length:4*4096},()=>[1,10]).flat()),10,20);
    terrain.planes[2].underlays[2*64+3]=17;
    terrain.planes[2].overlayRotations[2*64+3]=2;
    terrain.planes[2].renderFlags[2*64+3]=2;
    let reads=0;
    const upper={...template,plane:1,sourcePlane:0};
    const result=await loadInstance({},decodeInstanceRebuild(packet([template,upper])),{
        loadTerrain:async()=>{reads++;return terrain;},
        loadLocations:async()=>({group:7,keyUsed:true,locations:[{id:9,x:2,y:3,plane:2,shape:10,rotation:0}]}),
        loadDefinitions:async()=>new Map([[9,{sizeX:2,sizeY:3}]])});
    assert.equal(reads,1,"shared source map fetches once");
    const region=result.regions.get("50,51"),at=3*64+5;
    assert.equal(region.planes[0].heights[at],-80,"upper source cache opcode becomes destination ground height");
    assert.equal(region.planes[1].heights[at],-160,"destination height references plane below");
    assert.equal(region.underlays[at],17);assert.equal(region.overlayRotations[at],3);assert.equal(region.renderFlags[at],2);
    assert.deepEqual(region.locationSource.locations,[{id:9,x:3,y:4,plane:0,shape:10,rotation:1}]);
    assert.equal(region.locationSource.keyUsed,true);assert.equal(result.regions.size,4);
    assert.ok(region.neighbours.has("1,0"));
});
test("cancelled instance downloads do not publish a scene",async()=>{
    assert.equal(await loadInstance({},decodeInstanceRebuild(packet([template])),{isCurrent:()=>false}),null);
});
test("missing instance chunks zero upper planes and inherit west and south seams",async()=>{
    const terrain=decodeTerrainRegion(Uint8Array.from(Array.from({length:4*4096},()=>[1,10]).flat()),10,20);
    const ground={...template,sourcePlane:0,rotation:0};
    const aboveGap={...ground,plane:2,x:1};
    const result=await loadInstance({},decodeInstanceRebuild(packet([ground,aboveGap])),{
        loadTerrain:async()=>terrain,loadLocations:async()=>({group:7,keyUsed:false,locations:[]}),
        loadDefinitions:async()=>new Map()});
    const planes=result.regions.get("50,51").planes;
    assert.equal(planes[0].heights[8*64+3],-80,"empty east chunk inherits the west boundary");
    assert.equal(planes[0].heights[3*64+8],-80,"empty north chunk inherits the south boundary");
    assert.equal(planes[0].heights[8*64+8],-80,"empty diagonal corner inherits adjacent nonzero boundary");
    assert.equal(planes[0].heights[9*64+3],0,"empty chunk interior remains cleared");
    assert.equal(planes[1].heights[9*64+3],0,"missing upper plane has no invented -240 offset");
    assert.equal(planes[2].heights[9*64+3],-80,"loaded plane above a gap references cleared lower plane");
});
