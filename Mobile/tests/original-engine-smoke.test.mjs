import assert from "node:assert/strict";
import {test} from "node:test";
import {once} from "node:events";
import {createEngineSmokeServer} from "../scripts/engine-smoke-server.mjs";

test("original engine diagnostic serves only explicit localhost resources", async()=>{
    const visited=[];
    const server=createEngineSmokeServer({read:async path=>{
        visited.push(path.replaceAll("\\","/"));
        return Buffer.from("fixture");
    }});
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    try{
        const origin="http://127.0.0.1:"+server.address().port;
        for(const [path,expected] of [["/",200],["/engine-smoke.mjs",200],
            ["/engine.js",200],["/../private",404],["/teavm/bridge.js",404],
            ["/engine.js?x=1",404],["/login-config.json",404],["/original-gateway",404]]){
            const response=await fetch(origin+path);
            assert.equal(response.status,expected,path);
            assert.equal(response.headers.get("cache-control"),"no-store");
            if(expected===200) assert.ok(response.headers.get("content-security-policy").includes("default-src 'none'"));
        }
        const post=await fetch(origin+"/engine.js",{method:"POST"});
        assert.equal(post.status,404);
        assert.equal(visited.length,3);
        assert.ok(visited.some(path=>path.endsWith("/teavm-poc/target/engine/javascript/engine.js")));
        assert.ok(!visited.some(path=>path.includes("injected-client.oprs")));
    }finally{server.close();await once(server,"close");}
});

test("original engine browser harness measures game cycles and canvas, not a synthetic success flag",async()=>{
    const fs=await import("node:fs/promises");
    const url=new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url);
    const source=await fs.readFile(url,"utf8");
    assert.match(source,/engine\.gameCycle\(\)/);
    assert.match(source,/engine\.hasClientThread\(\)/);
    assert.match(source,/getImageData\(/);
    assert.match(source,/engine\.configureClient\(/);
    assert.match(source,/engine\.initializeAsync\(/);
    assert.doesNotMatch(source,/NativeGameplay|TeaVmWorldBridge|fakeGameCycle/);
});

test("browser executor supports the original zero-core, one-maximum Java constructor",async()=>{
    const fs=await import("node:fs/promises");
    const source=await fs.readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/ThreadPoolExecutor.java",import.meta.url),"utf8");
    assert.match(source,/core\s*<\s*0/,"core size 0 must be legal like JVM ThreadPoolExecutor");
    assert.match(source,/maximum\s*<=\s*0/,"maximum pool size 0 must be rejected");
    assert.match(source,/core\s*==\s*0\s*\?\s*maximum\s*:\s*core/);
    assert.match(source,/workers\.get\(cursor\)/,"zero-core requests must still be dispatched");
});

test("opt-in native cache is loopback-only, allowlisted, and source files remain read-only",async()=>{
    const {mkdtemp,writeFile,readFile,rm}=await import("node:fs/promises");
    const {tmpdir}=await import("node:os");
    const {join}=await import("node:path");
    const root=await mkdtemp(join(tmpdir(),"soloscape-original-cache-fixture-"));
    const original=Buffer.from([10,20,30,40,50]);
    const source=join(root,"main_file_cache.idx255");
    await writeFile(source,original);
    const server=createEngineSmokeServer({nativeCacheRoot:root,gatewayPort:43595});
    server.listen(0,"127.0.0.1");await once(server,"listening");
    try{
        const origin="http://127.0.0.1:"+server.address().port;
        const config=await fetch(origin+"/original-gateway");
        assert.equal(config.status,200);
        const {routes}=await config.json();
        assert.deepEqual(routes.map(route=>route.port),[43594,443]);
        assert.ok(routes.every(route=>route.host==="127.0.0.1"&&route.url==="ws://127.0.0.1:43595/"));
        const manifest=await fetch(origin+"/original-cache/manifest");
        assert.equal(manifest.status,200);
        assert.deepEqual((await manifest.json()).files,[{name:"main_file_cache.idx255",bytes:5}]);
        const file=await fetch(origin+"/original-cache/main_file_cache.idx255");
        assert.equal(file.status,200);
        assert.deepEqual(Buffer.from(await file.arrayBuffer()),original);
        assert.equal((await fetch(origin+"/original-cache/main_file_cache.idx256")).status,404);
        assert.equal((await fetch(origin+"/original-cache/%2e%2e%2fprivate")).status,404);
        assert.equal((await fetch(origin+"/original-cache/main_file_cache.idx255",{method:"POST"})).status,404);
        assert.deepEqual(await readFile(source),original);
    }finally{
        server.close();await once(server,"close");await rm(root,{recursive:true,force:true});
    }
});
