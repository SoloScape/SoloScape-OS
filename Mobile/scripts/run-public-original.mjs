import {stat} from "node:fs/promises";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {publicOriginalConfig,createPublicOriginalServer} from "./public-original-server.mjs";
import {loadPublicLoginConfig} from "./native-login-config.mjs";

const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
try{
    const config=publicOriginalConfig(process.env);
    const nativeCacheRoot=resolve(process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT||
        join(mobile,"../Server/.data/cache/LIVE"));
    for(const file of [join(mobile,"teavm-poc/target/engine/javascript/engine.js"),
        ...["client.serial","compilercontrol.json","runelite/index"].map(name=>
            join(mobile,"teavm-poc/target/engine/resources",name)),
        ...["main_file_cache.dat2","main_file_cache.idx255"].map(name=>join(nativeCacheRoot,name))]){
        if(!(await stat(file)).isFile())throw new Error("Build the original engine and install the original cache first");
    }
    const {rsa:loginRsaPublic}=await loadPublicLoginConfig({
        keyPath:resolve(process.env.SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE||join(mobile,"../Server/.data/client.key")),
        gatewayUrl:config.gatewayUrl});
    if(process.argv.includes("--check")){
        console.log("Public host prerequisites OK; no services started. HTTPS proxy and external reachability still need verification.");
    }else{
        const gateway=createPublicOriginalServer({config,loginRsaPublic,nativeCacheRoot});
        gateway.httpServer.on("error",()=>{
            console.error("Public host failed to listen; check the configured port.");process.exitCode=1;
        });
        gateway.httpServer.listen(config.port,"127.0.0.1",()=>{
            console.log("Public game origin: "+config.origin+"/");
            console.log("HTTPS proxy upstream: http://127.0.0.1:"+config.port);
            console.log("External access requires DNS, an HTTPS proxy and a reachable network route.");
        });
        for(const signal of ["SIGINT","SIGTERM"])
            process.once(signal,()=>void gateway.close().catch(()=>{process.exitCode=1;}));
    }
}catch(error){
    console.error(error.code==="ENOENT"?"Missing original engine/cache/public key; build and set up SoloScape first.":error.message);
    process.exitCode=1;
}
