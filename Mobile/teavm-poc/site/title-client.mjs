// Cache-rendered OpenOSRS title with the TeaVM state bridge and native session.
import {NativeJs5Cache} from "/native-js5.mjs";
import {connectionConfig} from "/connection-config.mjs";
import {NativeTitleScreen} from "/title-screen.mjs";
import {TitleLoginSession} from "/title-login-session.mjs";

const canvas=document.querySelector("#osrs-title");
const titleStage=document.querySelector("#title-screen");
const status=document.querySelector("#client-status");
const loginForm=document.querySelector("#login-form");
const username=document.querySelector("#login-username");
const password=document.querySelector("#login-password");
const submit=document.querySelector("#login-submit");
const worldCanvas=document.querySelector("#world-canvas");
const worldStage=document.querySelector("#world-stage");
const worldOverlay=document.querySelector("#world-loading-overlay");
const worldStatus=document.querySelector("#world-status");
let core,titleLogin,sessionCache,worldBridge,attemptId=0;
const say=message=>{status.textContent=message;};
const title=new NativeTitleScreen({canvas,stage:document.querySelector("#title-controls"),
    form:loginForm,status,onCancel:cancelLogin,fillWindow:true});

function cancelLogin(){
    ++attemptId;
    titleLogin?.disconnect();
    worldBridge?.dispose();worldBridge=null;
    submit.disabled=false;
    password.value="";
    core?.titleBack();
}

async function boot(){
    try{
        core=await import("/teavm/bridge.js");
        if(core.revision()!==240||["titleReset","titleReady","titleExistingUser",
            "titleBack","titleConnecting","titleAuthenticated","titleLoginFailed"]
            .some(name=>typeof core[name]!=="function"))
            throw new Error("TeaVM rev-240 title bridge missing; rebuild it");
        core.titleReset();
        const config=await connectionConfig;
        if(!config.gatewayUrl)throw new Error(config.message||"Native JS5 gateway is unavailable");
        sessionCache=new NativeJs5Cache({revision:240,url:config.gatewayUrl,timeoutMs:12000});
        titleLogin=new TitleLoginSession({cache:sessionCache,config,
            onStatus:say,
            // Attach synchronously before same-frame rebuild/player packets drain.
            onAuthenticated:result=>{
                worldBridge.activate(titleLogin.session,result);
                core.titleAuthenticated();
                title.enterGame();
                password.value="";
            },
            onDisconnected:message=>{
                ++attemptId;
                worldBridge?.dispose();worldBridge=null;
                core.titleBack();core.titleExistingUser();
                submit.disabled=false;
                title.showLogin("Disconnected: "+message);
            },
            onGamePacket:packet=>worldBridge?.handle(packet)
        });
        await title.start(sessionCache);
        if(title.mode==="welcome")core.titleReady();
    }catch(error){
        title.mode="error";
        title.message=error?.message||String(error);
        say("Unable to load game: "+title.message);
        title.syncControls();title.paint();
        console.error("[teavm-title]",error);
    }
}

document.querySelector("#title-login").addEventListener("click",()=>{
    core?.titleExistingUser();
});
loginForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!titleLogin||core?.titleMode()!==2||title.mode!=="login"||titleLogin.pending)return;
    if(!title.validateCredentials())return;
    const details={username:username.value,password:password.value,otp:""};
    const id=++attemptId;
    submit.disabled=true;
    core.titleConnecting();title.beginConnecting();
    // Keep only the masked length on the canvas while connecting.
    password.value="";
    try{
        const {TeaVmWorldBridge}=await import("/teavm-world.mjs");
        if(id!==attemptId)return;
        worldBridge?.dispose();
        worldBridge=new TeaVmWorldBridge({cache:sessionCache,canvas:worldCanvas,
            stage:worldStage,title:titleStage,overlay:worldOverlay,worldStatus,
            onStatus:say,onReady:()=>{worldStatus.textContent="";}});
        const attempt=titleLogin.login(details);
        details.password="";
        await attempt;
    }catch(error){
        if(id===attemptId){
            worldBridge?.dispose();worldBridge=null;
            core.titleLoginFailed();
            title.showLogin("Unable to log in: "+(error?.message||String(error)));
        }
    }finally{
        details.password="";
        if(id===attemptId)submit.disabled=false;
    }
});
window.addEventListener("pagehide",()=>{
    cancelLogin();username.value="";title.dispose();
},{once:true});
void boot();
