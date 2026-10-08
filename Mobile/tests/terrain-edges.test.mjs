import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32 } from "node:zlib";
import { NativeJs5Cache } from "../browser/native-js5.mjs";
import { loadTerrainNeighbours, djb2 } from "../browser/terrain-world.mjs";
import { sampleTerrain, calculateVertexLights, blendUnderlayHsl,
    calculateFloorHsl, packHsl } from "../browser/floor-lighting.mjs";
import { buildTerrainMesh } from "../browser/world-webgl.mjs";
import { displayTerrainProgressively } from "../browser/world-startup.mjs";

function region(mapX=50,mapY=50){
    const terrain={mapX,mapY,side:64,heights:new Int32Array(4096),
        underlays:new Uint16Array(4096).fill(1),overlays:new Int16Array(4096)};
    for(let x=0;x<64;x++)for(let y=0;y<64;y++){
        terrain.heights[x*64+y]=(mapX*64+x)*8+(mapY*64+y)*16;
    }
    return terrain;
}
function surround(center){
    center.neighbours=new Map();
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(dx||dy)center.neighbours.set(`${dx},${dy}`,region(center.mapX+dx,center.mapY+dy));
    }
    return center;
}

test("adjacent meshes share exact world-space boundary heights and normals",()=>{
    const west=surround(region()),east=surround(region(51,50));
    for(const center of [west,east]){
        const mesh=buildTerrainMesh(center);
        assert.equal(mesh.length,64*64*36,"All 4096 tiles include the last row/column");
        for(let i=0;i<mesh.length;i+=6){
            const x=mesh[i]+31.5+center.mapX*64,y=mesh[i+2]+31.5+center.mapY*64;
            assert.equal(mesh[i+1],-(x*8+y*16)/32);
        }
    }
    const a=calculateVertexLights(west,65),b=calculateVertexLights(east,65);
    for(let y=0;y<=64;y++)assert.equal(a[64*65+y],b[y],`Shared normal at y=${y}`);
    assert.ok(a.every(n=>n===a[32*65+32]),"Linear slope has the same light at every border");
    assert.equal(sampleTerrain(west,"heights",64,64),region(51,51).heights[0]);
    assert.equal(sampleTerrain(west,"heights",-1,-1),region(49,49).heights[4095]);
});

test("missing neighbours omit unsupported edge geometry instead of copying heights",()=>{
    const center=region();center.neighbours=new Map([["1,0",region(51,50)]]);
    assert.equal(buildTerrainMesh(center).length,64*63*36);
    assert.equal(sampleTerrain(center,"heights",64,64),undefined);
    center.neighbours.set("0,1",region(50,51));
    assert.equal(buildTerrainMesh(center).length,(4096-1)*36,"Corner requires the diagonal");
});

test("halo underlay blending matches a world-coordinate radius-five reference",()=>{
    const center=surround(region());
    const materials={underlays:new Map([[0,{rgb:0xff0000}],[1,{rgb:0x00ff00}],
        [2,{rgb:0x0000ff}]]),overlays:new Map()};
    for(const terrain of [center,...center.neighbours.values()]){
        for(let x=0;x<64;x++)for(let y=0;y<64;y++){
            terrain.underlays[x*64+y]=1+(terrain.mapX*64+x+terrain.mapY*64+y)%3;
        }
    }
    const colors=blendUnderlayHsl(center,materials);
    for(const x of [0,1,4,31,59,62,63])for(const y of [0,1,4,31,59,62,63]){
        const sum=[0,0,0,0];
        for(let dx=-4;dx<=5;dx++)for(let dy=-4;dy<=5;dy++){
            const id=sampleTerrain(center,"underlays",x+dx,y+dy);
            const def=calculateFloorHsl(materials.underlays.get(id-1).rgb);
            [def.hue,def.saturation,def.lightness,def.hueMultiplier].forEach((n,i)=>sum[i]+=n);
        }
        const expected=packHsl(Math.trunc(sum[0]*256/sum[3]),Math.trunc(sum[1]/100),Math.trunc(sum[2]/100));
        assert.equal(colors[x*64+y],expected,`Blend ${x},${y}`);
    }
    center.neighbours.get("1,1").underlays[0]=500;
    assert.equal(blendUnderlayHsl(center,materials)[63*64+63],-1,"Unknown halo definition suppresses blend");
});

function container(data){
    const header=Buffer.alloc(5);header.writeUInt32BE(data.length,1);
    return Buffer.concat([header,data]);
}
function mockCache(){
    const groups=new Map(),entries=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(!dx&&!dy||dx===-1&&dy===-1)continue; // one absent region
        const id=entries.length+1;
        const tiles=Buffer.alloc(4*4096*3);
        for(let i=0;i<tiles.length;i+=3){tiles[i+1]=1;tiles[i+2]=10;}
        const bytes=container(tiles);
        entries.push({id,hash:djb2(`m${50+dx}_${50+dy}`),crc:crc32(bytes)});
        groups.set(id,bytes);
    }
    const n=entries.length,ref=Buffer.alloc(8+n*22);
    ref[0]=7;ref.writeUInt32BE(90871,1);ref[5]=1;ref.writeUInt16BE(n,6);
    let at=8;
    for(const entry of entries){ref.writeUInt16BE(1,at);at+=2;}
    for(const entry of entries){ref.writeInt32BE(entry.hash,at);at+=4;}
    for(const entry of entries){ref.writeUInt32BE(entry.crc,at);at+=4;}
    at+=4*n;
    for(const entry of entries){ref.writeUInt16BE(1,at);at+=2;}
    at+=2*n+4*n;
    assert.equal(at,ref.length);
    const reference=container(ref),master=Buffer.alloc(6*8);
    master.writeUInt32BE(crc32(reference),40);master.writeUInt32BE(90871,44);
    const cache=new NativeJs5Cache({WebSocketClass:class Mock {}}),requests=[];
    cache.fetchRawGroup=async(a,g)=>{
        requests.push(`${a}:${g}`);
        const bytes=a===255?(g===255?container(master):reference):groups.get(g);
        return {archive:a,group:g,container:bytes,compression:0,uncompressedBytes:bytes.readUInt32BE(1)};
    };
    groups.get(1)[10]^=1; // one corrupt region, which must not enter the halo
    return {cache,requests};
}

test("neighbour loader retains CRC validation, skips absent regions and reports partial halo",async()=>{
    const {cache,requests}=mockCache();
    const terrain=region(),scene=await loadTerrainNeighbours(cache,terrain);
    assert.equal(scene.neighbours.size,6,JSON.stringify(scene.unavailableNeighbours));
    assert.equal(scene.unavailableNeighbours.length,2);
    assert.ok(scene.unavailableNeighbours.some(n=>/CRC mismatch/.test(n.reason)));
    assert.ok(scene.unavailableNeighbours.some(n=>/not present/.test(n.reason)));
    assert.equal(requests.filter(r=>r.startsWith("5:")).length,7);
    assert.equal(terrain.neighbours,undefined,"Do not mutate the already displayed region");
});

test("obsolete neighbour loading stops further requests and discards the halo",async()=>{
    const {cache,requests}=mockCache();let current=true;
    const original=cache.loadGroup.bind(cache);
    cache.loadGroup=async(...args)=>{const value=await original(...args);current=false;return value;};
    assert.ok(await loadTerrainNeighbours(cache,region(),{isCurrent:()=>current})===null);
    assert.equal(requests.filter(r=>r.startsWith("5:")).length,2,"First region corrupt; stop after next valid region");
});

test("neighbour enrichment keeps first paint immediate and ignores late original materials",async()=>{
    const scene=region(),enriched=surround(region()),steps=[];
    let finishInitial;
    const work=displayTerrainProgressively({terrain:scene,
        renderTerrain(){steps.push("initial geometry");},
        fetchMaterials(value){return value===scene?new Promise(resolve=>{finishInitial=resolve;}):"halo floors";},
        fetchNeighbours(){return enriched;},
        applyNeighbours(value){assert.equal(value,enriched);steps.push("edge geometry");},
        applyMaterials(value,floors){assert.equal(value,enriched);steps.push(floors);},
        onMaterialError(error){throw error;},
    });
    assert.deepEqual(steps,["initial geometry"]);
    await new Promise(resolve=>setImmediate(resolve));
    finishInitial("old floors");await work;
    assert.deepEqual(steps,["initial geometry","edge geometry","halo floors"]);
});

test("Travel during neighbour loading prevents late geometry and material updates",async()=>{
    let finishNeighbours,current=true;
    const steps=[];
    const work=displayTerrainProgressively({terrain:region(),
        renderTerrain(){steps.push("initial geometry");},
        fetchMaterials(){steps.push("initial floors requested");return {};},
        fetchNeighbours(){return new Promise(resolve=>{finishNeighbours=resolve;});},
        applyNeighbours(){steps.push("stale geometry");},
        applyMaterials(){steps.push("stale floors");},
        onMaterialError(error){throw error;},isCurrent:()=>current,
    });
    await Promise.resolve();current=false;
    finishNeighbours(surround(region()));await work;
    assert.deepEqual(steps,["initial geometry","initial floors requested"]);
});
