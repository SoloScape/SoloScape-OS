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
        for(const [path,expected] of [["/",200],["/engine-smoke.mjs",200],["/engine-smoke.css",200],
            ["/engine.js",200],["/../private",404],["/teavm/bridge.js",404],
            ["/engine.js?x=1",404],["/login-config.json",404],["/original-gateway",404]]){
            const response=await fetch(origin+path);
            assert.equal(response.status,expected,path);
            assert.equal(response.headers.get("cache-control"),"no-store");
            if(expected===200) assert.ok(response.headers.get("content-security-policy").includes("default-src 'none'"));
        }
        const post=await fetch(origin+"/engine.js",{method:"POST"});
        assert.equal(post.status,404);
        assert.equal(visited.length,4);
        assert.ok(visited.some(path=>path.endsWith("/teavm-poc/target/engine/javascript/engine.js")));
        assert.ok(!visited.some(path=>path.includes("injected-client.oprs")));
    }finally{server.close();await once(server,"close");}
});

test("isolated Chrome tests supply public parameters without player-facing forms",async()=>{
    const publicClientConfig={
        parameters:{"4":"1","9":"public-test-parameter"},
        routes:[{host:"127.0.0.1",port:43594,url:"ws://127.0.0.1:43595/"}]
    };
    const server=createEngineSmokeServer({publicClientConfig});
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    try{
        const url="http://127.0.0.1:"+server.address().port+"/original-public-config";
        const response=await fetch(url);
        assert.equal(response.status,200);
        assert.equal(response.headers.get("cache-control"),"no-store");
        assert.deepEqual(await response.json(),publicClientConfig);
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

test("original engine autostarts into a canvas-only fullscreen viewport",async()=>{
    const {readFile}=await import("node:fs/promises");
    const site=new URL("../teavm-poc/site/",import.meta.url);
    const html=await readFile(new URL("engine-smoke.html",site),"utf8");
    const css=await readFile(new URL("engine-smoke.css",site),"utf8");
    const js=await readFile(new URL("engine-smoke.mjs",site),"utf8");
    assert.match(js,/void initializeOriginalEngine\(\);/);
    assert.match(js,/engine\.initializeAsync\(/);
    assert.match(js,/javaCodebase\.hostname="127\.0\.0\.1"/);
    assert.match(js,/let codebase=javaCodebase\.href;/);
    assert.match(js,/engine\.configureClient\(codebase\)/);
    assert.doesNotMatch(js,/addEventListener\("click"|getElementById\('start'\)/);
    assert.doesNotMatch(html,/<(?:button|textarea|h[1-6]|pre|aside|form)\b/i);
    assert.match(html,/<input id="original-soft-keyboard" type="password"/);
    assert.match(css,/#original-soft-keyboard\{[^}]*opacity:\.01/);
    assert.match(html,/<canvas id="original-engine-canvas"/);
    assert.match(css,/#original-engine-canvas\{/);
    assert.match(css,/aspect-ratio:765\/503/);
    assert.match(css,/width:min\(100vw,152\.0875dvh\)/);
    assert.match(css,/overflow:hidden/);
});

test("browser executor supports the original zero-core, one-maximum Java constructor",async()=>{
    const fs=await import("node:fs/promises");
    const source=await fs.readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/ThreadPoolExecutor.java",import.meta.url),"utf8");
    assert.match(source,/core\s*<\s*0/,"core size 0 must be legal like JVM ThreadPoolExecutor");
    assert.match(source,/maximum\s*<=\s*0/,"maximum pool size 0 must be rejected");
    assert.match(source,/core\s*==\s*0\s*\?\s*maximum\s*:\s*core/);
    assert.match(source,/workers\.get\(cursor\)/,"zero-core requests must still be dispatched");
});

test("original browser bootstrap installs a real executor before original login actions",async()=>{
    const fs=await import("node:fs/promises");
    const source=await fs.readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const constructed=source.indexOf("engine = new client();");
    const scheduler=source.indexOf("engine.jl = org.soloscape.teavm.platform.BrowserExecutors.newScheduledThreadPool(1);");
    const initialized=source.indexOf("engine.initialize();");
    assert.ok(constructed>=0 && scheduler>constructed && initialized>scheduler,
        "the original injected-client scheduler must exist before the first login callback");
    assert.doesNotMatch(source,/engine\.jl\s*=\s*null\s*;/);
    assert.match(source,/bq\.az\s*=\s*exponent/);
    assert.match(source,/bq\.af\s*=\s*modulus/);
    assert.match(source,/configureLoginRsaPublic\(/);
});

test("pinned original client's login packet has its public jav_config parameter 9",async()=>{
    const fs=await import("node:fs/promises");
    const html=await fs.readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    const match=/<script type="application\/json" id="params">([^<]*)<\/script>/.exec(html);
    assert.ok(match,"original-engine bootstrap parameters must be present");
    const params=JSON.parse(match[1]);
    assert.equal(params["4"],"1",
        "original gamepack startup parameter 4 is rsprot desktop client type 1, not TCP port 43594");
    assert.equal(params["9"],"ElZAIrq5NpKN6D3mDdihco3oPeYN2KFy2DCquj7JMmECPmLrDP3Bnw",
        "original rev240 login packet writes this public parameter, never a null string");
    const script=await fs.readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(script,/typeof params\["9"\]/);
    assert.match(script,/Missing original gamepack public startup parameter 9/);
});

test("browser AWT dummy draw events do not accumulate without a desktop event-dispatch thread",async()=>{
    const {readFile}=await import("node:fs/promises");
    const shim=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/EventQueue.java",import.meta.url),"utf8");
    const canvas=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
    assert.match(shim,/public AWTEvent peekEvent\(\) \{ return null; \}/);
    assert.match(shim,/public void postEvent\(AWTEvent event\)/);
    assert.doesNotMatch(shim,/queue\.add|new ArrayDeque/);
    assert.match(canvas,/canvas\.addEventListener/);
});

test("browser keyboard sends DOM Enter as Java AWT VK_ENTER 10 without changing game input",async()=>{
    const {readFile}=await import("node:fs/promises");
    const code=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",import.meta.url),"utf8");
    assert.match(code,/e\.key==='Enter'\?10:e\.key==='Backspace'\?8/);
    assert.match(code,/canvas\.addEventListener\('mousemove'/);
});

test("pinned original game clock reports its catch-up cycle count without replacing clock decisions",async()=>{
    const {readFile}=await import("node:fs/promises");
    const adapter=await readFile(new URL("../teavm-poc/scripts/AdaptEnginePlatform.java",import.meta.url),"utf8");
    const probe=await readFile(new URL("../teavm-poc/engine-src/EngineClockProbe.java",import.meta.url),"utf8");
    assert.match(adapter,/owner\.equals\("tq"\) && name\.equals\("run"\)/);
    assert.match(adapter,/method\.equals\("ip"\) && desc\.equals\("\(II\)I"\)/);
    assert.match(probe,/int result = clock\.ip\(cycleMillis, minWaitMillis\)/);
    assert.match(probe,/return result;/);
});

test("original rat-combat hitsplats skip missing optional sprites without replacing Java software drawing",async()=>{
    const {readFile}=await import("node:fs/promises");
    const asm=await readFile(new URL("../teavm-poc/scripts/AdaptEnginePlatform.java",import.meta.url),"utf8");
    const helper=await readFile(new URL("../teavm-poc/engine-src/NullSafeHitsplatSprites.java",import.meta.url),"utf8");
    assert.match(asm,/owner\.equals\("au"\) && name\.equals\("as"\)/);
    assert.match(asm,/descriptor\.equals\("\(Ldz;Ldh;IIIIIIB\)V"\)/);
    assert.match(asm,/type\.equals\("ym"\)/);
    assert.match(asm,/field\.equals\("aa"\)/);
    assert.match(asm,/opcode == GETFIELD/);
    assert.match(asm,/opcode == INVOKEVIRTUAL/);
    for(const method of ["offsetX","width","height","draw","drawAlpha"])
        assert.ok(helper.includes(method+"(ym sprite"),"missing hit-splat helper "+method);
    assert.match(helper,/if \(sprite != null\) sprite\.av\(x, y\)/);
    assert.match(helper,/if \(sprite != null\) sprite\.am\(x, y, alpha\)/);
    assert.doesNotMatch(asm,/owner\.equals\("client"\) && name\.equals\("renderScene"\)/);
});

test("missing scenery diagnostic counts original Java scene objects without substitute renderer",async()=>{
    const {readFile}=await import("node:fs/promises");
    const bridge=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(bridge,/sceneLocCounts\(\)/);
    assert.match(bridge,/original\.getScene\(\)/);
    assert.match(bridge,/scene\.getTiles\(\)/);
    assert.match(bridge,/tile\.getGameObjects\(\)/);
    assert.match(bridge,/getFaceCount\(\)/);
    assert.match(bridge,/castleAnchorGameRefs/);
    assert.match(bridge,/castleAnchorModelFaces/);
    assert.match(bridge,/definition\.bk\(10\)/);
    assert.match(bridge,/om\.ah\(castleFixtureIds\[i\]\)/);
    assert.match(bridge,/ak\.cq\.bb\(6,castleFixtureIds\[i\]/);
    assert.match(bridge,/new om\(new xy\(source\),castleFixtureIds\[i\],true\)/);
    assert.match(bridge,/baseX\+lx>=3203/);
    assert.doesNotMatch(bridge,/setGroundObject\(|setSceneTile|renderScene\(/);
    assert.match(page,/engineSmokeSceneCounts/);
});

test("browser-only rev240 untyped location models restore original cached model IDs",async()=>{
    const {readFile}=await import("node:fs/promises");
    const helper=await readFile(new URL("../teavm-poc/engine-src/BrowserOriginalLocationModels.java",import.meta.url),"utf8");
    const adapter=await readFile(new URL("../teavm-poc/scripts/AdaptEnginePlatform.java",import.meta.url),"utf8");
    assert.match(helper,/restoreMissingUntypedModels\(byte\[\] bytes, int\[\] decoded\)/);
    assert.match(helper,/if \(op == 7\)/);
    assert.match(helper,/if \(op == 0 \|\| op == 1 \|\| op == 5 \|\| op == 6\)/);
    assert.match(adapter,/owner\.equals\("om"\)/);
    assert.match(adapter,/descriptor\.equals\("\(Lxy;IZ\)V"\)/);
    assert.match(adapter,/BrowserOriginalLocationModels/);
    assert.match(adapter,/super\.visitFieldInsn\(PUTFIELD,"om","ck","\[I"\)/);
    assert.doesNotMatch(helper,/WebGL|THREE|canvas|drawModel|new GameObject/);
});

test("original software-engine diagnostics measure frames separately from game cycles",async()=>{
    const {readFile}=await import("node:fs/promises");
    const callbacks=await readFile(new URL("../teavm-poc/engine-src/BrowserEngineCallbacks.java",import.meta.url),"utf8");
    const bridge=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    const html=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    assert.match(callbacks,/graphics\.drawImage\(buffer\.getImage\(\), x, y, null\);\s*framesPresented\+\+;/);
    assert.match(bridge,/\(\(net\.runelite\.api\.Client\) engine\)\.getFPS\(\)/);
    assert.match(bridge,/callbacks\.framesPresented\(\)/);
    assert.match(page,/state\.presentedFrames=engine\.presentedFrames\(\)/);
    assert.match(page,/state\.originalFps=engine\.originalFps\(\)/);
    // Runtime diagnostics remain in window.engineSmokeState, never in the
    // player-facing fullscreen page.
    assert.match(page,/window\.engineSmokeState/);
    assert.doesNotMatch(html,/id="(?:original-fps|presented-fps|cycle-rate|events|start|status)"/);
    assert.match(html,/<canvas id="original-engine-canvas"/);
    assert.match(html,/<link rel="stylesheet" href="\/engine-smoke\.css">/);
});

test("original rev240 NPC action comparisons tolerate absent cache actions without altering the renderer",async()=>{
    const {readFile}=await import("node:fs/promises");
    const adapter=await readFile(new URL("../teavm-poc/scripts/AdaptEnginePlatform.java",import.meta.url),"utf8");
    const helper=await readFile(new URL("../teavm-poc/engine-src/org/soloscape/teavm/platform/NullSafeStrings.java",import.meta.url),"utf8");
    assert.match(adapter,/owner\.equals\("af"\) && name\.equals\("fk"\)/);
    assert.match(adapter,/descriptor\.equals\("\(ILpl;IZLdn;Ljava\/lang\/String;IIIIB\)V"\)/);
    assert.match(adapter,/method\.equals\("equalsIgnoreCase"\)/);
    assert.match(adapter,/PLATFORM\+"NullSafeStrings"/);
    assert.match(helper,/value != null && value\.equalsIgnoreCase\(expected\)/);
});

test("original engine host exposes only the explicitly provided public RSA key on loopback",async()=>{
    const rsa={exponent:"10001",modulus:"a".repeat(256)};
    const server=createEngineSmokeServer({loginRsaPublic:rsa});
    server.listen(0,"127.0.0.1");await once(server,"listening");
    try {
        const origin="http://127.0.0.1:"+server.address().port;
        const response=await fetch(origin+"/original-login-public-key");
        assert.equal(response.status,200);
        assert.deepEqual(await response.json(),rsa);
        assert.equal(response.headers.get("cache-control"),"no-store");
        assert.equal((await fetch(origin+"/original-login-private-key")).status,404);
        assert.equal((await fetch(origin+"/original-login-public-key",{method:"POST"})).status,404);
    }finally{server.close();await once(server,"close");}
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

test("original gateway lifecycle diagnostics are read-only, bounded and localhost-only",async()=>{
    const server=createEngineSmokeServer({sessionDiagnostics:()=>({
        sessions:[{id:1,clientFrames:1,serverFrames:0,closedBy:"Upstream closed",closeCode:1000}]
    })});
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    try{
        const origin="http://127.0.0.1:"+server.address().port;
        const response=await fetch(origin+"/original-session-diagnostics");
        assert.equal(response.status,200);
        assert.equal(response.headers.get("cache-control"),"no-store");
        assert.deepEqual(await response.json(),{sessions:[{
            id:1,clientFrames:1,serverFrames:0,closedBy:"Upstream closed",closeCode:1000
        }]});
        assert.equal((await fetch(origin+"/original-session-diagnostics",{method:"POST"})).status,404);
    }finally{server.close();await once(server,"close");}
});
