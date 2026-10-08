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
        assert.match(await html.text(),/src="\/app\.mjs"/);
        // Regression: absent floor-materials.mjs used to leave the static
        // loading spinner displayed forever because the import graph failed.
        const modules=[
            "/app.mjs","/native-js5.mjs","/terrain-world.mjs",
            "/world-webgl.mjs","/floor-materials.mjs","/floor-lighting.mjs","/world-startup.mjs",
        ];
        for(const path of modules){
            const response=await fetch(root+path);
            assert.equal(response.status,200,path+" should be served");
            assert.match(response.headers.get("content-type")??"",/text\/javascript/,path);
            assert.ok((await response.text()).length>50,path);
        }
        const missing=await fetch(root+"/missing-module.mjs");
        assert.equal(missing.status,404);
    } finally {
        child.kill("SIGTERM");
        if(child.exitCode===null&&child.signalCode===null)await once(child,"exit");
    }
});

test("real WebGL shader renders client HSL palette pixels and releases palette texture",
    {timeout:60000,skip:process.platform!=="linux"},async()=>{
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
    if(gl.getError()!==gl.NO_ERROR)throw new Error("WebGL error");
    const palette=viewport.palette;
    viewport.dispose();
    if(gl.isTexture(palette))throw new Error("Palette texture was not disposed");
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
            }else if(["/world-webgl.mjs","/floor-lighting.mjs"].includes(req.url)){
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
