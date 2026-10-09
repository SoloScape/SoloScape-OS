import test from "node:test";
import assert from "node:assert/strict";
import {captureManifest} from "../browser/render-capture.mjs";
function fixture(){return {
    cache:{revision:240,master:[{archive:2,crc:123,revision:17}],password:"secret",keys:[1,2,3,4]},
    viewport:{canvas:{width:320,height:240,clientWidth:320,clientHeight:240},target:[1,2,3],yaw:1,pitch:.5,distance:60,
        visibleLevel:0,visibleRoofLevel:()=>0,touch:true,drawMode:4,frameTime:20,gpuSettings:{brightness:.9,password:"secret"},
        gl:{getContextAttributes:()=>({antialias:false})}},
    gameplay:{ready:true,origin:{mapX:50,mapY:50},rebuild:{zoneX:400,zoneY:400,baseX:3152,baseY:3152},
        sync:{local:{x:3200,y:3201,plane:0,orientation:512,appearance:{name:"Private user"}}},
        regions:new Map([["50,50",{}]]),interfaces:{varps:new Map([[9,2],[3,1]])},session:{token:"secret"},packetCount:5}};}
const options={frameId:"lumbridge-stationary-1",serverTick:100,clientCycle:3000};
test("capture manifest exports explicit scene state without account or key objects",()=>{
    const m=captureManifest(fixture(),options),serialized=JSON.stringify(m);
    assert.equal(m.match.serverTick,100);assert.equal(m.match.settings.brightness,.9);
    assert.equal(m.match.settings.anisotropicFilteringLevel,1);
    assert.deepEqual(m.match.scene.varps,[[3,1],[9,2]]);
    assert.ok(!serialized.includes("secret"));assert.ok(!serialized.includes("Private user"));
    assert.ok(!serialized.includes("password"));assert.ok(!serialized.includes("token"));
});
test("capture refuses missing synchronization identifiers, unloaded cache and nonfinite camera",()=>{
    assert.throws(()=>captureManifest(fixture(),{}),/explicit/);
    const unloaded=fixture();unloaded.cache.master=null;assert.throws(()=>captureManifest(unloaded,options),/verified cache/);
    const camera=fixture();camera.viewport.yaw=NaN;assert.throws(()=>captureManifest(camera,options),/finite/);
    const loading=fixture();loading.gameplay.loading=true;assert.throws(()=>captureManifest(loading,options),/ready scene/);
});
test("capture records resolved morph definition and child sequence frame",()=>{
    const context=fixture(),terrain={mapX:50,mapY:50},loc={id:9,x:2,y:3,plane:0};
    context.gameplay.sceneAnimations={entries:[{loc,terrain,definition:{id:9,seqId:-1},lastFrame:null,resolve:()=>{},
        children:[{loc,terrain,definition:{id:12,seqId:18},lastFrame:4}]}]};
    const scenery=captureManifest(context,options).match.scene.actors.scenery;
    assert.deepEqual(scenery,[{id:9,definitionId:12,x:2,y:3,plane:0,regionX:50,regionY:50,sequence:18,frame:4}]);
});
