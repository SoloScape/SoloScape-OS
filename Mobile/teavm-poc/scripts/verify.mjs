import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Run the actual TeaVM compilation output, not a hand-written JavaScript stub.
const file=new URL("../target/javascript/bridge.js",import.meta.url);
let source;
try{source=await readFile(file,"utf8");}
catch{throw new Error("Build the Java bytecode first: mvn package");}
const module=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
assert.equal(module.revision(),240);
assert.equal(module.mapSquare(3200,3200),12850);
assert.equal(module.mapSquare(0,0),0);
assert.equal(module.mapSquare(16383,16383),65535);
assert.equal(module.crc32Hex("313233343536373839")>>>0,0xcbf43926,"standard CRC32 check");
assert.equal(module.crc32Hex("")>>>0,0);
assert.throws(()=>module.crc32Hex("X1"));
assert.throws(()=>module.mapSquare(-1,200));
console.log("PASS: TeaVM-compiled Java module executes in Node with verified CRC32 and OSRS map math.");
