// Home-page OSRS rev-240 title boot: genuine verified cache artwork,
// TeaVM-compiled Java state transitions. Not the OpenOSRS engine/game loop yet.
import {NativeJs5Cache} from "/native-js5.mjs";
import {connectionConfig} from "/connection-config.mjs";
import {namedTitleAsset,loadTitleSprites} from "/teavm/title-assets.mjs";
import {TitleLoginSession} from "/title-login-session.mjs";

const canvas=document.querySelector("#osrs-title");
const ctx=canvas.getContext("2d");
const status=document.querySelector("#client-status");
const loading=document.querySelector("#loading-overlay");
const welcome=document.querySelector("#welcome-controls");
const login=document.querySelector("#login-controls");
const existing=document.querySelector("#existing-user");
const back=document.querySelector("#login-back");
const loginForm=document.querySelector("#login-controls");
const username=document.querySelector("#login-username");
const password=document.querySelector("#login-password");
const otp=document.querySelector("#login-otp");
const submit=document.querySelector("#login-submit");
const sessionControls=document.querySelector("#session-controls");
const disconnect=document.querySelector("#session-disconnect");
const newUser=document.querySelector("#new-user");
const worldCanvas=document.querySelector("#world-canvas");
const worldStage=document.querySelector("#world-stage");
const worldOverlay=document.querySelector("#world-loading-overlay");
const worldStatus=document.querySelector("#world-status");
const worldDisconnect=document.querySelector("#world-disconnect");
let core,background,sprites={},font=null;
let titleLogin=null,account=null,attemptId=0,sessionCache=null,worldBridge=null;
const say=message=>{status.textContent=message;};
const copy=Object.freeze({
    welcome:"Welcome to RuneScape",
    newUser:"New User",
    existing:"Existing User",
    prompt:"Enter your username/email & password.",
    login:"Login",
    cancel:"Cancel"
});

function text(value,x,y,color="#ffffff",small=false){
    if(font){
        font.draw(ctx,value,x-Math.floor(font.measure(value)/2),y,color,true);
        return;
    }
    ctx.font=(small?"bold 11px":"bold 14px")+" Arial,sans-serif";
    ctx.textAlign="center";
    ctx.fillStyle="#000";
    ctx.fillText(value,x+1,y+1);
    ctx.fillStyle=color;
    ctx.fillText(value,x,y);
}

function button(x,y,label){
    const sprite=sprites.titlebutton;
    if(sprite)ctx.drawImage(sprite,Math.floor(x-sprite.width/2),Math.floor(y-sprite.height/2));
    text(label,x,y+5);
}

export function paintTitle(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle="#000";ctx.fillRect(0,0,765,503);
    ctx.imageSmoothingEnabled=false;
    if(background){
        ctx.save();
        ctx.translate(-162,0);
        ctx.drawImage(background,0,0);
        ctx.translate(1089,0);
        ctx.scale(-1,1);
        ctx.drawImage(background,0,0);
        ctx.restore();
    }
    if(sprites.logo)ctx.drawImage(sprites.logo,382-Math.floor(sprites.logo.width/2),18);
    const mode=core?.titleMode?.()??0;
    if(mode===0){
        text("RuneScape is loading - please wait...",382,237);
    }else{
        if(sprites.titlebox)ctx.drawImage(sprites.titlebox,202,170);
        if(mode===1){
            text(copy.welcome,382,251,"#ffff00");
            button(302,291,copy.newUser);
            button(462,291,copy.existing);
        }else if(mode===2){
            text(copy.prompt,382,216,"#ffff00",true);
            text("Login:",295,244,"#ffffff",true);
            text("Password:",295,272,"#ffffff",true);
            text("2FA:",295,300,"#ffffff",true);
            button(302,352,copy.login);
            button(462,352,copy.cancel);
        }else if(mode===4){
            text("Connecting to SoloScape...",382,247,"#ffff00");
            text("Please wait...",382,277,"#ffffff",true);
            button(382,329,"Cancel");
        }else if(mode===3){
            text("Login successful",382,244,"#79ee96");
            text("Entering world...",382,265,"#ffffff",true);
            button(382,329,"Disconnect");
        }
    }
    welcome.hidden=mode!==1;
    login.hidden=mode!==2;
    sessionControls.hidden=mode!==3&&mode!==4;
    disconnect.textContent=mode===4?"Cancel":"Disconnect";
}

async function imageFromBytes(bytes){
    if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)
        throw new Error("Original titlewide.jpg has invalid JPEG signature");
    const image=await createImageBitmap(new Blob([bytes],{type:"image/jpeg"}));
    if(image.width!==545||image.height!==671){
        image.close?.();
        throw new Error("Unexpected revision-240 titlewide.jpg dimensions");
    }
    return image;
}

async function boot(){
    if(!ctx){say("Your browser lacks Canvas2D support");return;}
    try{
        core=await import("/teavm/bridge.js");
        if(core.revision()!==240||typeof core.titleReset!=="function"||
            typeof core.titleReady!=="function"||typeof core.titleExistingUser!=="function"||
            typeof core.titleBack!=="function"||typeof core.titleConnecting!=="function"||
            typeof core.titleAuthenticated!=="function"||typeof core.titleLoginFailed!=="function")
            throw new Error("TeaVM rev-240 title bridge missing; rebuild it");
        core.titleReset();
        paintTitle();
        say("Connecting...");
        const config=await connectionConfig;
        if(!config.gatewayUrl)throw new Error(config.message||"Native JS5 gateway is unavailable");
        const cache=new NativeJs5Cache({revision:240,url:config.gatewayUrl,timeoutMs:12000});
        sessionCache=cache;
        await cache.loadMaster();
        say("Loading title screen...");
        background=await imageFromBytes(await namedTitleAsset(cache,10,"titlewide.jpg"));
        paintTitle();
        say("Loading...");
        sprites=await loadTitleSprites(cache);
        // Show the welcome screen as soon as the mandatory original artwork
        // arrives. The optional cache font must never block first paint.
        core.titleReady();
        titleLogin=new TitleLoginSession({cache,config,
            onStatus:message=>say(message),
            // Runs synchronously inside the native session's success decoder,
            // BEFORE it drains REBUILD_NORMAL_V2 and PLAYER_INFO in the same frame.
            onAuthenticated:result=>{
                worldBridge?.activate(titleLogin.session,result);
                account=result;
                username.value="";password.value="";otp.value="";
                core.titleAuthenticated();
                paintTitle();
                say("Entering world...");
            },
            onDisconnected:message=>{
                worldBridge?.dispose();worldBridge=null;
                account=null;
                core.titleBack();
                core.titleExistingUser();
                paintTitle();
                say("Disconnected: "+message);
            },
            onGamePacket:packet=>worldBridge?.handle(packet),
            onPacket:({count})=>{
                if(count===1)console.info("[teavm-world] First encrypted game packet received");
            }
        });
        paintTitle();
        canvas.dataset.loaded="true";
        loading.hidden=true;
        say("");
        void import("/native-menu.mjs")
            .then(({loadCacheMenuFont})=>loadCacheMenuFont(cache,496))
            .then(loaded=>{font=loaded;paintTitle();})
            .catch(error=>console.warn("[teavm-title] optional cache font unavailable:",error));
    }catch(error){
        loading.hidden=true;
        paintTitle();
        say("Unable to load game: "+(error?.message||String(error)));
        console.error("[teavm-title]",error);
    }
}

existing.addEventListener("click",()=>{
    if(core?.titleMode()!==1)return;
    core.titleExistingUser();paintTitle();
    say("");
    username.focus();
});
loginForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!titleLogin||core?.titleMode()!==2||titleLogin.pending)return;
    const details={username:username.value,password:password.value,otp:otp.value.trim()};
    // Don't retain plaintext input after handing it to the native protocol.
    password.value="";otp.value="";
    const id=++attemptId;
    submit.disabled=true;
    try{
        // Finish loading renderer code BEFORE native authentication: the
        // server may send its first rebuild packet in the login success frame.
        const {TeaVmWorldBridge}=await import("/teavm-world.mjs");
        if(id!==attemptId)return;
        worldBridge?.dispose();
        worldBridge=new TeaVmWorldBridge({
            cache:sessionCache,canvas:worldCanvas,stage:worldStage,title:canvas,
            overlay:worldOverlay,worldStatus,
            onStatus:message=>say(message),
            onReady:()=>{worldStatus.textContent="";}
        });
        core.titleConnecting();
        paintTitle();
        const attempt=titleLogin.login(details);
        details.password="";details.otp="";
        await attempt;
    }catch(error){
        if(id===attemptId){
            worldBridge?.dispose();worldBridge=null;
            if(core?.titleMode()===4)core.titleLoginFailed();
            paintTitle();
            say("Unable to log in: "+(error?.message||String(error)));
        }
    }finally{
        details.password="";details.otp="";
        if(id===attemptId)submit.disabled=false;
    }
});
back.addEventListener("click",()=>{
    ++attemptId;titleLogin?.disconnect();account=null;
    worldBridge?.dispose();worldBridge=null;
    submit.disabled=false;
    username.value="";password.value="";otp.value="";
    core?.titleBack();paintTitle();say("");
});
disconnect.addEventListener("click",()=>{
    ++attemptId;titleLogin?.disconnect();account=null;
    worldBridge?.dispose();worldBridge=null;
    submit.disabled=false;
    username.value="";password.value="";otp.value="";
    core?.titleBack();paintTitle();
    say("Logged out.");
});
worldDisconnect.addEventListener("click",()=>disconnect.click());
newUser.addEventListener("click",()=>{
    say("Account creation is not available yet.");
});
window.addEventListener("pagehide",()=>{
    ++attemptId;titleLogin?.disconnect();
    worldBridge?.dispose();worldBridge=null;
    password.value="";otp.value="";username.value="";
    background?.close?.();
},{once:true});
void boot();
