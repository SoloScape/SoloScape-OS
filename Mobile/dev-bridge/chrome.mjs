// Local-only Chrome DevTools session owned by the SoloScape Stage 1 MCP bridge.
// No port forwarding, browser attach, arbitrary page navigation, or arbitrary evaluation.
import {spawn,spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import WebSocket from "ws";

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function originalDiagnosticUrl(port=3097){
    if(!Number.isInteger(port)||port<1024||port>65535)
        throw new Error("Diagnostic port must be an integer from 1024 to 65535");
    return "http://127.0.0.1:"+port+"/";
}
export class OwnedChrome {
    constructor({port=3097,chromeBinary=process.env.CHROME_BIN||
        (process.platform==="win32"?"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe":"google-chrome"),
        headless=false}={}){
        this.url=originalDiagnosticUrl(port);
        this.binary=chromeBinary;
        this.headless=headless;
        this.child=null;this.profile=null;this.socket=null;
        this.pending=new Map();this.counter=0;
    }
    get active(){return !!this.socket&&this.socket.readyState===WebSocket.OPEN;}
    async start(){
        if(this.child||this.socket)throw new Error("Owned Chrome session already started");
        // Never start a browser against a non-original page.
        const response=await fetch(this.url,{signal:AbortSignal.timeout(4000)});
        if(!response.ok||!(await response.text()).includes("Original OpenOSRS engine"))
            throw new Error("Original engine diagnostic is not ready at "+this.url);
        this.profile=await mkdtemp(join(tmpdir(),"soloscape-stage1-mcp-"));
        const args=["--no-first-run","--no-default-browser-check","--disable-extensions",
            "--disable-background-networking","--remote-debugging-port=0",
            "--user-data-dir="+this.profile];
        if(this.headless)args.push("--headless=new");
        args.push(this.url);
        try{
            this.child=spawn(this.binary,args,{stdio:"ignore",windowsHide:this.headless});
            let port=0;
            for(let i=0;i<90&&!port;i++){
                // On Windows chrome.exe may be a short-lived launcher; the actual
                // browser can continue in another process using this unique profile.
                // Wait for Chrome's DevToolsActivePort, not the launcher's exit code.
                try{
                    const data=await readFile(join(this.profile,"DevToolsActivePort"),"utf8");
                    port=Number(data.split(/\r?\n/)[0]);
                }catch{await delay(150);}
            }
            if(!port||!Number.isInteger(port))throw new Error("Chrome localhost CDP port unavailable");
            this.port=port;
            let target;
            for(let i=0;i<80&&!target;i++){
                const response=await fetch("http://127.0.0.1:"+port+"/json/list",{signal:AbortSignal.timeout(3000)});
                const targets=await response.json();
                target=targets.find(t=>t.type==="page"&&t.url===this.url);
                if(!target)await delay(150);
            }
            if(!target||!target.webSocketDebuggerUrl)
                throw new Error("Original diagnostic tab not found in owned Chrome");
            const wsUrl=new URL(target.webSocketDebuggerUrl);
            if(wsUrl.protocol!=="ws:"||!["127.0.0.1","localhost"].includes(wsUrl.hostname)||
                Number(wsUrl.port)!==port)throw new Error("Refusing nonlocal CDP endpoint");
            this.socket=new WebSocket(wsUrl.toString(),{handshakeTimeout:5000});
            await new Promise((resolve,reject)=>{
                this.socket.once("open",resolve);
                this.socket.once("error",reject);
            });
            this.socket.on("message",bytes=>{
                let message;try{message=JSON.parse(String(bytes));}catch{return;}
                const pending=this.pending.get(message.id);
                if(!pending)return;
                this.pending.delete(message.id);clearTimeout(pending.timeout);
                if(message.error)pending.reject(new Error("Chrome CDP error: "+String(message.error.message).slice(0,200)));
                else pending.resolve(message.result);
            });
            this.socket.on("close",()=>this.rejectPending("Browser CDP connection closed"));
            await this.command("Runtime.enable");
            await this.command("Page.enable");
            return {status:"opened",url:this.url,session:"owned-local-chrome",
                note:"Log in manually with a disposable account. The bridge does not access credentials."};
        }catch(error){await this.stop();throw error;}
    }
    rejectPending(message){
        for(const pending of this.pending.values()){
            clearTimeout(pending.timeout);pending.reject(new Error(message));
        }
        this.pending.clear();
    }
    command(method,params={}){
        if(!this.active)throw new Error("No active bridge Chrome session. Call browser_start first.");
        const id=++this.counter;
        return new Promise((resolve,reject)=>{
            const timeout=setTimeout(()=>{
                this.pending.delete(id);reject(new Error("Chrome CDP operation timed out"));
            },10000);
            this.pending.set(id,{resolve,reject,timeout});
            try{this.socket.send(JSON.stringify({id,method,params}));}
            catch(error){clearTimeout(timeout);this.pending.delete(id);reject(error);}
        });
    }
    async evaluate(expression){
        const result=await this.command("Runtime.evaluate",{
            expression,returnByValue:true,awaitPromise:false,timeout:5000
        });
        if(result?.exceptionDetails)throw new Error("Original diagnostic is unavailable");
        return result?.result?.value;
    }
    async stop(){
        if(this.active){
            try{await this.command("Browser.close");}catch{}
        }
        this.rejectPending("Browser session stopped");
        if(this.socket){
            try{this.socket.removeAllListeners();this.socket.close();}catch{}
            this.socket=null;
        }
        const child=this.child;this.child=null;
        if(child?.pid){
            if(process.platform==="win32")
                spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore",timeout:5000});
            else child.kill("SIGTERM");
        }
        const profile=this.profile;this.profile=null;
        if(profile)await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:300}).catch(()=>{});
        return {status:"stopped"};
    }
}
