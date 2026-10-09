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
        assert.match(htmlText,/src="\/teavm\/title-client\.mjs"/,"homepage is TeaVM title client");
        assert.match(htmlText,/id="osrs-title"/,"original 765x503 cache title canvas is mounted");
        assert.match(htmlText,/id="title-mute"/,"authentic mute control is mounted");
        assert.match(htmlText,/id="title-world-switch"/,"original world selector control is mounted");
        assert.match(htmlText,/id="title-remember"/,"OpenOSRS login toggle is mounted");
        assert.match(htmlText,/id="login-password"/,"title has native encrypted login fields");
        assert.doesNotMatch(htmlText,/id="login-otp"/,"ordinary login has only username and password");
        assert.match(htmlText,/id="world-canvas"/,"same-session cache-backed world is mounted");
        assert.doesNotMatch(htmlText,/id="world-disconnect"|class="world-hud"/,
            "game viewport has no top logout/status overlay");
        assert.doesNotMatch(htmlText,/<header\b|<nav\b|class="development"|class="milestone"|href="\/legacy"/,
            "the homepage contains only the client, with no site navigation or development chrome");
        const clientCss=await (await fetch(root+"/teavm/title-client.css")).text();
        assert.match(clientCss,/height:100dvh/,"game client occupies the viewport");
        assert.match(clientCss,/aspect-ratio:765\/503/,"game title preserves its native layout");
        assert.match(clientCss,/#title-controls/,"original native fixed-position title hit targets");
        const titleJs=await (await fetch(root+"/teavm/title-client.mjs")).text();
        assert.match(titleJs,/new NativeTitleScreen/,"homepage must use verified OpenOSRS-matched title renderer");
        assert.doesNotMatch(clientCss,/\.development|\.legacy|\.milestone|\.top\{/,
            "old site chrome styles are removed");
        for(const removed of ["/legacy","/diagnostics","/teavm/lab","/app.mjs","/diagnostics-app.mjs"]){
            const response=await fetch(root+removed);
            assert.equal(response.status,404,"obsolete site route should be gone: "+removed);
        }
        // Regression: absent floor-materials.mjs used to leave the static
        // loading spinner displayed forever because the import graph failed.
        const modules=[
            "/teavm/title-client.mjs","/title-login-session.mjs",
            "/teavm-world.mjs",
            "/native-js5.mjs","/terrain-world.mjs",
            "/world-webgl.mjs","/floor-materials.mjs","/floor-lighting.mjs","/world-startup.mjs",
            "/cache-reader.mjs","/model-codec.mjs","/object-definitions.mjs","/location-cache.mjs","/scenery-models.mjs",
            "/texture-cache.mjs","/texture-mapper.mjs","/scene-planes.mjs",
            "/login-crypto.mjs","/login-protocol.mjs","/login-pow.mjs","/native-login.mjs","/game-protocol.mjs",
            "/player-sync.mjs","/player-models.mjs","/native-gameplay.mjs","/npc-sync.mjs","/npc-models.mjs","/npc-interactions.mjs","/npc-pointer.mjs","/native-menu.mjs","/native-interfaces.mjs","/interface-canvas.mjs",
            "/interface-protocol.mjs","/server-interfaces.mjs","/native-scripts.mjs","/dialogue-models.mjs",
            "/title-screen.mjs","/title-fire.mjs","/title-music.mjs","/title-music-worklet.mjs","/title-audio-cache.mjs",
            "/title-audio-realtime-midi-synth.mjs","/title-audio-audio-context.mjs","/title-audio-vorbis-sample.mjs",
        ];
        for(const path of modules){
            const response=await fetch(root+path);
            assert.equal(response.status,200,path+" should be served");
            assert.match(response.headers.get("content-type")??"",/text\/javascript/,path);
            assert.ok((await response.text()).length>50,path);
        }
        // Only the game page is exposed. The TeaVM JavaScript module remains
        // an internal dependency and no original gamepack bytes are served.
        const titleAlias=await fetch(root+"/teavm");
        assert.equal(titleAlias.status,200);
        assert.match(await titleAlias.text(),/id="osrs-title"/);
        for(const path of ["/teavm/probe.mjs","/teavm/model-viewer.mjs","/teavm/model-payload.mjs","/teavm/probe.css"]){
            const response=await fetch(root+path);
            assert.equal(response.status,404,path+" is not a public game page");
        }
        for(const url of ["/teavm/injected-client.oprs","/teavm/rasterizer2d.jar"]){
            const gamepack=await fetch(root+url);
            assert.equal(gamepack.status,404,"gamepack material must never be served directly");
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
try{
    const {NativeTerrainViewport}=await import("/world-webgl.mjs");
    const {HSL_PALETTE}=await import("/floor-lighting.mjs");
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
    // Coplanar floor and wall details must win at every camera yaw and zoom,
    // for both shaders and either submission order, while nearer walls occlude.
    const detailRgb=HSL_PALETTE[12000],detailExpected=[detailRgb>>>16&255,detailRgb>>>8&255,detailRgb&255,255];
    for(const wall of [false,true])for(const useTexture of [false,true])for(const reverse of [false,true]){
        const positions=wall?[[-4,-3,0],[4,-3,0],[-4,5,0],[4,-3,0],[4,5,0],[-4,5,0]]:
            [[-4,0,-4],[4,0,-4],[-4,0,4],[4,0,-4],[4,0,4],[-4,0,4]];
        const base=new Float32Array(positions.flatMap(p=>[...p,2000+1/32,0,0]));
        const detail=new Float32Array(positions.flatMap(p=>[...p,(useTexture?64:12000)+12/32,.25,.25]));
        const opaque=new Uint8Array(64*64*4);for(let i=0;i<opaque.length;i+=4)opaque.set([128,64,32,255],i);
        const combined=new Float32Array([...(reverse?detail:base),...(reverse?base:detail)]);
        const texturedBase=new Float32Array(positions.flatMap(p=>[...p,64+1/32,.25,.25]));
        const basePixels=new Uint8Array(64*64*4);for(let i=0;i<basePixels.length;i+=4)basePixels.set([0,0,255,255],i);
        const batches=[{level:0,texture:4,vertices:texturedBase},{level:0,texture:3,vertices:detail}];
        viewport.setScenery(useTexture?{vertices:new Float32Array(),texturedBatches:reverse?batches.reverse():batches,
            textures:new Map([[3,{size:64,pixels:opaque}],[4,{size:64,pixels:basePixels}]])}:{vertices:combined});
        for(const yaw of [-.6,0,.6,Math.PI])for(const distance of [6,12,24]){
            viewport.target=[0,wall?1:0,0];viewport.pitch=wall?.3:1;viewport.yaw=yaw;viewport.distance=distance;
            viewport.render();gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
            const want=useTexture?[64,32,16,255]:detailExpected;
            if(want.some((v,i)=>Math.abs(v-pixel[i])>1))throw new Error("Coplanar detail flickered: "+[wall,useTexture,reverse,yaw,distance,pixel]);
        }
        const occluder=new Float32Array(base);
        for(let i=0;i<occluder.length;i+=6){occluder[i+1]+=.1;occluder[i+2]-=.1;}
        viewport.setActors({vertices:occluder});viewport.yaw=0;viewport.render();
        gl.readPixels(Math.floor(viewport.canvas.width/2),Math.floor(viewport.canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        if(objectExpected.some((v,i)=>Math.abs(v-pixel[i])>1))throw new Error("Priority detail leaked through nearer geometry");
        viewport.setActors(null);
    }
    viewport.setScenery(texturedScene);
    const sceneTexture=viewport.textures.get(3),sceneBuffer=viewport.sceneryBatches[0].buffer;
    viewport.setTerrain(terrain);if(viewport.sceneryCount!==0)throw new Error("Travel retained obsolete scenery");
    if(gl.isTexture(sceneTexture)||gl.isBuffer(sceneBuffer)||viewport.sceneryBatches.length)throw new Error("Travel retained texture resources");
    // Both shader programs enforce the classic tile window, even though the
    // outside marker is in the frustum and its cache region remains loaded.
    viewport.target=[0,0,0];viewport.pitch=1.3;viewport.yaw=0;viewport.distance=70;
    const {sceneCameraMatrix}=await import("/world-webgl.mjs");
    const camera=sceneCameraMatrix(viewport.target,0,1.3,70,1);
    const sample=(north)=>{
        const p=[0,.5,north,1];
        const c=[0,1,2,3].map(row=>p.reduce((n,v,col)=>n+camera[col*4+row]*v,0));
        gl.readPixels(Math.floor(viewport.canvas.width*(.5+c[0]/c[3]/2)),
            Math.floor(viewport.canvas.height*(.5+c[1]/c[3]/2)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        return Array.from(pixel);
    };
    const marker=[];
    for(const north of [0,12])for(const [x,z] of [[-2,-2],[2,-2],[-2,2],[2,-2],[2,2],[-2,2]])
        marker.push(x,.5,north+z,2000,.25,.25);
    const markerVertices=new Float32Array(marker);
    for(const textured of [false,true]){
        const pixels=new Uint8Array(64*64*4);for(let i=0;i<pixels.length;i+=4)pixels.set([255,0,0,255],i);
        viewport.setScenery(textured?{vertices:new Float32Array(),levelCounts:[0,0,0,0],
            texturedBatches:[{level:0,texture:9,vertices:markerVertices}],textures:new Map([[9,{size:64,pixels}]])}:
            {vertices:markerVertices});
        viewport.render();
        const inside=sample(0),outside=sample(12),clear=[11,23,31,255];
        if(inside.every((n,i)=>Math.abs(n-clear[i])<=1))throw new Error("Draw window hid nearby marker");
        if(outside.some((n,i)=>Math.abs(n-clear[i])>1))throw new Error("Distant marker survived draw cutoff: "+outside);
    }
    if(gl.getError()!==gl.NO_ERROR)throw new Error("WebGL error");
    const palette=viewport.palette;
    const sceneryBuffer=viewport.sceneryBuf;
    viewport.dispose();
    if(gl.isTexture(palette))throw new Error("Palette texture was not disposed");
    if(gl.isBuffer(sceneryBuffer))throw new Error("Scenery buffer was not disposed");
    // Exercise the server interface path in a real browser/2D canvas, using
    // explicit synthetic widget definitions (no live cache/account needed).
    const {NativeInterfaceCanvas}=await import("/interface-canvas.mjs");
    const {ServerInterfaces}=await import("/server-interfaces.mjs");
    const host=document.createElement("div"),canvas=document.createElement("canvas");
    host.style="position:relative;width:128px;height:128px";canvas.style="width:128px;height:128px";
    host.append(canvas);document.body.append(host);
    const base=10*65536,root={uid:base,type:0,isIf3:true,parentUid:-1,
        rawX:0,rawY:0,rawWidth:128,rawHeight:128},button={uid:base+1,type:3,isIf3:true,parentUid:base,
        rawX:8,rawY:8,rawWidth:64,rawHeight:32,color:255,filled:true,flags:2,actions:["Confirm"]};
    const view=new NativeInterfaceCanvas(canvas,{});
    view.interfaces.load=async()=>({groupId:10,widgets:new Map([[base,root],[base+1,button]]),
        roots:[root],children:new Map([[base,[button]]])});
    const sent=[],interfaces=new ServerInterfaces({view,session:{sendGame:(...args)=>sent.push(args)}});
    interfaces.handle({name:"IF_OPENTOP",payload:Uint8Array.of(138,0)});
    interfaces.handle({name:"IF_SETCOLOUR",payload:Uint8Array.of(128,124,1,0,10,0)});
    await interfaces.pending;
    const ratio=Math.min(3,window.devicePixelRatio||1);
    const color=view.canvas.getContext("2d").getImageData(Math.floor(12*ratio),Math.floor(12*ratio),1,1).data;
    if([248,0,0,255].some((n,i)=>n!==color[i]))throw new Error("Server widget colour did not paint: "+color);
    host.setPointerCapture=()=>{};host.releasePointerCapture=()=>{};interfaces.bindInput(host);
    const bounds=canvas.getBoundingClientRect();
    for(const type of ["pointerdown","pointerup"])canvas.dispatchEvent(new PointerEvent(type,
        {bubbles:true,cancelable:true,pointerId:1,button:0,clientX:bounds.left+12,clientY:bounds.top+12}));
    if(sent.length!==1||sent[0][0]!==1||sent[0][1].join()!=="0,10,0,1,255,255,255,255,1")
        throw new Error("Interface click did not send native IF_BUTTONX");
    // Dialogue heads inherit their parent's clipping, rather than the small
    // model widget's nominal box. Exercise actual raster-to-canvas compositing.
    const head={uid:base+2,groupId:10,type:6,isIf3:true,parentUid:base,rawX:32,rawY:32,
        rawWidth:32,rawHeight:32,modelKind:"npc",modelId:0,modelZoom:796,sequenceId:-1};
    const model={verticesCount:3,faceCount:1,verticesX:Int32Array.from([-64,64,0]),
        verticesY:Int32Array.from([-64,-64,64]),verticesZ:Int32Array.from([0,0,0]),
        indices1:Int32Array.of(0),indices2:Int32Array.of(1),indices3:Int32Array.of(2),faceColors:Uint16Array.of(2000)};
    const headGroup={groupId:10,widgets:new Map([[base,root],[base+2,head]]),roots:[root],children:new Map([[base,[head]]])};
    view.portraits={load:async()=>({model}),pose:async s=>s};
    await view.showGroup(headGroup);
    if(!view.canvas.getContext("2d").getImageData(Math.floor(48*ratio),Math.floor(90*ratio),1,1).data[3])
        throw new Error("Chathead was clipped to nominal widget box");
    let release;view.portraits.load=()=>new Promise(resolve=>release=resolve);
    const lateHead=view.showGroup(headGroup);view.close();release({model});
    await lateHead;
    if(!canvas.hidden||view.active||view.assets.heads.size)throw new Error("Late portrait revived a closed dialogue");
    interfaces.handle({name:"IF_RESYNC_V2",payload:Uint8Array.of(255,255,0,0)});
    await interfaces.pending;
    if(!canvas.hidden)throw new Error("Server resync did not close interface");
    interfaces.close();host.remove();
    // Title controls use accessible native fields while cache fonts paint the
    // visible form. No development shell or terrain preview starts on boot.
    const {NativeTitleScreen}=await import("/title-screen.mjs");
    const screen=document.createElement("section");
    screen.innerHTML='<canvas id="osrs-title"></canvas><div id="title-controls"><button id="title-new-account">New User</button><button id="title-login">Existing User</button><form id="login-form"><input id="login-username"><input id="login-password" type="password"><button id="login-submit">Login</button></form><button id="title-cancel">Cancel</button><p id="login-status"></p></div><button id="title-mute"></button>';
    document.body.append(screen);
    const title=new NativeTitleScreen({canvas:screen.querySelector("canvas"),stage:screen.querySelector("#title-controls"),
        form:screen.querySelector("form"),status:screen.querySelector("p")});
    const titleText=[];
    title.assets.font=title.assets.small={measure:s=>s.length*5,draw(ctx,text){titleText.push(text);}};
    title.showWelcome();
    if(screen.querySelector("canvas").width!==765||screen.querySelector("canvas").height!==503)throw new Error("Title framebuffer must remain native 765 by 503 pixels");
    const titleTransform=screen.querySelector("canvas").getContext("2d").getTransform();
    if(titleTransform.a!==1||titleTransform.d!==1||titleTransform.e!==0||titleTransform.f!==0)throw new Error("Title rasterization introduced device or fractional scaling");
    if(!screen.querySelector("form").hidden||screen.querySelector("#title-login").hidden)throw new Error("Welcome shows login form too early");
    screen.querySelector("#title-new-account").click();
    if(title.mode!=="welcome"||!screen.querySelector("form").hidden)throw new Error("New User must remain inactive");
    screen.querySelector("#title-login").click();
    if(screen.querySelector("form").hidden||screen.querySelector("p").textContent!=="Enter your username/email & password.")throw new Error("Existing User did not open OSRS login form");
    for(const label of ["Welcome to RuneScape","New User","Existing User","Login:","Password:"])if(!titleText.includes(label))throw new Error("Missing OSRS title label: "+label);
    if(titleText.includes("Code:")||screen.querySelector("#login-otp"))throw new Error("Authenticator field remains on ordinary login");
    if(!screen.querySelector("form").noValidate||title.validateCredentials()||screen.querySelector("p").textContent!=="Please enter your username/email.")throw new Error("Missing login must use the title message instead of browser validation");
    screen.querySelector("#login-username").value="Alice";
    if(title.validateCredentials()||screen.querySelector("p").textContent!=="Please enter your password.")throw new Error("Missing password did not produce the title message");
    screen.querySelector("#login-password").value="synthetic";if(!title.validateCredentials())throw new Error("Complete login was blocked");
    const titleInput=screen.querySelector("#login-username");titleInput.value="Alice";titleInput.focus();titleInput.setSelectionRange(1,4);title.paint();
    const titlePixels=screen.querySelector("canvas").getContext("2d").getImageData(0,0,screen.querySelector("canvas").width,screen.querySelector("canvas").height).data;
    let highlighted=false;for(let i=0;i<titlePixels.length;i+=4)if(titlePixels[i]===49&&titlePixels[i+1]===106&&titlePixels[i+2]===197){highlighted=true;break;}
    if(highlighted)throw new Error("Login text must not have a selection highlight");
    titleInput.dispatchEvent(new Event("select"));if(titleInput.selectionStart!==titleInput.selectionEnd)throw new Error("Login text selection was not collapsed");
    screen.querySelector("#login-password").value="synthetic";title.beginConnecting();screen.querySelector("#login-password").value="";title.paint();
    if(screen.hidden||document.body.classList.contains("in-game")||!screen.querySelector("form").hidden)throw new Error("Connecting must retain title artwork and hide login controls");
    if(titleText.includes("Loading - Please wait.")||!titleText.includes("Connecting to server...")||!titleText.includes("*********"))throw new Error("The connecting screen must show the pending login, not a post-auth loading badge");
    title.enterGame();
    if(!screen.hidden||!document.body.classList.contains("in-game"))throw new Error("Title remained over authenticated game");
    title.showLogin("Disconnected");
    if(screen.hidden||screen.querySelector("#login-password").value||document.body.classList.contains("in-game"))throw new Error("Disconnect did not restore clean login screen");
    title.dispose();screen.remove();
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
            }else if(/^\/[a-z][a-z0-9-]*\.mjs$/.test(req.url)){
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
