import {validateNativeGatewayUrl} from "./native-js5.mjs";
import {IsaacCipher,validateRsaPublicKey} from "./login-crypto.mjs";
import {encodeLogin,decodeLoginSuccess,NativeLoginError,loginString,LOGIN_REVISION} from "./login-protocol.mjs";
import {solveProofOfWork,encodeProofOfWorkReply,MAX_PROOF_OF_WORK_SIZE} from "./login-pow.mjs";
import {SERVER_PACKETS,CLIENT_NO_TIMEOUT} from "./game-protocol.mjs";

const MAX_BUFFER=1024*1024;
// The gateway forwards an ordered TCP byte stream: WebSocket messages are not packet boundaries.
export class NativeGameSession {
    constructor({url="ws://127.0.0.1:43595/",WebSocketClass=globalThis.WebSocket,
        timeoutMs=60000,heartbeatMs=5000,onStatus=()=>{},onPacket=()=>{},onClose=()=>{}}={}){
        this.url=validateNativeGatewayUrl(url);this.WebSocketClass=WebSocketClass;
        if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000||!Number.isInteger(heartbeatMs)||heartbeatMs<1)
            throw new Error("Invalid native session timeout");
        this.timeoutMs=timeoutMs;this.heartbeatMs=heartbeatMs;
        this.onStatus=onStatus;this.onPacket=onPacket;this.onClose=onClose;
        this.state="idle";this.buffer=new Uint8Array();this.connected=false;
        this.abort=new AbortController();
    }
    login(credentials,config){
        if(this.state!=="idle")throw new Error("Native session already started");
        if(config?.revision!==LOGIN_REVISION)throw new Error("Native login requires revision 240");
        validateRsaPublicKey(config.rsa);
        // Validate credentials before opening the transport; do not include their values in errors.
        loginString(credentials.username.trim(),320,"Username").fill(0);loginString(credentials.password,80,"Password").fill(0);
        if(credentials.otp&&!/^\d{6}$/.test(credentials.otp))throw new Error("Authenticator code must be six digits");
        const seed=new Int32Array(4),uuid=new Uint8Array(24);
        crypto.getRandomValues(seed);crypto.getRandomValues(uuid);
        this.encodeCipher=new IsaacCipher(seed);
        this.decodeCipher=new IsaacCipher(Int32Array.from(seed,n=>(n+50)|0));
        // A preflight packet validates the full config without sending data or keeping plaintext bytes.
        try{encodeLogin({...credentials,...config,sessionId:new Uint8Array(8),seed,uuid}).fill(0);}
        catch(error){seed.fill(0);uuid.fill(0);this.encodeCipher.clear();this.decodeCipher.clear();throw error;}
        this.pendingLogin={...credentials,...config,seed,uuid};
        this.state="opening";
        return new Promise((resolve,reject)=>{
            this.resolve=resolve;this.reject=reject;
            this.timer=setTimeout(()=>this.stop(new Error("Native login timed out")),this.timeoutMs);
            try{
                this.socket=new this.WebSocketClass(this.url);this.socket.binaryType="arraybuffer";
                this.socket.addEventListener("open",()=>{
                    if(this.state!=="opening")return;
                    try{this.state="hello";this.onStatus("Requesting native session…");this.send(Uint8Array.of(14));}
                    catch(error){this.stop(error);}
                });
                this.socket.addEventListener("message",event=>{
                    if(this.state==="closed")return;
                    try{
                        if(!(event.data instanceof ArrayBuffer))throw new Error("Expected binary native game response");
                        const bytes=new Uint8Array(event.data);
                        if(this.buffer.length+bytes.length>MAX_BUFFER)throw new Error("Native game receive buffer exceeded limit");
                        const joined=new Uint8Array(this.buffer.length+bytes.length);
                        joined.set(this.buffer);joined.set(bytes,this.buffer.length);this.buffer=joined;
                        this.drain();
                    }catch(error){this.stop(error);}
                });
                this.socket.addEventListener("error",()=>this.stop(new Error("Native game WebSocket failed")));
                this.socket.addEventListener("close",()=>this.stop(new Error(this.connected?
                    "Native game connection closed":"Native game connection closed before login completed")));
            }catch(error){this.stop(error);}
        });
    }
    take(size){const bytes=this.buffer.slice(0,size);this.buffer=this.buffer.slice(size);return bytes;}
    send(bytes){
        if(this.socket?.readyState!==1)throw new Error("Native game transport is not open");
        if(this.socket.bufferedAmount>MAX_BUFFER)throw new Error("Native game send buffer exceeded limit");
        this.socket.send(bytes.slice());
    }
    drain(){
        while(this.buffer.length&&this.state!=="closed"){
            if(this.state==="hello"){
                if(this.buffer[0]!==0)throw new NativeLoginError(this.take(1)[0]);
                if(this.buffer.length<9)return;
                const sessionId=this.take(9).slice(1);
                let packet;
                try{packet=encodeLogin({...this.pendingLogin,sessionId});}
                finally{sessionId.fill(0);this.clearPendingLogin();}
                this.state="response";this.onStatus("Authenticating…");this.send(packet);packet.fill(0);
            }else if(this.state==="response"){
                const code=this.buffer[0];
                if(code===69){
                    if(this.buffer.length<3)return;
                    const length=(this.buffer[1]<<8)|this.buffer[2];
                    if(length<4||length>MAX_PROOF_OF_WORK_SIZE)throw new Error("Invalid login proof of work size");
                    if(this.buffer.length<3+length)return;
                    this.take(3);const challenge=this.take(length);
                    if(this.solvedChallenge)throw new Error("Repeated login proof of work");
                    this.solvedChallenge=true;this.state="solving";this.onStatus("Completing login challenge…");
                    void solveProofOfWork(challenge,{signal:this.abort.signal}).then(solution=>{
                        if(this.state!=="solving")return;
                        this.state="response";this.send(encodeProofOfWorkReply(solution));this.drain();
                    }).catch(error=>this.stop(error));
                    return;
                }
                if(code!==2)throw new NativeLoginError(this.take(1)[0]);
                if(this.buffer.length<2)return;
                if(this.buffer[1]!==37)throw new Error("Unexpected revision-240 login success size");
                this.take(2);this.state="success";
            }else if(this.state==="success"){
                if(this.buffer.length<34)return;
                const metadata=this.take(34);
                try{this.account=decodeLoginSuccess(metadata,this.decodeCipher);}finally{metadata.fill(0);}
                this.state="game";this.connected=true;clearTimeout(this.timer);
                this.heartbeat=setInterval(()=>{
                    try{this.send(Uint8Array.of((CLIENT_NO_TIMEOUT+this.encodeCipher.nextInt())&255));}
                    catch(error){this.stop(error);}
                },this.heartbeatMs);
                this.onStatus("Authenticated");this.resolve(this.account);this.resolve=this.reject=null;
            }else if(this.state==="game"){
                if(!this.packet){
                    const first=(this.take(1)[0]-this.decodeCipher.nextInt())&255;
                    this.packet={first,opcode:first<128?first:null,size:null};
                }
                const packet=this.packet;
                if(packet.opcode===null){
                    if(!this.buffer.length)return;
                    packet.opcode=((packet.first-128)<<8)|((this.take(1)[0]-this.decodeCipher.nextInt())&255);
                }
                const definition=SERVER_PACKETS.get(packet.opcode);
                if(!definition)throw new Error("Unknown revision-240 game opcode "+packet.opcode);
                if(packet.size===null){
                    if(definition.size>=0)packet.size=definition.size;
                    else{
                        const width=-definition.size;
                        if(this.buffer.length<width)return;
                        const size=this.take(width);packet.size=width===1?size[0]:(size[0]<<8)|size[1];
                    }
                }
                if(this.buffer.length<packet.size)return;
                const payload=this.take(packet.size);this.packet=null;
                this.onPacket({opcode:packet.opcode,name:definition.name,payload});
                if(definition.name.startsWith("LOGOUT")){this.stop(new Error("Server ended the native session"));return;}
            }else return;
        }
    }
    clearPendingLogin(){
        if(!this.pendingLogin)return;
        this.pendingLogin.seed.fill(0);this.pendingLogin.uuid.fill(0);
        this.pendingLogin.password="";this.pendingLogin.otp="";this.pendingLogin=null;
    }
    stop(error){
        if(this.state==="closed")return;
        this.state="closed";this.connected=false;this.abort.abort();
        clearTimeout(this.timer);clearInterval(this.heartbeat);this.clearPendingLogin();
        this.buffer.fill(0);this.buffer=new Uint8Array();this.packet=null;
        this.encodeCipher?.clear();this.decodeCipher?.clear();this.account=null;
        this.reject?.(error);this.resolve=this.reject=null;
        try{this.socket?.close();}catch{}
        this.onClose(error.message);
    }
    close(){this.stop(new Error("Native session disconnected"));}
}
