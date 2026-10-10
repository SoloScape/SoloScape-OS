// Original revision-240 engine development page and game gateway.
// Loopback by default; trusted private LAN access is opt-in.
import {existsSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createGateway} from "../gateway/server.mjs";
import {createEngineSmokeServer} from "./engine-smoke-server.mjs";
import {loadPublicLoginConfig} from "./native-login-config.mjs";
import {createLanPolicy,isLocalPeer} from "./original-lan.mjs";

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
const lanEnabled=process.env.SOLOSCAPE_ENGINE_LAN==="1";
const lan=lanEnabled?createLanPolicy({preferredIp:process.env.SOLOSCAPE_ENGINE_LAN_IP||null}):null;
const bindHost=lanEnabled?"0.0.0.0":"127.0.0.1";
const origin="http://127.0.0.1:"+port;
const lanOrigin=lan?"http://"+lan.ip+":"+port:null;
const isAllowedPeer=lan?lan.isAllowedPeer:isLocalPeer;
const allowedHosts=new Set(["127.0.0.1:"+port,"localhost:"+port,...(lan?[
    lan.ip+":"+port]:[])]);
const {rsa:loginRsaPublic}=await loadPublicLoginConfig({
    keyPath:resolve(process.env.SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE||join(mobile,"../Server/.data/client.key")),
    gatewayUrl:"ws://127.0.0.1:43595/"
});
const gateway=createGateway({tcpHost:"127.0.0.1",tcpPort:upstreamPort,
    allowedOrigins:new Set([origin,"http://localhost:"+port,...(lanOrigin?[lanOrigin]:[])]),
    isAllowedPeer});
const server=createEngineSmokeServer({nativeCacheRoot,gatewayPort,loginRsaPublic,
    isAllowedPeer,allowedHosts});
function listen(instance,port){
    return new Promise((resolve,reject)=>{
        instance.once("error",reject);
        instance.listen(port,bindHost,()=>{instance.off("error",reject);resolve();});
    });
}
try{
    await listen(gateway.httpServer,gatewayPort);
    await listen(server,port);
}catch(error){
    await gateway.close().catch(()=>{});
    throw error;
}
console.log("Original OpenOSRS client: "+origin+"/");
if(lanOrigin){
    console.log("TRUSTED LAN ONLY: "+lanOrigin+"/ (adapter: "+lan.adapter+")");
    console.log("Phone and PC must share the same Wi-Fi/LAN; Windows Firewall may need inbound TCP "+port+" and "+gatewayPort+".");
    console.log("Do not forward ports or connect from untrusted public Wi-Fi; original gamepack and cache are served.");
}
console.log("Reads existing original cache into browser memory; never writes to server cache.");
console.log("Requires native revision-240 JS5 server listening at 127.0.0.1:"+upstreamPort);
console.log("The original engine starts when the page opens. Login stays manual.");
let closing=false;
async function shutdown(){
    if(closing)return;closing=true;
    await gateway.close().catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
}
for(const signal of ["SIGINT","SIGTERM"])
    process.once(signal,()=>{shutdown().catch(error=>console.error(error));});
