import test from "node:test";
import assert from "node:assert/strict";
import {serializeModel} from "../teavm-poc/site/model-payload.mjs";

const palette=new Int32Array(65536);
palette[60]=0xe9a653;
palette[61]=0x3299bb;
function model(){
    return {
        verticesCount:4,faceCount:2,
        verticesX:Int32Array.from([-32,32,32,-32]),
        verticesY:Int32Array.from([-32,-32,32,32]),
        verticesZ:Int32Array.from([0,0,0,0]),
        indices1:Int32Array.from([0,0]),indices2:Int32Array.from([1,2]),
        indices3:Int32Array.from([2,3]),faceColors:Uint16Array.from([60,61])
    };
}
test("TeaVM payload keeps actual model vertices, triangle indices and native HSL palette colors",()=>{
    const packed=serializeModel(model(),palette);
    assert.equal(packed.vertices,"-32,-32,0,32,-32,0,32,32,0,-32,32,0");
    assert.equal(packed.faces,"0,1,2,15312467,0,2,3,3316155");
    assert.equal(packed.renderedFaces,2);
    assert.equal(packed.vertexCount,4);
});
test("TeaVM model bridge safely omits textured, translucent, or unsupported triangles",()=>{
    const fixture=model();fixture.faceTextures=Int16Array.from([-1,123]);
    const packed=serializeModel(fixture,palette);
    assert.equal(packed.renderedFaces,1);
    assert.equal(packed.skippedFaces,1);
    fixture.faceAlphas=Int8Array.from([10,0]);
    assert.throws(()=>serializeModel(fixture,palette),/no supported untextured opaque triangles/);
});
test("TeaVM payload rejects out-of-bounds model indices and invalid asset data",()=>{
    const fixture=model();fixture.indices3[0]=1000;
    assert.throws(()=>serializeModel(fixture,palette),/index invalid/);
    fixture.indices3[0]=2;fixture.verticesX[0]=2000000;
    assert.throws(()=>serializeModel(fixture,palette),/Invalid model vertex/);
    fixture.verticesX[0]=-32;fixture.verticesCount=12001;
    assert.throws(()=>serializeModel(fixture,palette),/exceeds browser-safe limits/);
});
