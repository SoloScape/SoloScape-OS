// No accounts/cache captures: compare browser packets to the installed JVM library.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {decodeInterfacePacket,encodeInterfaceButton} from "../browser/interface-protocol.mjs";
const jars=process.env.SOLOSCAPE_RSPROT_LIB_DIR??fileURLToPath(new URL("../../Server/server/app/build/install/app/lib/",import.meta.url));
const uid=0x12345678,widget={uid,isIf3:true,flags:2,actions:["Use"]};
const buttons=[widget,{uid,isIf3:false,buttonType:1},{uid,isIf3:false,buttonType:6}]
    .map(w=>Buffer.from(encodeInterfaceButton(w).payload).toString("hex"));
const result=spawnSync(process.env.JAVA_BIN??"java",["-cp",join(jars,"*"),
    fileURLToPath(new URL("../tests/fixtures/RsprotInterfaceOracle.java",import.meta.url)),...buttons],
    {encoding:"utf8",timeout:30000});
if(result.error)throw result.error;
assert.equal(result.status,0,"Interface JVM oracle failed: "+result.stderr);
assert.match(result.stdout,/INTERFACE_ORACLE_PASS/);
const expected=new Map([
    ["IF_OPENTOP",{kind:"top",groupId:0x1234}],
    ["IF_OPENSUB",{kind:"open",uid,groupId:0x1234,type:0}],
    ["IF_CLOSESUB",{kind:"close",uid}],
    ["IF_MOVESUB",{kind:"move",source:uid,destination:0xabcdef12}],
    ["IF_SETTEXT",{kind:"patch",uid,patch:{text:"Hi"}}],
    ["IF_SETHIDE",{kind:"patch",uid,patch:{hidden:true}}],
    ["IF_SETCOLOUR",{kind:"patch",uid,patch:{color:0xf800f8}}],
    ["IF_SETSCROLLPOS",{kind:"patch",uid,patch:{scrollY:300}}],
    ["IF_SETPOSITION",{kind:"patch",uid,patch:{rawX:-300,rawY:700,legacyX:-300,legacyY:700,xPositionMode:0,yPositionMode:0}}],
    ["IF_SETEVENTS_V2",{kind:"events",uid,start:-1,end:-1,flags:0x01020304,flags2:0x05060708}],
    ["IF_RESYNC_V2",{kind:"resync",groupId:10,mounts:[{uid,groupId:11,type:0}],events:[{uid,start:-1,end:-1,flags:2,flags2:0}]}],
]);
let count=0;
for(const line of result.stdout.trim().split(/\r?\n/)){
    const match=line.match(/^(IF_\w+) ([0-9a-f]+)$/);if(!match)continue;
    const [,name,hex]=match;
    assert.deepEqual(decodeInterfacePacket({name,payload:new Uint8Array(Buffer.from(hex,"hex"))}),expected.get(name),name);
    count++;
}
assert.equal(count,expected.size);
console.log(`Installed rsprot interoperates with all ${count} interface packet layouts and IF1/IF3/Continue buttons`);
