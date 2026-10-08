import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { access, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { displayTerrainProgressively } from "../browser/world-startup.mjs";

test("first WebGL terrain render does not await optional materials", async () => {
    let resolveMaterials;
    const waitForMaterials=new Promise(resolve=>{resolveMaterials=resolve;});
    const steps=[];
    const scene={mapX:50,mapY:50};
    let material;
    const optionalWork=displayTerrainProgressively({
        terrain:scene,
        renderTerrain(value){assert.strictEqual(value,scene);steps.push("rendered");},
        fetchMaterials(value){assert.strictEqual(value,scene);steps.push("requested");return waitForMaterials;},
        applyMaterials(value,colors){assert.strictEqual(value,scene);material=colors;steps.push("recoloured");},
        onMaterialError(error){throw error;},
    });
    assert.deepEqual(steps,["rendered"],"Render must happen before the first microtask/floor request");
    await Promise.resolve();
    assert.deepEqual(steps,["rendered","requested"]);
    assert.equal(material,undefined);
    resolveMaterials({underlays:new Map()});
    await optionalWork;
    assert.deepEqual(steps,["rendered","requested","recoloured"]);
    assert.ok(material.underlays instanceof Map);
});

test("missing floor definitions do not clear a successfully rendered terrain",async()=>{
    const steps=[];
    await displayTerrainProgressively({
        terrain:{},
        renderTerrain(){steps.push("rendered");},
        fetchMaterials(){throw new Error("Floor config 2:4 unavailable");},
        applyMaterials(){throw new Error("Should not be called");},
        onMaterialError(error){steps.push("fallback "+error.message);},
    });
    assert.deepEqual(steps,["rendered","fallback Floor config 2:4 unavailable"]);
});

test("late floor response for a previous region cannot overwrite a newer world",async()=>{
    let resolve;
    let current=true;
    const steps=[];
    const pending=new Promise(done=>{resolve=done;});
    const work=displayTerrainProgressively({
        terrain:{mapX:50},
        renderTerrain(){steps.push("render 50");},
        fetchMaterials(){return pending;},
        applyMaterials(){steps.push("stale recolour");},
        onMaterialError(){steps.push("stale failure");},
        isCurrent(){return current;},
    });
    current=false;
    resolve({rgb:1});
    await work;
    assert.deepEqual(steps,["render 50"]);
});

test("preview server serves all ESM dependencies of the world client", {timeout:15000}, async()=>{
    const cwd=fileURLToPath(new URL("../",import.meta.url));
    const child=spawn(process.execPath,["browser/dev-server.mjs"],{
        cwd,
        env:{...process.env,SOLOSCAPE_PREVIEW_PORT:"0"},
        stdio:["ignore","pipe","pipe"],
    });
    let logs="";
    try{
        const port=await new Promise((resolve,reject)=>{
            const timeout=setTimeout(()=>reject(new Error("Preview server did not start: "+logs)),6000);
            const success=n=>{clearTimeout(timeout);resolve(n);};
            const fail=error=>{clearTimeout(timeout);reject(error);};
            child.stdout.on("data",chunk=>{
                logs+=chunk.toString();
                const match=logs.match(/http:\/\/localhost:(\d+)\//);
                if(match)success(Number(match[1]));
            });
            child.stderr.on("data",chunk=>{logs+=chunk.toString();});
            child.once("error",fail);
            child.once("exit",code=>fail(new Error("Preview server exited "+code+": "+logs)));
        });
        const root=`http://127.0.0.1:${port}`;
        const html=await fetch(root+"/");
        assert.equal(html.status,200);
        const htmlText=await html.text();
        assert.match(htmlText,/src="\/app\.mjs"/);
        assert.match(htmlText,/id="osrs-menu-canvas"/);
        assert.doesNotMatch(htmlText,/class="npc-menu"/);
        // Regression: absent floor-materials.mjs used to leave the static
        // loading spinner displayed forever because the import graph failed.
        const modules=[
            "/app.mjs","/native-js5.mjs","/terrain-world.mjs",
            "/world-webgl.mjs","/floor-materials.mjs","/floor-lighting.mjs","/world-startup.mjs",
            "/cache-reader.mjs","/model-codec.mjs","/object-definitions.mjs","/location-cache.mjs","/scenery-models.mjs",
            "/texture-cache.mjs","/texture-mapper.mjs","/scene-planes.mjs",
            "/login-crypto.mjs","/login-protocol.mjs","/login-pow.mjs","/native-login.mjs","/game-protocol.mjs",
            "/player-sync.mjs","/player-models.mjs","/native-gameplay.mjs","/npc-sync.mjs","/npc-models.mjs","/npc-interactions.mjs","/npc-pointer.mjs","/native-menu.mjs",
        ];
        for(const path of modules){
            const response=await fetch(root+path);
            assert.equal(response.status,200,path+" should be served");
            assert.match(response.headers.get("content-type")??"",/text\/javascript/,path);
            assert.ok((await response.text()).length>50,path);
        }
        const keys=await fetch(root+"/region-keys.json");
        assert.equal(keys.status,200);assert.deepEqual(await keys.json(),{});
        const login=await fetch(root+"/login-config.json");
        assert.equal(login.status,200);assert.equal(login.headers.get("cache-control"),"no-store");
        const loginConfig=await login.json();
        assert.ok(loginConfig.unavailable||loginConfig.revision===240&&loginConfig.rsa.exponent);
        const privateKey=await fetch(root+"/game.key");assert.equal(privateKey.status,404);
        const missing=await fetch(root+"/missing-module.mjs");
        assert.equal(missing.status,404);
    } finally {
        child.kill("SIGTERM");
        if(child.exitCode===null&&child.signalCode===null)await once(child,"exit");
    }
});

test("real WebGL shader renders client HSL palette pixels and releases palette texture",
    {timeout:60000,skip:process.platform!=="linux"&&!process.env.CHROME_BIN},async()=>{
    const chrome=process.env.CHROME_BIN||"/usr/bin/google-chrome";
    await access(chrome);
    const browserRoot=new URL("../browser/",import.meta.url);
    let reportResult;
    const browserResult=new Promise(resolve=>{reportResult=resolve;});
    const html=`<!doctype html><html><body><canvas id="scene" style="width:128px;height:128px"></canvas>
<script type="module">
import {NativeTerrainViewport} from "/world-webgl.mjs";
import {HSL_PALETTE} from "/floor-lighting.mjs";
try{
    const viewport=new NativeTerrainViewport(document.getElementById("scene"));
    const terrain={side:64,heights:new Int32Array(4096),
        underlays:new Uint16Array(4096).fill(1),overlays:new Int16Array(4096),
        floorMaterials:{underlays:new Map([[0,{rgb:0xff0000,textureId:-1}]]),overlays:new Map()}};
    viewport.setTerrain(terrain);
    viewport.target=[0,0,0];viewport.pitch=1.3;viewport.yaw=0;viewport.distance=50;
    viewport.render();
    const gl=viewport.gl;
    const pixel=new Uint8Array(4);
    gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),
        1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    const rgb=HSL_PALETTE[937];
    const expected=[rgb>>>16&255,rgb>>>8&255,rgb&255,255];
    if(expected.some((v,i)=>v!==pixel[i]))throw new Error("Pixel "+pixel+" expected "+expected);
    // Asymmetric compass landmarks catch reflections in the actual GPU path.
    // At yaw zero the camera is south of the map: north is up, east is right.
    const landmarks=[[-8,8,2000],[8,8,12000],[-8,-8,30000],[8,-8,50000]],markers=[];
    for(const [east,north,hsl] of landmarks){
        for(const [dx,dz] of [[-3,-3],[3,-3],[-3,3],[3,-3],[3,3],[-3,3]])
            markers.push(east+dx,.5,north+dz,hsl,0,0);
    }
    viewport.setScenery({vertices:new Float32Array(markers)});viewport.render();
    for(const [east,north,hsl] of landmarks){
        const depth=50+north*Math.cos(1.3)-.5*Math.sin(1.3);
        const px=Math.floor(viewport.canvas.width*(.5+Math.sqrt(3)*east/depth/2));
        const py=Math.floor(viewport.canvas.height*(.5+Math.sqrt(3)*(.5*Math.cos(1.3)+north*Math.sin(1.3))/depth/2));
        gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        const color=HSL_PALETTE[hsl],want=[color>>>16&255,color>>>8&255,color&255,255];
        if(want.some((v,i)=>v!==pixel[i]))throw new Error("Mirrored compass landmark "+east+","+north+": "+pixel);
    }
    // A separate object buffer must draw above terrain, then survive recolouring
    // and clear only when Travel resets the scene.
    const object=new Float32Array([-8,.5,-8,2000,0,0, 8,.5,-8,2000,0,0,
        -8,.5,8,2000,0,0, 8,.5,-8,2000,0,0, 8,.5,8,2000,0,0, -8,.5,8,2000,0,0]);
    viewport.setScenery({vertices:object});
    viewport.setTerrain(terrain,{resetCamera:false});viewport.render();
    gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    const objectRgb=HSL_PALETTE[2000],objectExpected=[objectRgb>>>16&255,objectRgb>>>8&255,objectRgb&255,255];
    if(objectExpected.some((v,i)=>v!==pixel[i]))throw new Error("Scenery pixel "+pixel+" expected "+objectExpected);
    const texPixels=new Uint8Array(64*64*4);
    for(let i=0;i<texPixels.length;i+=4)texPixels.set([128,64,32,255],i);
    const textured=new Float32Array(object);
    for(let i=0;i<textured.length;i+=6){textured[i+3]=64;textured[i+4]=(i/6)%2+.25;textured[i+5]=.25;}
    const texturedScene={vertices:new Float32Array(),levelCounts:[0,0,0,0],
        texturedBatches:[{level:1,texture:3,vertices:textured}],textures:new Map([[3,{size:64,pixels:texPixels}]])};
    viewport.setScenery(texturedScene);viewport.render();
    gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if(expected.some((v,i)=>v!==pixel[i]))throw new Error("Upper texture leaked into ground view");
    viewport.setSceneLevel(1);viewport.render();
    gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if([64,32,16,255].some((v,i)=>Math.abs(v-pixel[i])>1))throw new Error("Lit texture pixel "+pixel);
    const oldTexture=viewport.textures.get(3),oldBuffer=viewport.sceneryBatches[0].buffer;
    for(let i=3;i<texPixels.length;i+=4)texPixels[i]=0;
    viewport.setScenery(texturedScene);viewport.render();
    if(gl.isTexture(oldTexture)||gl.isBuffer(oldBuffer))throw new Error("Replacing texture scene leaked GPU resources");
    gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if(expected.some((v,i)=>v!==pixel[i]))throw new Error("Texture cutout obscured terrain");
    const sceneTexture=viewport.textures.get(3),sceneBuffer=viewport.sceneryBatches[0].buffer;
    viewport.setTerrain(terrain);if(viewport.sceneryCount!==0)throw new Error("Travel retained obsolete scenery");
    if(gl.isTexture(sceneTexture)||gl.isBuffer(sceneBuffer)||viewport.sceneryBatches.length)throw new Error("Travel retained texture resources");
    if(gl.getError()!==gl.NO_ERROR)throw new Error("WebGL error");
    const palette=viewport.palette;
    const sceneryBuffer=viewport.sceneryBuf;
    viewport.dispose();
    if(gl.isTexture(palette))throw new Error("Palette texture was not disposed");
    if(gl.isBuffer(sceneryBuffer))throw new Error("Scenery buffer was not disposed");
    document.body.dataset.result="webgl-hsl-pass";
}catch(error){document.body.dataset.result="webgl-hsl-fail: "+error.message;}
await fetch("/result?status="+encodeURIComponent(document.body.dataset.result));
</script></body></html>`;
    const server=createServer(async(req,res)=>{
        try{
            if(req.url.startsWith("/result?")){
                reportResult(new URL(req.url,"http://localhost").searchParams.get("status"));
                res.writeHead(200);res.end("received");
            }else if(req.url==="/"){
                res.writeHead(200,{"Content-Type":"text/html"});res.end(html);
            }else if(["/world-webgl.mjs","/floor-lighting.mjs","/scene-planes.mjs"].includes(req.url)){
                res.writeHead(200,{"Content-Type":"text/javascript"});
                res.end(await readFile(new URL(req.url.slice(1),browserRoot)));
            }else{res.writeHead(404);res.end();}
        }catch(error){res.writeHead(500);res.end(error.message);}
    });
    await new Promise((resolve,reject)=>{
        server.once("error",reject);server.listen(0,"127.0.0.1",resolve);
    });
    const profile=await mkdtemp(join(tmpdir(),"soloscape-webgl-"));
    let child;
    try{
        const url="http://127.0.0.1:"+server.address().port+"/";
        child=spawn(chrome,["--headless","--no-sandbox","--disable-dev-shm-usage",
            "--no-first-run","--no-default-browser-check","--disable-background-networking",
            "--disable-component-update","--disable-sync","--disable-extensions",
            "--use-angle=swiftshader","--enable-unsafe-swiftshader",
            "--user-data-dir="+profile,url],{stdio:["ignore","ignore","pipe"]});
        let errors="";
        child.stderr.on("data",data=>errors+=data);
        let timer;
        const stopped=new Promise((_,reject)=>{
            child.once("error",reject);
            child.once("exit",(code,signal)=>reject(new Error("Chrome exited before result: "+
                code+"/"+signal+" "+errors.slice(-2000))));
            timer=setTimeout(()=>reject(new Error("No WebGL result: "+errors.slice(-2000))),40000);
        });
        const result=await Promise.race([browserResult,stopped]).finally(()=>clearTimeout(timer));
        assert.equal(result,"webgl-hsl-pass");
    }finally{
        if(child&&child.exitCode===null&&child.signalCode===null){
            child.kill("SIGKILL");await once(child,"exit");
        }
        await new Promise(resolve=>server.close(resolve));
        // Chrome helpers may finish writing briefly after the parent exits.
        // Retry ENOTEMPTY/EBUSY cleanup without hiding a persistent failure.
        await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    }
});
