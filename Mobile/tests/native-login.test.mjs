import assert from "node:assert/strict";
import {test} from "node:test";
import {createServer} from "node:net";
import {once} from "node:events";
import {createHash} from "node:crypto";
import WebSocket from "ws";
import {createGateway} from "../gateway/server.mjs";
import {NativeGameSession} from "../browser/native-login.mjs";
import {IsaacCipher} from "../browser/login-crypto.mjs";
import {SERVER_PACKETS} from "../browser/game-protocol.mjs";
import {fixtureKey,decodeFixtureLogin} from "./helpers/login-fixtures.mjs";
import {createServer as createHttpServer} from "node:http";
import {spawn} from "node:child_process";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve,dirname,basename} from "node:path";

const sessionId=Buffer.from("123456789abcdef0","hex");
function gamePacket(cipher,opcode,payload){
    const header=opcode<128?[(opcode+cipher.nextInt())&255]:
        [((opcode>>>8|128)+cipher.nextInt())&255,((opcode&255)+cipher.nextInt())&255];
    const size=SERVER_PACKETS.get(opcode).size;
    if(size===-1)header.push(payload.length);
    if(size===-2)header.push(payload.length>>>8,payload.length&255);
    return Buffer.concat([Buffer.from(header),payload]);
}
async function mockNativeWorld({code=2,token=false,pow=false,stall=false,malformed=false,fragmentEveryByte=false}={}){
    const {rsa,privateKey}=fixtureKey(),sockets=new Set(),received=[],heartbeats=[];
    let fixtureError,parsed,serverCipher,clientCipher,stage="hello",input=Buffer.alloc(0),powSolved=false;
    const tcp=createServer(socket=>{
        sockets.add(socket);socket.on("close",()=>sockets.delete(socket));socket.on("error",()=>{});
        function accepted(){
            const metadata=Buffer.alloc(34);metadata[0]=token?1:0;metadata[8]=42;metadata[9]=1;
            if(token)for(let i=1;i<=4;i++)metadata[i]=(i+serverCipher.nextInt())&255;
            const wire=Buffer.concat([Buffer.from([2,malformed?36:37]),metadata,
                gamePacket(serverCipher,39,Buffer.from([1,2,3,4,5])),
                gamePacket(serverCipher,136,Buffer.from([9,8,7,6])), // encrypted smart opcode > 127
                gamePacket(serverCipher,44,Buffer.from([6,5])),
                gamePacket(serverCipher,17,Buffer.alloc(0))]);
            // Metadata and first game header share a write; every portion can fragment.
            if(fragmentEveryByte){
                for(let i=0;i<wire.length;i++)setTimeout(()=>{if(!socket.destroyed)socket.write(wire.subarray(i,i+1));},i*2);
            }else{
                socket.write(wire.subarray(0,1));setTimeout(()=>socket.write(wire.subarray(1,17)),2);
                setTimeout(()=>socket.write(wire.subarray(17,37)),4);
                setTimeout(()=>socket.write(wire.subarray(37,38)),6);
                setTimeout(()=>socket.write(wire.subarray(38,39)),8);
                setTimeout(()=>socket.write(wire.subarray(39)),10);
            }
            stage="game";
        }
        socket.on("data",part=>{
            try{
                input=Buffer.concat([input,part]);
                if(stage==="hello"&&input.length){
                    assert.equal(input[0],14);received.push(input.subarray(0,1));input=input.subarray(1);stage="login";
                    if(stall)return;
                    socket.write(Buffer.from([0]));setTimeout(()=>socket.write(sessionId.subarray(0,3)),2);
                    setTimeout(()=>socket.write(sessionId.subarray(3)),4);
                }
                if(stage==="login"&&input.length>=3&&input.length>=3+input.readUInt16BE(1)){
                    const length=3+input.readUInt16BE(1),packet=input.subarray(0,length);received.push(packet);input=input.subarray(length);
                    parsed=decodeFixtureLogin(packet,privateKey);
                    assert.equal(parsed.username,"native-test");assert.equal(parsed.password,"fixture-only");assert.deepEqual(parsed.sessionId,sessionId);
                    serverCipher=new IsaacCipher(parsed.seed.map(n=>(n+50)|0));clientCipher=new IsaacCipher(parsed.seed);
                    if(code!==2){socket.end(Buffer.from([code]));stage="rejected";return;}
                    if(pow){
                        const challenge=Buffer.from([0,1,8,...Buffer.from("gateway-salt"),0]);
                        stage="pow";socket.write(Buffer.from([69,0]));
                        setTimeout(()=>socket.write(Buffer.concat([Buffer.from([challenge.length]),challenge])),2);
                    }else accepted();
                }
                if(stage==="pow"&&input.length>=11){
                    assert.deepEqual([...input.subarray(0,3)],[19,0,8]);
                    const nonce=input.readBigUInt64BE(3);
                    assert.equal(createHash("sha256").update("18gateway-salt"+nonce.toString(16)).digest()[0],0);
                    input=input.subarray(11);powSolved=true;accepted();
                }
                if(stage==="game")for(const b of input)heartbeats.push((b-clientCipher.nextInt())&255);
                if(stage==="game")input=Buffer.alloc(0);
            }catch(error){fixtureError=error;socket.destroy();}
        });
    });
    tcp.listen(0,"127.0.0.1");await once(tcp,"listening");
    const allowedOrigins=new Set(["http://localhost:3001"]);
    const gateway=createGateway({tcpHost:"127.0.0.1",tcpPort:tcp.address().port,allowedOrigins});
    gateway.httpServer.listen(0,"127.0.0.1");await once(gateway.httpServer,"listening");
    class BrowserSocket extends WebSocket {constructor(url){super(url,{origin:"http://localhost:3001"});}}
    return {rsa,url:`ws://127.0.0.1:${gateway.httpServer.address().port}/`,WebSocketClass:BrowserSocket,received,heartbeats,allowedOrigins,
        get parsed(){return parsed;},get powSolved(){return powSolved;},
        async close(){await gateway.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>tcp.close(resolve));if(fixtureError)throw fixtureError;}};
}
const credentials={username:"native-test",password:"fixture-only"};
const config=world=>({revision:240,rsa:world.rsa,crcs:Array(23).fill(0)});

test("native encrypted login crosses the actual gateway, handles fragmented success, smart opcodes and ISAAC heartbeats",{timeout:10000},async()=>{
    for(const token of [false,true]){
        const world=await mockNativeWorld({token,pow:true,fragmentEveryByte:token}),packets=[];
        const session=new NativeGameSession({...world,heartbeatMs:25,onPacket:packet=>packets.push(packet)});
        try{
            const result=await session.login(credentials,config(world));assert.equal(result.playerIndex,42);assert.equal(result.member,true);
            await new Promise(resolve=>setTimeout(resolve,100));
            assert.ok(world.powSolved);assert.deepEqual(packets.map(p=>p.opcode),[39,136,44,17]);
            assert.deepEqual([...packets[0].payload],[1,2,3,4,5]);assert.deepEqual([...packets[1].payload],[9,8,7,6]);
            assert.ok(world.heartbeats.length>=1);assert.ok(world.heartbeats.every(opcode=>opcode===99));
            assert.equal(session.pendingLogin,null);
            const wire=Buffer.concat(world.received);assert.ok(!wire.includes(Buffer.from(credentials.password)));
            session.close();assert.ok(session.decodeCipher.memory.every(n=>n===0));assert.equal(session.connected,false);
        }finally{session.close();await world.close();}
    }
});
test("native login rejection preserves the server code and clears pending cipher state",async()=>{
    for(const code of [3,6,8,56,57]){
        const world=await mockNativeWorld({code}),session=new NativeGameSession(world);
        try{await assert.rejects(session.login(credentials,config(world)),error=>error.code===code);
            assert.equal(session.state,"closed");assert.equal(session.pendingLogin,null);assert.ok(session.encodeCipher.results.every(n=>n===0));
        }finally{session.close();await world.close();}
    }
});
test("native login cancellation and timeout close the gateway socket and clear unsent credentials",async()=>{
    for(const cancel of [false,true]){
        const world=await mockNativeWorld({stall:true}),session=new NativeGameSession({...world,timeoutMs:100});
        try{
            const pending=session.login(credentials,config(world));
            if(cancel)session.close();
            await assert.rejects(pending,cancel?/disconnected/:/timed out/);
            assert.equal(session.pendingLogin,null);assert.equal(session.buffer.length,0);assert.equal(session.state,"closed");
        }finally{session.close();await world.close();}
    }
});
test("native login fails closed on a mismatched success layout",async()=>{
    const world=await mockNativeWorld({malformed:true}),session=new NativeGameSession(world);
    try{await assert.rejects(session.login(credentials,config(world)),/success size/);}
    finally{session.close();await world.close();}
});
test("login refuses insecure remote gateway URLs and wrong revision before opening a socket",()=>{
    assert.throws(()=>new NativeGameSession({url:"ws://example.com/"}),/loopback/);
    const {rsa}=fixtureKey();const session=new NativeGameSession({WebSocketClass:class{constructor(){throw new Error("Should not open");}}});
    assert.throws(()=>session.login(credentials,{rsa,revision:239,crcs:[]}),/revision 240/);
});

test("real Chrome completes RSA/XTEA, SHA-256 challenge and ISAAC session through the gateway",
    {timeout:60000,skip:process.platform!=="linux"&&!process.env.CHROME_BIN},async()=>{
    const world=await mockNativeWorld({pow:true,token:true,fragmentEveryByte:true});
    let report;
    const result=new Promise(done=>{report=done;});
    const html=`<!doctype html><script type="module">
import {NativeGameSession} from '/native-login.mjs';
let session;
try{
    const packets=[];
    session=new NativeGameSession({url:${JSON.stringify(world.url)},heartbeatMs:25,onPacket:p=>packets.push(p.opcode)});
    const account=await session.login({username:'native-test',password:'fixture-only'},${JSON.stringify(config(world))});
    await new Promise(done=>setTimeout(done,150));
    if(account.playerIndex!==42||packets.join(',')!=='39,136,44,17')throw new Error('Native session mismatch');
    session.close();
    await fetch('/result?status=pass');
}catch(error){session?.close();await fetch('/result?status='+encodeURIComponent(error.message));}
</script>`;
    const modules=new Set(["native-login","native-js5","login-crypto","login-protocol","login-pow","game-protocol"].map(n=>"/"+n+".mjs"));
    const http=createHttpServer(async(req,res)=>{
        try{
            if(req.url.startsWith("/result?")){report(new URL(req.url,"http://localhost").searchParams.get("status"));res.end("received");}
            else if(req.url==="/"){res.writeHead(200,{"Content-Type":"text/html"});res.end(html);}
            else if(modules.has(req.url)){res.writeHead(200,{"Content-Type":"text/javascript"});res.end(await readFile(new URL("../browser"+req.url,import.meta.url)));}
            else{res.writeHead(404);res.end();}
        }catch{res.writeHead(500);res.end();}
    });
    http.listen(0,"127.0.0.1");await once(http,"listening");
    world.allowedOrigins.add("http://127.0.0.1:"+http.address().port);
    const profile=await mkdtemp(join(tmpdir(),"soloscape-login-chrome-"));let child,timer;
    try{
        child=spawn(process.env.CHROME_BIN||"/usr/bin/google-chrome",["--headless","--no-sandbox","--disable-dev-shm-usage",
            "--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-extensions",
            "--user-data-dir="+profile,"http://127.0.0.1:"+http.address().port+"/"],{stdio:["ignore","ignore","pipe"]});
        const failed=new Promise((_,reject)=>{
            child.once("error",reject);child.once("exit",()=>reject(new Error("Chrome exited before login result")));
            timer=setTimeout(()=>reject(new Error("Chrome login result timed out")),40000);
        });
        child.stderr.resume();
        assert.equal(await Promise.race([result,failed]),"pass");assert.ok(world.powSolved);assert.ok(world.heartbeats.length>0);
    }finally{
        clearTimeout(timer);
        if(child&&child.exitCode===null&&child.signalCode===null){child.kill("SIGKILL");await once(child,"exit");}
        await new Promise(done=>http.close(done));await world.close();
        // Verify the exact temporary profile directory before recursive cleanup on Windows.
        assert.equal(dirname(resolve(profile)),resolve(tmpdir()));assert.ok(basename(profile).startsWith("soloscape-login-chrome-"));
        await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    }
});
