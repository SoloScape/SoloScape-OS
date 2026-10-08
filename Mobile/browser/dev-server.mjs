// Loopback-only native WebGL world client; exposes only public login configuration.
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRegionKeys } from "./region-keys.mjs";
import {loadPublicLoginConfig} from "../scripts/native-login-config.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const routes = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/diagnostics", ["diagnostics.html", "text/html; charset=utf-8"]],
    ["/diagnostics-app.mjs", ["diagnostics-app.mjs", "text/javascript; charset=utf-8"]],
    ["/world.css", ["world.css", "text/css; charset=utf-8"]],
    ["/terrain-world.mjs", ["terrain-world.mjs", "text/javascript; charset=utf-8"]],
    ["/world-webgl.mjs", ["world-webgl.mjs", "text/javascript; charset=utf-8"]],
    ["/floor-lighting.mjs", ["floor-lighting.mjs", "text/javascript; charset=utf-8"]],
    ["/floor-materials.mjs", ["floor-materials.mjs", "text/javascript; charset=utf-8"]],
    ["/world-startup.mjs", ["world-startup.mjs", "text/javascript; charset=utf-8"]],
    ["/cache-reader.mjs", ["cache-reader.mjs", "text/javascript; charset=utf-8"]],
    ["/model-codec.mjs", ["model-codec.mjs", "text/javascript; charset=utf-8"]],
    ["/object-definitions.mjs", ["object-definitions.mjs", "text/javascript; charset=utf-8"]],
    ["/location-cache.mjs", ["location-cache.mjs", "text/javascript; charset=utf-8"]],
    ["/scenery-models.mjs", ["scenery-models.mjs", "text/javascript; charset=utf-8"]],
    ["/texture-cache.mjs", ["texture-cache.mjs", "text/javascript; charset=utf-8"]],
    ["/texture-mapper.mjs", ["texture-mapper.mjs", "text/javascript; charset=utf-8"]],
    ["/scene-planes.mjs", ["scene-planes.mjs", "text/javascript; charset=utf-8"]],
    ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
    ["/native-js5.mjs", ["native-js5.mjs", "text/javascript; charset=utf-8"]],
    ["/tsps-cache-store.mjs", ["tsps-cache-store.mjs", "text/javascript; charset=utf-8"]],
    ["/sprite-preview.mjs", ["sprite-preview.mjs", "text/javascript; charset=utf-8"]],
    ...["login-crypto","login-protocol","login-pow","native-login","game-protocol"].map(name=>
        [`/${name}.mjs`,[`${name}.mjs`,"text/javascript; charset=utf-8"]]),
    ...["player-sync","player-protocol","player-config","player-colors","player-models","player-animation","native-gameplay","npc-sync","npc-models","npc-interactions","npc-pointer","native-menu","native-interfaces","interface-canvas","interface-protocol","server-interfaces","native-scripts","dialogue-models"].map(name=>
        [`/${name}.mjs`,[`${name}.mjs`,"text/javascript; charset=utf-8"]]),
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);
for(const name of ["title-screen.mjs","title-music.mjs","title-fire.mjs","title-music-worklet.mjs",...(await readdir(root)).filter(name=>/^title-audio-[a-z0-9-]+\.mjs$/.test(name))])
    routes.set("/"+name,[name,"text/javascript; charset=utf-8"]);
// An ephemeral loopback port is allowed solely for CI route smoke tests.
const port = process.env.SOLOSCAPE_PREVIEW_PORT === "0" ? 0 : 3001;
const keyPath=process.env.SOLOSCAPE_XTEA_FILE;
let regionKeys={};
let loginConfig;
try{
    loginConfig=await loadPublicLoginConfig({keyPath:process.env.SOLOSCAPE_RSA_PUBLIC_KEY_FILE,
        gatewayUrl:process.env.SOLOSCAPE_NATIVE_GATEWAY_URL});
}catch{
    loginConfig={unavailable:true,message:"Native login needs the server's generated public client.key. Set SOLOSCAPE_RSA_PUBLIC_KEY_FILE and restart the preview."};
}
if(keyPath){
    const keyBytes=await readFile(keyPath);
    if(keyBytes.length>16*1024*1024)throw new Error("Local region key file exceeds limit");
    regionKeys=normalizeRegionKeys(JSON.parse(keyBytes.toString("utf8")));
}
const server = createServer(async (req, res) => {
    if(req.method==="GET"&&req.url==="/login-config.json"){
        res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
        res.end(JSON.stringify(loginConfig));return;
    }
    if(req.method==="GET"&&req.url==="/region-keys.json"){
        res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
        res.end(JSON.stringify(regionKeys));return;
    }
    const route = req.method === "GET" ? routes.get(req.url) : undefined;
    if (!route) {
        res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("Not found");
        return;
    }
    try {
        const bytes = await readFile(join(root, route[0]));
        res.writeHead(200, {
            "Content-Type": route[1],
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": `default-src 'none'; script-src 'self'; worker-src 'self'; img-src 'self' blob:; style-src 'self'; connect-src 'self' ws://127.0.0.1:43595 ${loginConfig.gatewayUrl?new URL(loginConfig.gatewayUrl).origin:""}; base-uri 'none'; form-action 'none'`,
        });
        res.end(bytes);
    } catch (error) {
        console.error("[native-browser]", error.message);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Preview unavailable");
    }
});
server.listen(port, "127.0.0.1", () => {
    console.log(`[native-client] Visit http://localhost:${server.address().port}/ (requires running JS5 gateway at ws://127.0.0.1:43595/)`);
});
