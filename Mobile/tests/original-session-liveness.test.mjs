import test from "node:test";
import assert from "node:assert/strict";
import {createServer as createTcpServer} from "node:net";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import WebSocket from "ws";
import {createGateway} from "../gateway/server.mjs";

async function harness({heartbeatIntervalMs=20,heartbeatTimeoutMs=100}={}){
    const events=[];
    const tcpSockets=new Set();
    let tcpClose;
    const closed=new Promise(resolve=>{tcpClose=resolve;});
    const tcp=createTcpServer(socket=>{
        tcpSockets.add(socket);
        socket.on("close",()=>{tcpSockets.delete(socket);tcpClose();});
        socket.on("error",()=>{});
        socket.on("data",packet=>socket.write(packet));
    });
    tcp.listen(0,"127.0.0.1");
    await once(tcp,"listening");
    const gateway=createGateway({tcpHost:"127.0.0.1",tcpPort:tcp.address().port,
        allowedOrigins:new Set(["http://localhost:3001"]),
        heartbeatIntervalMs,heartbeatTimeoutMs,
        onActivity:(kind,value,id)=>events.push({kind,value,id})});
    gateway.httpServer.listen(0,"127.0.0.1");
    await once(gateway.httpServer,"listening");
    const url="ws://127.0.0.1:"+gateway.httpServer.address().port+"/";
    const cleanup=async()=>{
        await gateway.close();
        for(const socket of tcpSockets)socket.destroy();
        await new Promise(resolve=>tcp.close(resolve));
    };
    return {url,events,closed,cleanup};
}
async function connected(h,options={}){
    const ws=new WebSocket(h.url,{origin:"http://localhost:3001",...options});
    await once(ws,"open");
    const echoed=once(ws,"message");
    ws.send(Buffer.from([14,0x11,0x22]));
    assert.deepEqual((await echoed)[0],Buffer.from([14,0x11,0x22]));
    return ws;
}

test("abandoned iPhone WebSocket is timed out and its native game TCP session is closed",{
    timeout:8000
},async()=>{
    const h=await harness({heartbeatIntervalMs:20,heartbeatTimeoutMs:120});
    try{
        // Simulates a force-quit transport: accepted packets still look alive,
        // but Safari is no longer responding to WebSocket ping control frames.
        const ws=await connected(h,{autoPong:false});
        const closeEvent=once(ws,"close");
        const [code]=await closeEvent;
        assert.equal(code,1001,"gateway expires the dead browser, not the game server");
        await h.closed;
        assert.ok(h.events.some(e=>e.kind==="closed:Browser heartbeat timeout"));
        assert.equal(h.events.filter(e=>e.kind.startsWith("closed:")).length,1,
            "do not emit duplicate disconnects");
    }finally{await h.cleanup();}
});

test("responsive WebSocket Pong traffic keeps the real game TCP session alive",{
    timeout:8000
},async()=>{
    // Under the full parallel suite, scheduling can briefly exceed 200ms.
    // Allow realistic event-loop jitter while running for longer than the
    // configured timeout, proving that periodic native Pong traffic renews it.
    const h=await harness({heartbeatIntervalMs:50,heartbeatTimeoutMs:1500});
    try{
        const ws=await connected(h);
        await delay(1900);
        assert.equal(ws.readyState,WebSocket.OPEN,"healthy mobile browser must not be kicked");
        assert.equal(h.events.some(e=>e.kind.startsWith("closed:")),false);
        const closed=once(ws,"close");
        ws.close(1000);
        await closed;
        await h.closed;
        assert.ok(h.events.some(e=>e.kind==="closed:Browser closed"));
    }finally{await h.cleanup();}
});

test("browser socket installs pagehide and visibilitychange cleanup without collecting credentials",async()=>{
    const java=await readFile(new URL(
        "../teavm-poc/engine-src/org/soloscape/teavm/platform/net/Socket.java",
        import.meta.url),"utf8");
    const script=/@JSBody\(params=\{"route","done"\},script="([^"]*)"\)/.exec(java)?.[1];
    assert.ok(script,"extract the actual original Java WebSocket opener");
    const setup=()=>{
        const handlers=new Map(),pageHandlers=new Map(),closes=[];
        const document={visibilityState:"visible",
            addEventListener:(n,fn)=>handlers.set(n,fn),
            removeEventListener:(n,fn)=>{if(handlers.get(n)===fn)handlers.delete(n);}};
        const window={addEventListener:(n,fn)=>pageHandlers.set(n,fn),
            removeEventListener:(n,fn)=>{if(pageHandlers.get(n)===fn)pageHandlers.delete(n);}};
        let ws;
        class FakeWebSocket{
            constructor(url){this.url=url;this.binaryType="";this.close=(code,reason)=>closes.push([code,reason]);ws=this;}
        }
        let handle,error;
        runInNewContext(script,{WebSocket:FakeWebSocket,document,window,route:"ws://127.0.0.1:43595/",
            done:(result,err)=>{handle=result;error=err;},
            setTimeout,clearTimeout,Uint8Array});
        ws.onopen();
        assert.ok(handle&&!error);
        return {ws,closes,document,handlers,pageHandlers};
    };
    const hidden=setup();
    assert.equal(hidden.handlers.has("visibilitychange"),true);
    hidden.document.visibilityState="hidden";
    hidden.handlers.get("visibilitychange")();
    assert.deepEqual(hidden.closes,[[1000,"Page left"]]);
    hidden.ws.onclose({code:1000});
    assert.equal(hidden.handlers.size,0);
    assert.equal(hidden.pageHandlers.size,0);

    const exit=setup();
    exit.pageHandlers.get("pagehide")();
    assert.deepEqual(exit.closes,[[1000,"Page left"]]);
    exit.ws.onclose({code:1000});
    assert.equal(exit.handlers.size,0);
    assert.equal(exit.pageHandlers.size,0);
    assert.doesNotMatch(script,/password|username|loginPayload|credentials/i);
});
