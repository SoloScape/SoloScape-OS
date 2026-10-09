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
let core,background,sprites={},font=null;
let titleLogin=null,account=null,attemptId=0;
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
            text("Authenticating with the revision-240 game server",382,277,"#ffffff",true);
            button(382,329,"Cancel");
        }else if(mode===3){
            text("Login successful",382,244,"#79ee96");
            text("Player slot "+account?.playerIndex+" authenticated",382,265,"#ffffff",true);
            text("TeaVM gameplay is not yet available",382,287,"#ffff00",true);
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
        say("TeaVM Java initialized. Contacting revision-240 JS5 gateway…");
        const config=await connectionConfig;
        if(!config.gatewayUrl)throw new Error(config.message||"Native JS5 gateway is unavailable");
        const cache=new NativeJs5Cache({revision:240,url:config.gatewayUrl,timeoutMs:12000});
        await cache.loadMaster();
        say("Verified JS5 master index. Loading original titlewide.jpg…");
        background=await imageFromBytes(await namedTitleAsset(cache,10,"titlewide.jpg"));
        paintTitle();
        say("Loading original revision-240 title sprites…");
        sprites=await loadTitleSprites(cache);
        // Show the welcome screen as soon as the mandatory original artwork
        // arrives. The optional cache font must never block first paint.
        core.titleReady();
        titleLogin=new TitleLoginSession({cache,config,
            onStatus:message=>say(message),
            onAuthenticated:result=>{
                account=result;
                username.value="";password.value="";otp.value="";
                core.titleAuthenticated();
                paintTitle();
                say("Authenticated by SoloScape server: player slot "+result.playerIndex+
                    ". The TeaVM scene/game loop is not yet implemented. Disconnect here or use /legacy to play (separate login).");
            },
            onDisconnected:message=>{
                account=null;
                core.titleBack();
                core.titleExistingUser();
                paintTitle();
                say("Session ended: "+message+". You can log in again.");
            },
            onPacket:({count})=>{
                if(count===1||count%25===0)
                    say("Authenticated; "+count+" encrypted game packets received. TeaVM gameplay is not implemented yet.");
            }
        });
        paintTitle();
        canvas.dataset.loaded="true";
        loading.hidden=true;
        say("Original revision-240 title assets ready. Native encrypted login available. TeaVM gameplay is still in development.");
        void import("/native-menu.mjs")
            .then(({loadCacheMenuFont})=>loadCacheMenuFont(cache,496))
            .then(loaded=>{font=loaded;paintTitle();})
            .catch(error=>console.warn("[teavm-title] optional cache font unavailable:",error));
    }catch(error){
        loading.hidden=true;
        paintTitle();
        say("Title screen unavailable: "+(error?.message||String(error))+
            ". Check JS5 gateway and run npm run build:teavm.");
        console.error("[teavm-title]",error);
    }
}

existing.addEventListener("click",()=>{
    if(core?.titleMode()!==1)return;
    core.titleExistingUser();paintTitle();
    say("Log in using the native revision-240 encrypted protocol. Gameplay is not yet ported to TeaVM.");
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
        core.titleConnecting();
        paintTitle();
        const attempt=titleLogin.login(details);
        details.password="";details.otp="";
        await attempt;
    }catch(error){
        if(id===attemptId&&core?.titleMode()===4){
            core.titleLoginFailed();
            paintTitle();
            say("Server login failed: "+(error?.message||String(error)));
        }
    }finally{
        details.password="";details.otp="";
        if(id===attemptId)submit.disabled=false;
    }
});
back.addEventListener("click",()=>{
    ++attemptId;titleLogin?.disconnect();account=null;
    submit.disabled=false;
    username.value="";password.value="";otp.value="";
    core?.titleBack();paintTitle();say("Original revision-240 title assets ready.");
});
disconnect.addEventListener("click",()=>{
    ++attemptId;titleLogin?.disconnect();account=null;
    submit.disabled=false;
    username.value="";password.value="";otp.value="";
    core?.titleBack();paintTitle();
    say("Disconnected from SoloScape. Password, username and session cleared.");
});
newUser.addEventListener("click",()=>{
    say("Account creation is not yet available in the TeaVM client. Use the working /legacy client.");
});
window.addEventListener("pagehide",()=>{
    ++attemptId;titleLogin?.disconnect();
    password.value="";otp.value="";username.value="";
    background?.close?.();
},{once:true});
void boot();
