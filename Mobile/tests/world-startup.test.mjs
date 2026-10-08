import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
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
            "/world-webgl.mjs","/floor-materials.mjs","/world-startup.mjs",
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
