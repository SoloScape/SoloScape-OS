import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:https";
import { createServer } from "node:net";
import WebSocket from "ws";
import { previewEnvironment, loadTlsEnvironment } from "../scripts/tls-config.mjs";
import { createGateway } from "../gateway/server.mjs";

test("LAN preview refuses plaintext and partial TLS configuration", () => {
    assert.throws(() => previewEnvironment({SOLOSCAPE_PREVIEW_HOST:"192.168.0.129"}), /requires a TLS/);
    assert.throws(() => loadTlsEnvironment({SOLOSCAPE_TLS_CERT_FILE:"cert"}), /both/);
    assert.throws(() => previewEnvironment({SOLOSCAPE_PREVIEW_PORT:"65536"}), /PORT/);
    assert.equal(previewEnvironment({}).host,"127.0.0.1");
});

test("trusted HTTPS preview and WSS gateway forward native traffic and reject other origins", {timeout:15000}, async () => {
    const dir = mkdtempSync(join(tmpdir(),"soloscape-lan-test-"));
    const cert = join(dir,"cert.pem"), key = join(dir,"key.pem"), publicKey = join(dir,"client.key");
    const openssl = process.env.OPENSSL_BIN || (process.platform === "win32" && existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
        ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl");
    let preview, gateway, tcp;
    const sockets = new Set();
    try {
        const result = spawnSync(openssl,["req","-x509","-newkey","rsa:2048","-nodes","-days","1",
            "-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1,DNS:localhost","-keyout",key,"-out",cert]);
        assert.equal(result.status,0,result.error?.message || result.stderr?.toString());
        writeFileSync(publicKey,`Exponent: 10001\nModulus: ${"f".repeat(256)}\n`);
        const env = {...process.env,SOLOSCAPE_TLS_CERT_FILE:cert,SOLOSCAPE_TLS_KEY_FILE:key,
            SOLOSCAPE_PREVIEW_HOST:"127.0.0.1",SOLOSCAPE_PREVIEW_PORT:"0",
            SOLOSCAPE_NATIVE_GATEWAY_URL:"wss://127.0.0.1:43596/",SOLOSCAPE_RSA_PUBLIC_KEY_FILE:publicKey};
        const tls = loadTlsEnvironment(env), ca = readFileSync(cert);
        tcp = createServer(socket => { sockets.add(socket); socket.on("close",()=>sockets.delete(socket)); socket.on("data",bytes=>socket.write(bytes)); });
        tcp.listen(0,"127.0.0.1"); await once(tcp,"listening");
        gateway = createGateway({tls,tcpHost:"127.0.0.1",tcpPort:tcp.address().port,allowedOrigins:new Set(["https://localhost:3443"])});
        gateway.httpServer.listen(0,"127.0.0.1"); await once(gateway.httpServer,"listening");
        const address = `wss://127.0.0.1:${gateway.httpServer.address().port}/`;
        const blocked = new WebSocket(address,{ca,origin:"https://evil.test"});
        assert.match((await once(blocked,"error"))[0].message,/403/);
        const client = new WebSocket(address,{ca,origin:"https://localhost:3443"});
        await once(client,"open");
        const reply = once(client,"message"); client.send(Buffer.from([14,1,2]));
        assert.deepEqual((await reply)[0],Buffer.from([14,1,2]));
        client.close(); await once(client,"close");
        preview = spawn(process.execPath,["browser/dev-server.mjs"],{cwd:new URL("../",import.meta.url),env,stdio:["ignore","pipe","pipe"]});
        const port = await new Promise((resolve,reject)=>{
            let logs="";
            preview.stdout.on("data",chunk=>{logs+=chunk; const match=logs.match(/https:\/\/localhost:(\d+)/); if(match)resolve(Number(match[1]));});
            preview.on("error",reject); preview.on("exit",code=>reject(new Error("Preview exited: "+code)));
        });
        async function request(path) {
            return new Promise((resolve,reject)=>{get(`https://127.0.0.1:${port}${path}`,{ca},res=>{
                let body="";res.on("data",chunk=>body+=chunk);res.on("end",()=>resolve({res,body}));
            }).on("error",reject);});
        }
        const page = await request("/"); assert.equal(page.res.statusCode,200);
        assert.match(page.res.headers["content-security-policy"],/wss:\/\/127.0.0.1:43596/);
        assert.doesNotMatch(page.res.headers["content-security-policy"],/\sws:\/\//);
        assert.equal(JSON.parse((await request("/login-config.json")).body).gatewayUrl,env.SOLOSCAPE_NATIVE_GATEWAY_URL);
        assert.equal((await request("/connection-config.mjs")).res.statusCode,200);
        assert.equal((await request("/server.key")).res.statusCode,404);
        assert.throws(()=>previewEnvironment({...env,SOLOSCAPE_NATIVE_GATEWAY_URL:"ws://127.0.0.1:43595/"}),/WSS|wss/);
    } finally {
        if(preview){preview.kill();if(preview.exitCode===null&&preview.signalCode===null)await once(preview,"exit");}
        if(gateway)await gateway.close();
        for(const socket of sockets)socket.destroy();
        if(tcp)await new Promise(resolve=>tcp.close(resolve));
        rmSync(dir,{recursive:true,force:true});
    }
});
