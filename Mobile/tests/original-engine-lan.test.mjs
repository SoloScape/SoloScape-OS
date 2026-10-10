import {test} from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import {request as httpRequest} from "node:http";
import {readFile} from "node:fs/promises";
import {createLanPolicy,isLocalPeer} from "../scripts/original-lan.mjs";
import {createEngineSmokeServer} from "../scripts/engine-smoke-server.mjs";

const interfaces={
    "Ethernet":[{address:"192.168.0.129",netmask:"255.255.255.0",internal:false}],
    "Tailscale":[{address:"100.100.4.1",netmask:"255.255.255.255",internal:false}],
    "Docker":[{address:"172.17.0.1",netmask:"255.255.0.0",internal:false}]
};
test("LAN policy accepts only the selected private subnet and loopback",()=>{
    const lan=createLanPolicy({interfaces});
    assert.equal(lan.ip,"192.168.0.129");
    for(const ip of ["127.0.0.1","::1","::ffff:127.0.0.1",
        "192.168.0.7","::ffff:192.168.0.8"])
        assert.equal(lan.isAllowedPeer(ip),true,ip);
    for(const ip of ["192.168.1.5","10.0.0.7","172.17.0.4",
        "100.100.4.1","8.8.8.8","2001:4860::1"])
        assert.equal(lan.isAllowedPeer(ip),false,ip);
    assert.equal(isLocalPeer("192.168.0.7"),false);
    assert.throws(()=>createLanPolicy({interfaces,preferredIp:"8.8.8.8"}),/active private/);
    assert.throws(()=>createLanPolicy({interfaces,preferredIp:"192.168.1.1"}),/active private/);
});
test("LAN HTTP page uses allowed Host, a phone-reachable WebSocket route and CSP",async()=>{
    const reads=[];
    const server=createEngineSmokeServer({
        read:async path=>{reads.push(path);return Buffer.from("local fixture");},
        isAllowedPeer:createLanPolicy({interfaces}).isAllowedPeer,
        allowedHosts:new Set(["127.0.0.1:3097","192.168.0.129:3097"]),
        gatewayPort:43595
    });
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    const base="http://127.0.0.1:"+server.address().port;
    const get=(path,host)=>new Promise((resolve,reject)=>{
        const req=httpRequest(base+path,{headers:{Host:host}},res=>{
            const chunks=[];res.on("data",d=>chunks.push(d));
            res.on("end",()=>resolve({status:res.statusCode,
                headers:res.headers,body:Buffer.concat(chunks).toString("utf8")}));
        });
        req.on("error",reject);req.end();
    });
    try{
        const page=await get("/","192.168.0.129:3097");
        assert.equal(page.status,200);
        assert.match(page.headers["content-security-policy"],/ws:\/\/192\.168\.0\.129:43595/);
        const check=await get("/health","192.168.0.129:3097");
        assert.equal(check.status,200);
        assert.match(check.body,/SoloScape connection OK/);
        assert.doesNotMatch(check.body,/engine-smoke.mjs|engine.js|original-cache/);
        const loader=await get("/original-cache-loader.mjs","192.168.0.129:3097");
        assert.equal(loader.status,200);
        assert.match(loader.headers["content-type"],/javascript/);
        const route=await get("/original-gateway","192.168.0.129:3097");
        assert.equal(route.status,200);
        const payload=JSON.parse(route.body);
        assert.equal(payload.routes[0].url,"ws://192.168.0.129:43595/");
        assert.equal(payload.routes[0].host,"127.0.0.1");
        const blocked=await get("/engine.js","attacker.example:3097");
        assert.equal(blocked.status,403);
        assert.ok(reads.every(p=>!p.includes("private")));
    }finally{server.close();await once(server,"close");}
});
test("full viewport canvas boots automatically without visible controls or login automation",async()=>{
    const html=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    const script=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(html,/id="original-engine-canvas"/);
    assert.match(html,/overflow:hidden/);
    assert.match(html,/100dvh/);
    assert.match(html,/id="internal-diagnostics" hidden/);
    assert.match(html,/id="params"/);
    assert.match(script,/queueMicrotask\(\(\)=>\$\("start"\)\.click\(\)\)/);
    assert.match(script,/engine\.initializeAsync\(/);
    assert.doesNotMatch(script,/\.submit\(\)|loginPassword|autoLogin/);
});
