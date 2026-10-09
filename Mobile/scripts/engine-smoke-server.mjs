// Explicit, loopback-only diagnostic host for the locally generated OpenOSRS engine.
// Never integrate this route into the public client or expose engine.js on a LAN.
import {createServer} from "node:http";
import {createReadStream} from "node:fs";
import {readFile,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const files=new Map([
    ["/",["teavm-poc/site/engine-smoke.html","text/html; charset=utf-8"]],
    ["/engine-smoke.mjs",["teavm-poc/site/engine-smoke.mjs","text/javascript; charset=utf-8"]],
    ["/engine.js",["teavm-poc/target/engine/javascript/engine.js","text/javascript; charset=utf-8"]],
    ["/original-resource/client.serial",["teavm-poc/target/engine/resources/client.serial","application/octet-stream"]],
    ["/original-resource/compilercontrol.json",["teavm-poc/target/engine/resources/compilercontrol.json","application/json"]],
    ["/original-resource/runelite/index",["teavm-poc/target/engine/resources/runelite/index","application/octet-stream"]],
]);
export function createEngineSmokeServer({read=readFile,nativeCacheRoot=process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT,gatewayPort=null}={}) {
    return createServer(async(req,res)=>{
        const peer=req.socket.remoteAddress;
        if(!["127.0.0.1","::1","::ffff:127.0.0.1"].includes(peer)){
            res.writeHead(403);res.end("Loopback required");return;
        }
        if(gatewayPort&&req.method==="GET"&&req.url==="/original-gateway"){
            res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify({routes:[43594,443].map(port=>({
                host:"127.0.0.1",port,url:"ws://127.0.0.1:"+gatewayPort+"/"
            }))}));return;
        }
        // Explicit, opt-in local *read-only* snapshot of original cache files.
        // Stream the 237 MB data file; never read it into the Node heap.
        if(nativeCacheRoot&&req.method==="GET"&&req.url==="/original-cache/manifest"){
            const names=["main_file_cache.dat2","main_file_cache.idx255",
                ...Array.from({length:25},(_,i)=>"main_file_cache.idx"+i)];
            const list=[];
            for(const name of names){
                try{const info=await stat(join(nativeCacheRoot,name));
                    if(info.isFile()&&info.size<=512*1024*1024)list.push({name,bytes:info.size});}
                catch(error){if(error.code!=="ENOENT")throw error;}
            }
            res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify({files:list}));return;
        }
        const cacheName=nativeCacheRoot&&req.method==="GET"?
            /^\/original-cache\/(main_file_cache\.(?:dat2|idx(?:255|[0-9]|1[0-9]|2[0-4])))$/.exec(req.url)?.[1]:null;
        if(cacheName){
            try{
                const source=join(nativeCacheRoot,cacheName),info=await stat(source);
                if(!info.isFile()||info.size>512*1024*1024)throw new Error("Invalid native cache entry");
                res.writeHead(200,{"Content-Type":"application/octet-stream","Content-Length":info.size,
                    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
                const stream=createReadStream(source);
                stream.on("error",()=>res.destroy());stream.pipe(res);
            }catch(error){res.writeHead(error.code==="ENOENT"?404:500);res.end("Cache entry unavailable");}
            return;
        }
        const entry=req.method==="GET"?files.get(req.url):null;
        if(!entry){res.writeHead(404,{"Cache-Control":"no-store"});res.end("Not found");return;}
        try{
            const bytes=await read(join(root,entry[0]));
            res.writeHead(200,{"Content-Type":entry[1],"Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff",
                "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ws://127.0.0.1:43595; img-src 'self'; base-uri 'none'; form-action 'none'",
            });
            res.end(bytes);
        }catch(error){
            res.writeHead(error.code==="ENOENT"?404:500,{"Content-Type":"text/plain","Cache-Control":"no-store"});
            res.end(error.code==="ENOENT"?"Original engine not compiled. Run npm run build:openosrs-engine.":"Diagnostic host error");
        }
    });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
    const artifact=join(root,"teavm-poc/target/engine/javascript/engine.js");
    try{await stat(artifact);}catch{
        console.error("Build the locally pinned engine first: npm run build:openosrs-engine");
        process.exit(1);
    }
    const port=Number(process.env.SOLOSCAPE_ENGINE_SMOKE_PORT??3097);
    if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Invalid smoke port");
    const server=createEngineSmokeServer();
    server.listen(port,"127.0.0.1",()=>{
        console.log("Original engine diagnostic ONLY: http://127.0.0.1:"+port+"/");
        console.log("Not served by npm run dev. No original gamepack outputs are committed.");
    });
}
