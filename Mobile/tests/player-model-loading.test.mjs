import assert from "node:assert/strict";
import {test} from "node:test";
import {NativePlayerModels} from "../browser/player-models.mjs";

test("equipment model fetches overlap but composition retains original OSRS slot order",async()=>{
    const models=new NativePlayerModels({});
    let inflight=0,maximum=0;
    models.config=async(_group,id)=>({modelIds:[id+1000]});
    models.model=async id=>{
        inflight++;maximum=Math.max(maximum,inflight);
        await new Promise(resolve=>setTimeout(resolve,[30,3,12,1][id-1000]??1));
        inflight--;
        return {verticesCount:3,faceCount:1,
            verticesX:Int32Array.of(id, id+128,id),
            verticesY:Int32Array.of(0,0,128),
            verticesZ:Int32Array.of(0,0,0),
            indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),
            faceColors:Uint16Array.of(21000+id-1000),
        };
    };
    models.textures.load=async()=>{};
    const appearance={equipment:[256,257,258,259,...Array(8).fill(0)],colours:[0,0,0,0,0],
        gender:0,customisations:[],transformedNpcId:-1};
    const mesh=await models.composition(appearance);
    assert.deepEqual([...mesh.faceColors],[21000,21001,21002,21003]);
    assert.equal(mesh.faceCount,4);
    assert.ok(maximum>=4,"four independent equipment slots should fetch together");
    assert.ok(maximum<=6,"parallelism must remain bounded to six slots");
    assert.strictEqual(await models.composition(appearance),mesh,"composed appearance is cached");
});

test("missing required wearable texture rejects the player model instead of omitting faces",async()=>{
    const models=new NativePlayerModels({});
    models.config=async()=>({modelIds:[1000]});
    models.model=async()=>({
        verticesCount:3,faceCount:1,
        verticesX:Int32Array.of(0,128,0),verticesY:Int32Array.of(0,0,128),
        verticesZ:Int32Array.of(0,0,0),indices1:Int32Array.of(0),
        indices2:Int32Array.of(1),indices3:Int32Array.of(2),
        faceColors:Uint16Array.of(21000),faceTextures:Int16Array.of(5),
    });
    models.textures.load=async()=>null;
    const appearance={equipment:[256,...Array(11).fill(0)],colours:[0,0,0,0,0],
        gender:0,customisations:[],transformedNpcId:-1};
    await assert.rejects(models.composition(appearance),/Player model texture 5 unavailable/);
});
