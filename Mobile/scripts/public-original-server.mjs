// Opt-in public game host behind an HTTPS reverse proxy. No dev bridge routes.
import {createGateway} from "../gateway/server.mjs";
import {serveOriginalClientAssets} from "./original-client-assets.mjs";
import {isLocalPeer} from "./original-lan.mjs";

export function publicOriginalConfig(env) {
    if(env.SOLOSCAPE_PUBLIC_ENABLE!=="1")
        throw new Error("External hosting is opt-in: set SOLOSCAPE_PUBLIC_ENABLE=1");
    let address;
    try{address=new URL(env.SOLOSCAPE_PUBLIC_ORIGIN);}catch{
        throw new Error("Set SOLOSCAPE_PUBLIC_ORIGIN to your public HTTPS origin");
    }
    if(address.protocol!=="https:"||address.hostname.includes("*")||address.username||address.password||
        address.search||address.hash||address.pathname!=="/"||
        address.origin!==env.SOLOSCAPE_PUBLIC_ORIGIN)
        throw new Error("SOLOSCAPE_PUBLIC_ORIGIN must be an HTTPS origin without a path");
    const port=Number(env.SOLOSCAPE_PUBLIC_PORT??8080);
    const tcpPort=Number(env.SOLOSCAPE_GAME_TCP_PORT??43594);
    for(const value of [port,tcpPort])
        if(!Number.isInteger(value)||value<1||value>65535)throw new Error("Invalid public host or game port");
    if(port===tcpPort||port===3097||port===43595)
        throw new Error("Public host needs a separate port from game and development services");
    return {origin:address.origin,host:address.host,port,tcpPort,
        gatewayUrl:"wss://"+address.host+"/"};
}

export function createPublicOriginalServer({config,loginRsaPublic,nativeCacheRoot,read}) {
    const json=(res,value)=>{
        res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store",
            "X-Content-Type-Options":"nosniff"});
        res.end(JSON.stringify(value));
    };
    const requestHandler=async(req,res)=>{
        if(!isLocalPeer(req.socket.remoteAddress)||req.headers.host!==config.host){
            res.writeHead(403);res.end("Public HTTPS proxy required");return;
        }
        try{
            if(req.method==="GET"&&req.url==="/original-gateway"){
                json(res,{routes:[43594,443].map(port=>({host:"127.0.0.1",port,
                    url:config.gatewayUrl}))});return;
            }
            if(req.method==="GET"&&req.url==="/original-login-public-key"){
                json(res,{exponent:loginRsaPublic.exponent,modulus:loginRsaPublic.modulus});return;
            }
            await serveOriginalClientAssets(req,res,{read,nativeCacheRoot,
                publicPage:true,connectSource:config.gatewayUrl});
        }catch{
            if(res.headersSent)res.destroy();
            else{res.writeHead(500);res.end("Game resource unavailable");}
        }
    };
    return createGateway({tcpHost:"127.0.0.1",tcpPort:config.tcpPort,
        allowedOrigins:new Set([config.origin]),allowedHost:config.host,
        isAllowedPeer:isLocalPeer,requestHandler,maxConnections:128,handshakeTimeoutMs:15000});
}
