// Original OpenOSRS engine development host. Loopback by default, trusted LAN opt-in only.
// Never forward these ports to the Internet: they serve original gamepack/cache files.
import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {serveOriginalClientAssets} from "./original-client-assets.mjs";
import {isLocalPeer} from "./original-lan.mjs";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
// The phone can access normal LAN game resources, not PC-local debug output.
export function isLoopbackPeer(peer){
    return peer==="127.0.0.1"||peer==="::1"||peer==="::ffff:127.0.0.1";
}
export function createEngineSmokeServer({read=readFile,nativeCacheRoot=process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT,
    gatewayPort=null,loginRsaPublic=null,publicClientConfig=null,sessionDiagnostics=null,
    onLifecycleEvent=null,
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
        // Fixed, content-free browser lifecycle events on the trusted LAN.
        // Never receive usernames, login packets, game state or arbitrary text.
        if(onLifecycleEvent&&req.method==="POST"&&req.url==="/original-lifecycle"){
            if((req.headers.origin&&req.headers.origin!=="http://"+req.headers.host)||
                !req.headers["content-type"]?.startsWith("text/plain")||
                Number(req.headers["content-length"]??0)>40){
                res.writeHead(403);res.end();return;
            }
            let count=0,parts=[];
            try{
                for await(const chunk of req){
                    count+=chunk.length;
                    if(count>40){res.writeHead(413);res.end();return;}
                    parts.push(chunk);
                }
            }catch{if(!res.headersSent){res.writeHead(400);res.end();}return;}
            const name=Buffer.concat(parts).toString("utf8");
            if(!["PAGE_STARTED","PAGE_RESTARTED","TITLE_RIGHT_TAP","PAGEHIDE"].includes(name)){
                res.writeHead(400);res.end();return;
            }
            onLifecycleEvent(name);
            res.writeHead(204,{"Cache-Control":"no-store"});res.end();return;
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
        await serveOriginalClientAssets(req,res,{read,nativeCacheRoot,
            connectSource:"ws://"+gatewayHost+":43595"});
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
