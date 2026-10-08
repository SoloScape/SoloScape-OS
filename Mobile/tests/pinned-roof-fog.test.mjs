import assert from "node:assert/strict";
import {test} from "node:test";
import {nativeRoofPlaneLimit,roofMapManager} from "../browser/native-roof-adapter.mjs";
import {computeRoofPlaneLimit} from "../browser/tsps-runtime/game-roof-RoofVisibility.mjs";
import {NativeTerrainViewport} from "../browser/world-webgl.mjs";

const origin={mapX:50,mapY:50};
function fixture(){
    const region={mapX:50,mapY:50,
        planes:Array.from({length:4},()=>({renderFlags:new Uint8Array(4096)}))};
    const regions=new Map([["50,50",region]]);
    const options={origin,player:{x:3232,y:3232,plane:0},
        position:[0,0,0],yaw:0,pitch:.4,distance:10};
    return {region,regions,options};
}
test("pinned roof algorithm reveals upper levels outdoors but hides them indoors",()=>{
    const {region,regions,options}=fixture();
    assert.equal(nativeRoofPlaneLimit(regions,options),3);
    region.planes[0].renderFlags[32*64+32]=4;
    assert.equal(nativeRoofPlaneLimit(regions,options),0);
    assert.equal(nativeRoofPlaneLimit(regions,{...options,roofsHidden:true}),0);
});
test("pinned roof line-of-sight checks intermediate map tiles",()=>{
    const {region,regions,options}=fixture();
    // Camera stands south of the player's focal point, and its LOS crosses 32,27.
    region.planes[0].renderFlags[31*64+27]=4;
    assert.equal(nativeRoofPlaneLimit(regions,options),0);
    assert.equal(nativeRoofPlaneLimit(regions,{...options,pitch:1.3}),3);
});
test("native map adapter honours bridge-promoted plane and four-plane flags",()=>{
    const {region,regions,options}=fixture();
    const mapManager=roofMapManager(regions);
    assert.equal(mapManager.getMap(50,50).getTileRenderFlag(0,32,32),0);
    region.planes[1].renderFlags[32*64+32]=2;
    region.planes[0].renderFlags[32*64+32]=4;
    const input={playerRawPlane:1,cameraPitch:220,roofsHidden:false,
        playerTile:{x:3232,y:3232},cameraTile:{x:3232,y:3220},
        targetTile:{x:3232,y:3232}};
    assert.equal(computeRoofPlaneLimit(mapManager,3,input),0);
    assert.equal(nativeRoofPlaneLimit(regions,{...options,player:{...options.player,plane:1}}),0);
});
test("WebGL roof filtering is disabled without a loaded authenticated region",()=>{
    const viewport=Object.create(NativeTerrainViewport.prototype);
    viewport.visibleLevel=1;viewport.target=[0,0,0];viewport.yaw=0;viewport.pitch=.4;viewport.distance=10;
    assert.equal(viewport.visibleRoofLevel(),1);
    const {regions,options}=fixture();
    viewport.setRoofContext(regions,origin,options.player);
    assert.equal(viewport.visibleRoofLevel(),3);
    regions.get("50,50").planes[0].renderFlags[32*64+32]=4;
    assert.equal(viewport.visibleRoofLevel(),0);
});
test("fog shader receives a player-centred TSPS 25-tile range",()=>{
    const calls=[];
    const viewport=Object.create(NativeTerrainViewport.prototype);
    viewport.gl={getUniformLocation:(_p,id)=>id,uniform1f:(key,value)=>calls.push([key,value]),
        uniform2f:(key,x,y)=>calls.push([key,x,y]),
        uniform3f:(key,x,y,z)=>calls.push([key,x,y,z])};
    viewport.uploadFog({});
    assert.deepEqual(calls.find(([key])=>key==="u_fogEnabled"),["u_fogEnabled",0]);
    calls.length=0;
    const {regions,options}=fixture();
    viewport.setRoofContext(regions,origin,options.player);
    viewport.uploadFog({});
    assert.deepEqual(calls.find(([key])=>key==="u_fogEnabled"),["u_fogEnabled",1]);
    assert.deepEqual(calls.find(([key])=>key==="u_fogPlayer"),["u_fogPlayer",.5,.5]);
    assert.deepEqual(calls.find(([key])=>key==="u_fogEnd"),["u_fogEnd",25]);
    assert.deepEqual(calls.find(([key])=>key==="u_fogDepth"),["u_fogDepth",21.25]);
    assert.deepEqual(calls.find(([key])=>key==="u_fogColor"),["u_fogColor",0,0,0],
        "distance fog must blend into the black sky");
});
