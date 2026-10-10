// Isolated local OpenOSRS title harness: original gamepack and local cache only.
// Never expose the gamepack, cache or TCP proxy beyond 127.0.0.1.
import {existsSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createGateway} from "../gateway/server.mjs";
import {createEngineSmokeServer} from "./engine-smoke-server.mjs";
import {loadPublicLoginConfig} from "./native-login-config.mjs";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const nativeCacheRoot=resolve(process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT||
    join(mobile,"../Server/.data/cache/LIVE"));
const gamepackJs=join(mobile,"teavm-poc/target/engine/javascript/engine.js");
const port=Number(process.env.SOLOSCAPE_ENGINE_SMOKE_PORT??3097);
const gatewayPort=43595;
const upstreamPort=Number(process.env.SOLOSCAPE_GAME_TCP_PORT??43594);
if(!existsSync(gamepackJs))
    throw new Error("Original engine not compiled. Run npm run build:openosrs-engine first.");
for(const name of ["main_file_cache.dat2","main_file_cache.idx255"])
    if(!existsSync(join(nativeCacheRoot,name)))
        throw new Error("Native original cache is missing "+name+" at "+nativeCacheRoot);
for(const value of [port,upstreamPort])
    if(!Number.isInteger(value)||value<1||value>65535)
        throw new Error("Invalid local port");
if(port===gatewayPort||upstreamPort===gatewayPort)
    throw new Error("Local diagnostic, native server and WebSocket gateway need separate ports");
const origin="http://127.0.0.1:"+port;
const {rsa:loginRsaPublic}=await loadPublicLoginConfig({
    keyPath:resolve(process.env.SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE||join(mobile,"../Server/.data/client.key")),
    gatewayUrl:"ws://127.0.0.1:43595/"
});
const gateway=createGateway({tcpHost:"127.0.0.1",tcpPort:upstreamPort,
    allowedOrigins:new Set([origin])});
const server=createEngineSmokeServer({nativeCacheRoot,gatewayPort,loginRsaPublic});
function listen(instance,port){
    return new Promise((resolve,reject)=>{
        instance.once("error",reject);
        instance.listen(port,"127.0.0.1",()=>{instance.off("error",reject);resolve();});
    });
}
try{
    await listen(gateway.httpServer,gatewayPort);
    await listen(server,port);
}catch(error){
    await gateway.close().catch(()=>{});
    throw error;
}
console.log("Original OpenOSRS title diagnostic (loopback only): "+origin+"/");
console.log("Reads existing original cache into browser memory; never writes to server cache.");
console.log("Requires native revision-240 JS5 server listening at 127.0.0.1:"+upstreamPort);
console.log("Click Initialize original engine; LOGIN_SCREEN and original title art are the proof.");
let closing=false;
async function shutdown(){
    if(closing)return;closing=true;
    await gateway.close().catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
}
for(const signal of ["SIGINT","SIGTERM"])
    process.once(signal,()=>{shutdown().catch(error=>console.error(error));});
