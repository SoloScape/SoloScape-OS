// Private Windows named-pipe daemon. Only owns browser sessions created
// through the Stage 1 bridge. No HTTP listener, arbitrary JS, or web exposure.
import {createServer,createConnection} from "node:net";
import {randomBytes,timingSafeEqual} from "node:crypto";
import {mkdir,readFile,writeFile,unlink} from "node:fs/promises";
import {join} from "node:path";
import {homedir} from "node:os";
import {DesktopController} from "./controller-actions.mjs";
import {Stage1Bridge} from "./bridge.mjs";
import {OwnedChrome} from "./chrome.mjs";

const directory=join(process.env.LOCALAPPDATA||homedir(),"SoloScape-OS","dev-controller");
export const sessionFile=join(directory,"session.json");
const MAX_REQUEST_BYTES=8192;
const MAX_RESPONSE_BYTES=65536;
function safeError(error){
    const msg=String(error?.message||"");
    return /^(?:No active bridge|Gameplay actions|Original|Controller busy|Unknown controller|Unexpected controller|Invalid |Only |Key not allowed|Unsupported |Chrome |Owned Chrome|Duration|timeout|No |Not |rebuild)/.test(msg)
        ?msg.slice(0,160):"Controller operation failed; check the local terminal";
}
export function descriptorValid(descriptor){
    return !!descriptor&&descriptor.version===1&&
        Number.isSafeInteger(descriptor.pid)&&descriptor.pid>0&&
        typeof descriptor.pipe==="string"&&
        /^\\\\\.\\pipe\\soloscape-stage2-[a-f0-9]{32}$/.test(descriptor.pipe)&&
        /^[a-f0-9]{64}$/.test(descriptor.token);
}
function isAlive(pid){
    try{process.kill(pid,0);return true;}
    catch(error){return error.code!=="ESRCH";}
}
export async function readSession(path=sessionFile){
    let data;
    try{data=await readFile(path,"utf8");}
    catch(error){
        if(error.code==="ENOENT"){
            const missing=new Error("Controller is not running; launch Mobile/run.bat");
            missing.code="ENOENT";throw missing;
        }
        throw new Error("Unable to read private controller session");
    }
    let s;
    try{s=JSON.parse(data);}catch{throw new Error("Invalid local controller session");}
    if(!descriptorValid(s))throw new Error("Invalid local controller session");
    return s;
}
export async function sendControllerRequest(action,args={},{
    path=sessionFile,timeoutMs=15000
}={}){
    const desc=await readSession(path);
    if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>400000)
        throw new Error("Invalid controller request timeout");
    return new Promise((resolve,reject)=>{
        let settled=false,data="";
        const connection=createConnection(desc.pipe);
        const done=(error,result)=>{
            if(settled)return;settled=true;clearTimeout(timer);connection.destroy();
            if(error)reject(error);else resolve(result);
        };
        const timer=setTimeout(()=>done(new Error("Controller request timed out")),timeoutMs);
        connection.on("error",()=>done(new Error("Controller is not running; start Mobile/run.bat")));
        connection.on("connect",()=>connection.write(JSON.stringify({
            token:desc.token,action,args
        })+"\n"));
        connection.on("data",chunk=>{
            data+=chunk.toString("utf8");
            if(data.length>MAX_RESPONSE_BYTES)return done(new Error("Controller response too large"));
            const line=data.indexOf("\n");
            if(line<0)return;
            try{
                const response=JSON.parse(data.slice(0,line));
                if(response.ok!==true)return done(new Error(
                    typeof response.error==="string"?response.error:"Controller request failed"));
                done(null,response.result);
            }catch{done(new Error("Invalid controller response"));}
        });
        connection.on("end",()=>done(new Error("Controller closed connection")));
    });
}
export async function createControllerService({
    path=sessionFile,
    bridge=new Stage1Bridge(new OwnedChrome({
        port:Number(process.env.SOLOSCAPE_ENGINE_SMOKE_PORT??3097),
        headless:process.env.SOLOSCAPE_CONTROLLER_TEST_HEADLESS==="1"
    })),
    controller=new DesktopController(bridge)
}={}){
    await mkdir(join(path,".."),{recursive:true,mode:0o700});
    try{
        const previous=await readSession(path);
        if(isAlive(previous.pid))
            throw new Error("Original controller is already running; do not start a second session");
        await unlink(path);
    }catch(error){
        if(error.code!=="ENOENT"&&error instanceof SyntaxError)
            throw new Error("Unrecognised existing controller descriptor; manual review required");
        if(error.code!=="ENOENT"&&!/already running/.test(String(error.message))&&
            !/Unrecognised existing/.test(String(error.message)))
            throw error;
        if(error.code!=="ENOENT"&&/already running|Unrecognised existing/.test(String(error.message)))
            throw error;
    }
    const descriptor={version:1,pid:process.pid,
        pipe:"\\\\.\\pipe\\soloscape-stage2-"+randomBytes(16).toString("hex"),
        token:randomBytes(32).toString("hex")};
    const server=createServer(connection=>{
        let content="",handled=false;
        connection.setTimeout(390000,()=>connection.destroy());
        connection.on("error",()=>{});
        connection.on("data",async data=>{
            if(handled)return;
            content+=String(data);
            if(content.length>MAX_REQUEST_BYTES){
                handled=true;connection.end('{"ok":false,"error":"Controller request too large"}\n');
                return;
            }
            const index=content.indexOf("\n");if(index<0)return;
            handled=true;
            let action;
            try{
                const payload=JSON.parse(content.slice(0,index));
                if(typeof payload.token!=="string"||!/^[a-f0-9]{64}$/.test(payload.token)||
                    !timingSafeEqual(Buffer.from(payload.token),Buffer.from(descriptor.token)))
                    throw new Error("Unauthorized controller request");
                action=payload.action;
                const result=await controller.dispatch(action,payload.args);
                connection.end(JSON.stringify({ok:true,result})+"\n");
                if(action==="shutdown")setImmediate(()=>close());
            }catch(error){connection.end(JSON.stringify({ok:false,error:safeError(error)})+"\n");}
        });
    });
    const close=async()=>{
        server.close();
        try{await bridge.browserClose();}catch{}
        try{
            const current=await readSession(path);
            if(current.token===descriptor.token)await unlink(path);
        }catch{}
    };
    try{
        await new Promise((resolve,reject)=>{
            server.once("error",reject);
            server.listen(descriptor.pipe,()=>{server.off("error",reject);resolve();});
        });
        await writeFile(path,JSON.stringify(descriptor),{flag:"wx",mode:0o600});
    }catch(error){
        await close();throw error;
    }
    return {server,descriptor:{...descriptor,token:"[private]"},close,
        sessionPath:path};
}
