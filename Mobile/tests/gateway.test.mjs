import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer as createTcpServer } from "node:net";
import { once } from "node:events";
import WebSocket from "ws";
import { parseGatewayEnvironment } from "../gateway/config.mjs";
import { createGateway } from "../gateway/server.mjs";

test("gateway configuration fails closed by default", () => {
    assert.throws(() => parseGatewayEnvironment({}), /opt-in/);
    const required = {
        SOLOSCAPE_GATEWAY_ENABLE_NATIVE: "1",
        SOLOSCAPE_GAME_TCP_PORT: "43594",
    };
    assert.throws(() => parseGatewayEnvironment(required), /ALLOWED_ORIGINS/);
    assert.throws(() => parseGatewayEnvironment({
        ...required, SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS: "*",
    }), /no wildcard/);
    assert.throws(() => parseGatewayEnvironment({
        ...required, SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS: "http://localhost:3001",
        SOLOSCAPE_GATEWAY_HOST: "0.0.0.0",
    }), /ALLOW_LAN/);
    const config = parseGatewayEnvironment({
        ...required,
        SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS: "http://localhost:3001,https://game.example.test",
    });
    assert.equal(config.listenPort, 43595);
    assert.deepEqual([...config.allowedOrigins], ["http://localhost:3001", "https://game.example.test"]);
});

async function startTcpServer() {
    const packets = [];
    const sockets = new Set();
    const server = createTcpServer(socket => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.on("data", data => {
            packets.push(Buffer.from(data));
            socket.write(data);
        });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    return {
        server, packets,
        async close() {
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => server.close(resolve));
        },
    };
}

test("gateway bridges a native binary handshake and rejects TSPS opcodes and untrusted origins", { timeout: 15000 }, async () => {
    const tcp = await startTcpServer();
    const { httpServer, close } = createGateway({
        tcpHost: "127.0.0.1",
        tcpPort: tcp.server.address().port,
        allowedOrigins: new Set(["http://localhost:3001"]),
    });
    httpServer.listen(0, "127.0.0.1");
    await once(httpServer, "listening");
    const address = `ws://127.0.0.1:${httpServer.address().port}/`;
    try {
        const blocked = new WebSocket(address, { origin: "https://untrusted.test" });
        const [error] = await once(blocked, "error");
        assert.match(error.message, /403/);

        const tsps = new WebSocket(address, { origin: "http://localhost:3001" });
        await once(tsps, "open");
        tsps.send(Buffer.from([200, 0])); // TSPS high-level HELLO, not a native OSRS handshake.
        const [code, reason] = await once(tsps, "close");
        assert.equal(code, 1003);
        assert.match(reason.toString(), /Incompatible protocol/);
        assert.equal(tcp.packets.length, 0);

        const native = new WebSocket(address, { origin: "http://localhost:3001" });
        await once(native, "open");
        const response = once(native, "message");
        const sent = Buffer.from([14, 0x11, 0x22]);
        native.send(sent);
        const [reply, isBinary] = await response;
        assert.equal(isBinary, true);
        assert.deepEqual(reply, sent);
        assert.deepEqual(Buffer.concat(tcp.packets), sent);
        native.close();
        await once(native, "close");
    } finally {
        await close();
        await tcp.close();
    }
});

test("gateway reports only fixed upstream close lifecycle without packet contents", {timeout:10000}, async()=>{
    const sockets=new Set();
    const tcp=createTcpServer(socket=>{
        sockets.add(socket);
        socket.on("close",()=>sockets.delete(socket));
        socket.once("data",()=>socket.end());
    });
    tcp.listen(0,"127.0.0.1");
    await once(tcp,"listening");
    const observed=[];
    const {httpServer,close}=createGateway({
        tcpHost:"127.0.0.1",tcpPort:tcp.address().port,
        allowedOrigins:new Set(["http://localhost:3001"]),
        onActivity:(kind,value,id)=>observed.push({kind,value,id})
    });
    httpServer.listen(0,"127.0.0.1");
    await once(httpServer,"listening");
    try{
        const address="ws://127.0.0.1:"+httpServer.address().port+"/";
        const ws=new WebSocket(address,{origin:"http://localhost:3001"});
        await once(ws,"open");
        ws.send(Buffer.from([14]));
        await once(ws,"close");
        assert.ok(observed.some(e=>e.kind==="connected"));
        assert.ok(observed.some(e=>e.kind==="upstreamBytes"));
        assert.deepEqual(observed.filter(e=>e.kind==="handshake").map(e=>e.value),
            ["GAME_INIT"],"Only a fixed handshake category is reported");
        const terminal=observed.filter(e=>e.kind.startsWith("closed:"));
        assert.equal(terminal.length,1,"each socket has exactly one terminal event");
        assert.equal(terminal[0].kind,"closed:Upstream closed");
        assert.equal(terminal[0].value,1000);
        assert.equal(terminal[0].id,observed[0].id);
        assert.ok(observed.every(e=>Object.keys(e).every(k=>["kind","value","id"].includes(k))));
    }finally{
        await close();
        for(const s of sockets)s.destroy();
        await new Promise(resolve=>tcp.close(resolve));
    }
});


test("gateway logs public native login result code but never any client login packet body", {timeout:10000}, async()=>{
    const sockets=new Set();
    const loginPayload=Buffer.from([16,77,88,99,44,55]); // synthetic fixture only
    const tcp=createTcpServer(socket=>{
        sockets.add(socket);socket.on("close",()=>sockets.delete(socket));
        let frames=0;
        socket.on("data",data=>{
            frames++;
            if(frames===1)socket.write(Buffer.from([0,11,12,13,14,15,16,17,18]));
            else if(frames===2)socket.end(Buffer.from([7]));
        });
    });
    tcp.listen(0,"127.0.0.1");await once(tcp,"listening");
    const observed=[];
    const {httpServer,close}=createGateway({
        tcpHost:"127.0.0.1",tcpPort:tcp.address().port,
        allowedOrigins:new Set(["http://localhost:3001"]),
        onActivity:(kind,value,id)=>observed.push({kind,value,id})
    });
    httpServer.listen(0,"127.0.0.1");await once(httpServer,"listening");
    try{
        const ws=new WebSocket("ws://127.0.0.1:"+httpServer.address().port+"/",
            {origin:"http://localhost:3001"});
        await once(ws,"open");
        ws.send(Buffer.from([14]));
        await once(ws,"message");
        ws.send(loginPayload);
        await once(ws,"close");
        assert.deepEqual(observed.filter(e=>e.kind==="gameInitStatus").map(e=>e.value),[0]);
        assert.deepEqual(observed.filter(e=>e.kind==="gameLoginStatus").map(e=>e.value),[7]);
        const summary=JSON.stringify(observed);
        assert.equal(summary.includes(loginPayload.toString("hex")),false);
        assert.ok(observed.every(e=>Object.keys(e).every(k=>["kind","value","id"].includes(k))));
    }finally{
        await close();for(const socket of sockets)socket.destroy();
        await new Promise(resolve=>tcp.close(resolve));
    }
});
