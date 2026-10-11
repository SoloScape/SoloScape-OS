import test from "node:test";
import assert from "node:assert/strict";
import {TitleLoginSession} from "../browser/title-login-session.mjs";

const config={revision:240,gatewayUrl:"ws://localhost:43595/",rsa:{modulus:"test",exponent:"10001"}};
const manifest=Array.from({length:23},(_,i)=>({archive:i,crc:i+1}));
const cache={loadMaster:async()=>manifest};
const input={username:"tester",password:"secret-value",otp:""};
test("TeaVM title login uses the verified native protocol and holds the authenticated session",async()=>{
    let options,seen,closed=0,authenticated,packets=[];
    const adapter=new TitleLoginSession({
        config,cache,
        createSession:o=>(options=o,{login:async(credentials,settings)=>{
            seen={...credentials,settings};
            const account={playerIndex:123,member:true,staffModLevel:0};
            options.onAuthenticated(account);
            return account;
        },close:()=>closed++}),
        onAuthenticated:x=>authenticated=x,onPacket:x=>packets.push(x)
    });
    assert.deepEqual(await adapter.login(input),{playerIndex:123,member:true,staffModLevel:0});
    assert.equal(seen.username,input.username);
    assert.equal(seen.password,input.password);
    assert.equal(seen.settings.crcs.length,23);
    assert.equal(seen.settings.width,765);assert.equal(seen.settings.height,503);
    assert.equal(seen.settings.gatewayUrl,config.gatewayUrl);
    assert.deepEqual(authenticated,{playerIndex:123,member:true,staffModLevel:0});
    assert.equal(adapter.authenticated,true);
    options.onPacket({opcode:39,name:"REBUILD_NORMAL_V2",payload:Uint8Array.of(1)});
    assert.deepEqual(packets,[{count:1,opcode:39,name:"REBUILD_NORMAL_V2"}]);
    assert.equal(packets[0].payload,undefined,"raw game packets are not passed into title UI");
    await assert.rejects(()=>adapter.login(input),/already active/);
    adapter.disconnect();
    assert.equal(closed,1);assert.equal(adapter.session,null);assert.equal(adapter.authenticated,false);
});
test("TeaVM title login shows native rejection and disposes the socket",async()=>{
    let closed=0;
    const adapter=new TitleLoginSession({config,cache,
        createSession:()=>({login:async()=>{throw new Error("Invalid username or password");},
            close:()=>closed++})});
    await assert.rejects(()=>adapter.login(input),/Invalid username or password/);
    assert.equal(closed,1);
    assert.equal(adapter.pending,false);
    assert.equal(adapter.session,null);
});
test("TeaVM title login cancels before opening a socket when cache is loading",async()=>{
    let resolveMaster,creates=0;
    const adapter=new TitleLoginSession({config,cache:{loadMaster:()=>new Promise(r=>resolveMaster=r)},
        createSession:()=>{creates++;throw new Error("Should not open");}});
    const pending=adapter.login(input);
    adapter.disconnect();
    resolveMaster(manifest);
    await assert.rejects(pending,/Login cancelled/);
    assert.equal(creates,0);assert.equal(adapter.pending,false);
});
test("TeaVM title login checks malformed OTP and credentials before networking",async()=>{
    let fetched=0;
    const adapter=new TitleLoginSession({config,cache:{loadMaster:async()=>{fetched++;return manifest;}}});
    await assert.rejects(()=>adapter.login({username:"",password:"pass"}),/username and password/);
    await assert.rejects(()=>adapter.login({...input,otp:"12345"}),/six digits/);
    assert.equal(fetched,0);
});
test("TeaVM authenticated session shows disconnect without leaking game packet payloads",async()=>{
    let options,closedMessage;
    const adapter=new TitleLoginSession({config,cache,
        createSession:o=>(options=o,{login:async()=>{
            const account={playerIndex:5};options.onAuthenticated(account);return account;
        },close:()=>{}}),
        onDisconnected:x=>closedMessage=x});
    await adapter.login(input);
    options.onClose("Server ended the native session");
    assert.equal(closedMessage,"Server ended the native session");
    assert.equal(adapter.session,null);
    assert.equal(adapter.authenticated,false);
});

test("rev-240 authenticated callback creates scene before first same-frame rebuild packet",async()=>{
    const order=[],rebuild=Uint8Array.of(1,2,3);
    const adapter=new TitleLoginSession({config,cache,
        onAuthenticated:()=>order.push("attach scene"),
        onGamePacket:packet=>{order.push("rebuild "+packet.name);assert.equal(packet.payload,rebuild);},
        onPacket:meta=>{order.push("metadata");assert.equal(meta.payload,undefined);},
        createSession:callbacks=>({
            login:async()=>{
                // Mirrors NativeGameSession.drain when login success and first
                // rebuild share a TCP/WebSocket frame.
                callbacks.onAuthenticated({playerIndex:48,member:true});
                callbacks.onPacket({name:"REBUILD_NORMAL_V2",opcode:39,payload:rebuild});
                return {playerIndex:48,member:true};
            },close:()=>{}
        })
    });
    await adapter.login(input);
    assert.deepEqual(order,["attach scene","rebuild REBUILD_NORMAL_V2","metadata"]);
    adapter.disconnect();
});
