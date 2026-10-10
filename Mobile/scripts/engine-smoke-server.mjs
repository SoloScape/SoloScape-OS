// Original OpenOSRS engine development host. Loopback by default, trusted LAN opt-in only.
// Never forward these ports to the Internet: they serve original gamepack/cache files.
import {createServer} from "node:http";
import {createReadStream} from "node:fs";
import {readFile,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {isLocalPeer} from "./original-lan.mjs";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const files=new Map([
    ["/",["teavm-poc/site/engine-smoke.html","text/html; charset=utf-8"]],
    ["/engine-smoke.mjs",["teavm-poc/site/engine-smoke.mjs","text/javascript; charset=utf-8"]],
    ["/original-mobile-keyboard.mjs",["teavm-poc/site/original-mobile-keyboard.mjs","text/javascript; charset=utf-8"]],
    ["/engine-smoke.css",["teavm-poc/site/engine-smoke.css","text/css; charset=utf-8"]],
    ["/original-cache-loader.mjs",["teavm-poc/site/original-cache-loader.mjs","text/javascript; charset=utf-8"]],
    ["/engine.js",["teavm-poc/target/engine/javascript/engine.js","text/javascript; charset=utf-8"]],
    ["/original-resource/client.serial",["teavm-poc/target/engine/resources/client.serial","application/octet-stream"]],
    ["/original-resource/compilercontrol.json",["teavm-poc/target/engine/resources/compilercontrol.json","application/json"]],
    ["/original-resource/runelite/index",["teavm-poc/target/engine/resources/runelite/index","application/octet-stream"]],
]);
// The phone can access normal LAN game resources, not PC-local debug output.
export function isLoopbackPeer(peer){
    return peer==="127.0.0.1"||peer==="::1"||peer==="::ffff:127.0.0.1";
}
export function createEngineSmokeServer({read=readFile,nativeCacheRoot=process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT,
    gatewayPort=null,loginRsaPublic=null,publicClientConfig=null,sessionDiagnostics=null,
    isAllowedPeer=isLocalPeer,allowedHosts=null}={}) {
    return createServer(async(req,res)=>{
        const peer=req.socket.remoteAddress;
        if(!isAllowedPeer(peer)||(allowedHosts&&!allowedHosts.has(req.headers.host))){
            res.writeHead(403);res.end("Trusted local network required");return;
        }
        const gatewayHost=allowedHosts?req.headers.host.split(":")[0]:"127.0.0.1";
        // Small LAN connectivity test: never imports or allocates the Java
        // gamepack or original 239 MB native cache in the phone browser.
        if(req.method==="GET"&&req.url==="/health"){
            res.writeHead(200,{"Content-Type":"text/html; charset=utf-8",
                "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
                "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'"});
            res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000"><title>SoloScape LAN check</title><body style="background:#080808;color:#fff;font:18px system-ui;padding:2rem"><h1>SoloScape connection OK</h1><p>Your phone can reach the local page. This check does not load the original Java gamepack or its cache.</p></body></html>');
            return;
        }
        // Read-only, loopback-only gateway lifecycle diagnostics. No packet
        // contents, client addresses, usernames or authentication data.
        if(sessionDiagnostics&&isLoopbackPeer(peer)&&
            req.method==="GET"&&req.url==="/original-session-diagnostics"){
            res.writeHead(200,{"Content-Type":"application/json; charset=utf-8",
                "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify(sessionDiagnostics()));return;
        }
        if(gatewayPort&&req.method==="GET"&&req.url==="/original-gateway"){
            res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify({routes:[43594,443].map(port=>({
                host:"127.0.0.1",port,url:"ws://"+gatewayHost+":"+gatewayPort+"/"
            }))}));return;
        }
        if(loginRsaPublic&&req.method==="GET"&&req.url==="/original-login-public-key"){
            res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify({exponent:loginRsaPublic.exponent,modulus:loginRsaPublic.modulus}));return;
        }
        // Only isolated browser tests use this endpoint to override *public*
        // gamepack parameters without a visible diagnostic form. Never serve
        // private keys, credentials, account data or arbitrary scripts here.
        if(publicClientConfig&&req.method==="GET"&&req.url==="/original-public-config"){
            res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
                "X-Content-Type-Options":"nosniff"});
            res.end(JSON.stringify(publicClientConfig));return;
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
                "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ws://"+gatewayHost+":43595; img-src 'self'; base-uri 'none'; form-action 'none'",
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
