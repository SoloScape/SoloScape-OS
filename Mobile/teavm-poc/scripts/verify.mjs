import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {delimiter,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {findTeaVmJdk} from "../../scripts/build-teavm.mjs";

// Runs compiled TeaVM output, not any hand-written renderer.
const file=new URL("../target/javascript/bridge.js",import.meta.url);
let source;
try{source=await readFile(file,"utf8");}
catch{throw new Error("Build original rev-240 renderer first: npm run build:teavm");}
const module=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
assert.equal(module.revision(),240);
assert.equal(module.mapSquare(3200,3200),12850);
assert.equal(module.mapSquare(0,0),0);
assert.equal(module.mapSquare(16383,16383),65535);
assert.equal(module.crc32Hex("313233343536373839")>>>0,0xcbf43926);
assert.equal(module.crc32Hex("")>>>0,0);
assert.throws(()=>module.crc32Hex("X1"));
assert.throws(()=>module.mapSquare(-1,200));
console.log("PASS: TeaVM exports real Java functions and rev-240 OSRS map/CRC primitives.");

assert.equal(module.width(),256);
assert.equal(module.height(),160);
const frame=module.renderHex();
assert.equal(frame.length,256*160*6);
assert.match(frame,/^[0-9a-f]+$/);
const at=(x,y)=>Number.parseInt(frame.slice((y*256+x)*6,(y*256+x+1)*6),16);
assert.equal(at(0,0),0x101922,"rev-240 original rasterizer paints background");
assert.equal(at(15,15),0x30435a,"filled inner background");
assert.equal(at(28,28),0xd5a15f,"first primitive rectangle");
assert.equal(at(90,63),0x662eae,"overlap obeys draw order");
assert.equal(at(50,128),0xcf6859,"clip intersects a rectangle");
assert.equal(at(50,145),0x30435a,"original rasterizer clips below y=138");

let hash=0x811c9dc5;
for(let p=0;p<frame.length;p+=6){
    hash^=Number.parseInt(frame.slice(p,p+6),16);
    hash=Math.imul(hash,0x01000193);
}
assert.equal(module.framebufferHash()>>>0,hash>>>0,"TeaVM pixel bytes/hash agree internally");

// Critically compare TeaVM against ORIGINAL unmodified yw.class inside local
// injected-client.oprs. The generated mini-JAR only isolates intact methods.
const mobile=fileURLToPath(new URL("../../",import.meta.url));
const original=join(mobile,"teavm-poc","target","gamepack","injected-client.oprs");
const api=resolve(mobile,"..","..","Client","runelite-api","build","libs","runelite-api-1.2.0.jar");
const classes=join(mobile,"teavm-poc","target","classes");
const java=findTeaVmJdk().binary;
const native=spawnSync(java,["-cp",[classes,original,api].join(delimiter),"RendererBridge"],{
    encoding:"utf8",timeout:15000
});
assert.equal(native.status,0,"Original JVM gamepack failed: "+native.stderr);
const nativeHash=Number(native.stdout.trim());
assert.ok(Number.isInteger(nativeHash),"Original JVM must emit framebuffer hash");
assert.equal(hash>>>0,nativeHash,"TeaVM renderer pixels differ from original OpenOSRS JVM bytecode");
console.log("PASS: Original rev-240 OpenOSRS Rasterizer2D JVM hash exactly equals TeaVM pixel output (256x160).");

const vertices=[
    -40,-40,-40,40,-40,-40,40,40,-40,-40,40,-40,
    -40,-40,40,40,-40,40,40,40,40,-40,40,40
].join(",");
const faces=[
    0,1,2,0xcf7153,0,2,3,0xcf7153,
    4,6,5,0x5098cb,4,7,6,0x5098cb,
    0,4,5,0xe0a449,0,5,1,0xe0a449,
    3,2,6,0x67a46a,3,6,7,0x67a46a,
    0,3,7,0xc07ba0,0,7,4,0xc07ba0,
    1,5,6,0x948fd8,1,6,2,0x948fd8
].join(",");
for(const yaw of [0,45,140,270]){
    const rgb=module.renderModelHex(vertices,faces,yaw);
    assert.equal(rgb.length,256*160*6);
    assert.match(rgb,/^[0-9a-f]+$/);
    assert.ok(rgb.includes("cf7153")||rgb.includes("5098cb")||rgb.includes("67a46a"),"model face pixels absent");
    const expected=module.modelHash(vertices,faces,yaw)>>>0;
    const nativeModel=spawnSync(java,["-cp",[classes,original,api].join(delimiter),"RendererBridge",vertices,faces,String(yaw)],{
        encoding:"utf8",timeout:15000
    });
    assert.equal(nativeModel.status,0,"Original rev-240 JVM model render failed: "+nativeModel.stderr);
    assert.equal(expected,Number(nativeModel.stdout.trim()),"Original rev-240 pixel raster differs from TeaVM at yaw "+yaw);
}
assert.throws(()=>module.renderModelHex("0,0,0","0,1,2,16711680",45),/Invalid model triangle layout/);
assert.throws(()=>module.renderModelHex(vertices,"0,1,9999,16711680",45),/index or color invalid/);
console.log("PASS: 12-face model at four yaw angles has exact TeaVM/JVM pixel parity with original rev-240 span fill.");
