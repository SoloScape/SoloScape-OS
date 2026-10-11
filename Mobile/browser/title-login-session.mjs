/**
 * Native rev-240 login adapter for the TeaVM title screen.
 *
 * Reuses SoloScape's tested binary WebSocket / RSA / ISAAC NativeGameSession.
 * The Java TeaVM bridge owns only title UI state. No gamepack networking is
 * claimed, no passwords are cached, and no session is exported across pages.
 */
import {NativeGameSession} from "./native-login.mjs";
import {loginCacheCrcs} from "./login-protocol.mjs";

export class TitleLoginSession {
    constructor({cache,config,createSession=options=>new NativeGameSession(options),
        onStatus=()=>{},onAuthenticated=()=>{},onDisconnected=()=>{},onPacket=()=>{},
        onGamePacket=()=>{}}={}) {
        this.cache=cache;this.config=config;this.createSession=createSession;
        this.onStatus=onStatus;this.onAuthenticated=onAuthenticated;
        this.onDisconnected=onDisconnected;this.onPacket=onPacket;
        this.onGamePacket=onGamePacket;
        this.session=null;this.pending=false;this.authenticated=false;this.sequence=0;
        this.packetCount=0;
    }
    async login({username,password,otp=""}={}) {
        if(this.pending||this.session)throw new Error("A login session is already active");
        if(typeof username!=="string"||!username.trim()||typeof password!=="string"||!password)
            throw new Error("Enter your username and password");
        if(otp&&!/^\d{6}$/.test(otp))
            throw new Error("Authenticator code must be six digits");
        if(this.config?.unavailable||this.config?.revision!==240||
            !this.config.gatewayUrl||!this.config.rsa)
            throw new Error("Valid revision-240 native login configuration is unavailable");
        if(!this.cache)throw new Error("Revision-240 cache is not ready");
        const sequence=++this.sequence;
        this.pending=true;this.packetCount=0;
        try{
            this.onStatus("Checking native login cache manifest...");
            const crcs=loginCacheCrcs(await this.cache.loadMaster());
            if(sequence!==this.sequence)throw new Error("Login cancelled");
            const session=this.createSession({
                url:this.config.gatewayUrl,
                onStatus:message=>{
                    if(sequence===this.sequence)this.onStatus(message);
                },
                // NativeGameSession calls onAuthenticated synchronously before
                // draining the first REBUILD_NORMAL_V2 packet from this frame.
                onAuthenticated:account=>{
                    if(sequence!==this.sequence)return;
                    this.authenticated=true;
                    this.onAuthenticated({playerIndex:account.playerIndex,member:account.member,
                        staffModLevel:account.staffModLevel});
                },
                onPacket:packet=>{
                    if(sequence!==this.sequence||!this.authenticated)return;
                    this.packetCount++;
                    // Pass raw payload only to the in-memory game scene decoder.
                    this.onGamePacket(packet);
                    this.onPacket({count:this.packetCount,opcode:packet.opcode,name:packet.name});
                },
                onClose:message=>{
                    if(sequence!==this.sequence||this.session!==session)return;
                    this.session=null;
                    const wasAuthenticated=this.authenticated;
                    this.authenticated=false;
                    if(wasAuthenticated)this.onDisconnected(message);
                }
            });
            this.session=session;
            const credentials={username:username.trim(),password,otp};
            let pending;
            try{pending=session.login(credentials,{
                ...this.config,crcs,width:765,height:503
            });}
            finally{credentials.password="";credentials.otp="";}
            const account=await pending;
            if(sequence!==this.sequence){
                session.close();
                throw new Error("Login cancelled");
            }
            return account;
        }catch(error){
            if(sequence===this.sequence){
                const current=this.session;
                this.session=null;this.authenticated=false;
                current?.close();
            }
            throw error;
        }finally{
            if(sequence===this.sequence)this.pending=false;
        }
    }
    disconnect(){
        this.sequence++;
        const current=this.session;this.session=null;
        this.pending=false;this.authenticated=false;this.packetCount=0;
        current?.close();
    }
}
