import test from "node:test";
import assert from "node:assert/strict";
import {createGameLoginStatusObserver} from "../gateway/original-login-status.mjs";
function fixture(){
 const statuses=[];const observe=createGameLoginStatusObserver((kind,code)=>statuses.push({kind,code}));
 return {observe,statuses};
}
test("game handshake and subsequent public login result are classified without retaining challenge bytes",()=>{
 const f=fixture();
 f.observe.clientFrame(); // 14 (native game init); never read packet bodies
 f.observe.serverFrame(Buffer.from([0,12,34]));
 assert.deepEqual(f.statuses,[{kind:"gameInitStatus",code:0}]);
 f.observe.serverFrame(Buffer.from([56,78,90,123,45,67]));
 f.observe.clientFrame(); // encrypted login packet, contents never read
 f.observe.serverFrame(Buffer.from([7]));
 assert.deepEqual(f.statuses,[
  {kind:"gameInitStatus",code:0},{kind:"gameLoginStatus",code:7}
 ]);
 assert.doesNotMatch(JSON.stringify(f.statuses),/123|45|67|56|34/);
 f.observe.serverFrame(Buffer.from([2,3,4]));
 assert.equal(f.statuses.length,2,"only one login status may be reported");
});
test("login response in a combined TCP segment is counted after the challenge",()=>{
 const f=fixture();f.observe.clientFrame();f.observe.clientFrame();
 f.observe.serverFrame(Buffer.from([0,11,12,13,14,15,16,17,18,2,99]));
 assert.deepEqual(f.statuses,[{kind:"gameInitStatus",code:0},{kind:"gameLoginStatus",code:2}]);
});
test("client abort with no login response never invents a server rejection",()=>{
 const f=fixture();
 f.observe.clientFrame();
 f.observe.serverFrame(Buffer.from([0,0,0,0,0,0,0,0,0]));
 f.observe.clientFrame();
 assert.deepEqual(f.statuses,[{kind:"gameInitStatus",code:0}]);
});
test("rejected initial game handshake cannot be reported as a login result",()=>{
 const f=fixture(); f.observe.clientFrame();
 f.observe.serverFrame(Buffer.from([6]));
 f.observe.serverFrame(Buffer.from([14,15,16,17,18,19,20,21,22]));
 assert.deepEqual(f.statuses,[{kind:"gameInitStatus",code:6}]);
});
