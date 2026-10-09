// Decode browser-produced, ISAAC-encrypted object actions with installed rsprot.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {encodeLocInteraction,encodeLocExamine} from "../browser/loc-interactions.mjs";
import {NativeGameSession} from "../browser/native-login.mjs";
import {IsaacCipher} from "../browser/login-crypto.mjs";
import {CLIENT_NO_TIMEOUT} from "../browser/game-protocol.mjs";

const frames=[],session=new NativeGameSession({url:"ws://127.0.0.1:43595/"});
session.state="game";session.connected=true;
session.encodeCipher=new IsaacCipher([1,2,3,4]);
session.socket={readyState:1,bufferedAmount:0,send:bytes=>frames.push(Buffer.from(bytes))};
for(const controlKey of [false,true])for(const subop of [0,7,255])for(let slot=0;slot<5;slot++){
    const packet=encodeLocInteraction(0x1234,0x123,0x456,slot,{controlKey,subop});
    session.sendGame(packet.opcode,packet.payload);
    session.sendGame(CLIENT_NO_TIMEOUT);
}
for(const id of [0,0x1234,65535]){
    const packet=encodeLocExamine(id);
    session.sendGame(packet.opcode,packet.payload);
    session.sendGame(CLIENT_NO_TIMEOUT);
}
session.encodeCipher.clear();
const jars=process.env.SOLOSCAPE_RSPROT_LIB_DIR??fileURLToPath(new URL("../../Server/server/app/build/install/app/lib/",import.meta.url));
const result=spawnSync(process.env.JAVA_BIN??"java",["-cp",join(jars,"*"),
    fileURLToPath(new URL("../tests/fixtures/RsprotLocOracle.java",import.meta.url)),
    Buffer.concat(frames).toString("hex")],{encoding:"utf8",timeout:30000});
if(result.error)throw result.error;
assert.equal(result.status,0,"Object JVM oracle failed: "+result.stderr);
assert.match(result.stdout,/LOC_ORACLE_PASS/);
console.log(result.stdout.split(/\r?\n/).find(line=>line.startsWith("LOC_ORACLE_PASS")));
