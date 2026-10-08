// Revision-240 in-game RuneScape title, cross-checked against the local OpenOSRS
// injected game client (kk.class string constants) and verified JS5 assets.
// Every image/font is fetched by name from SoloScape's verified 240 cache.
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeIndexedSprites} from "./sprite-preview.mjs";
import {loadCacheMenuFont} from "./native-menu.mjs";
import {djb2} from "./terrain-world.mjs";
import {LoginScreenAnimation} from "./title-fire.mjs";
import {NativeTitleMusic} from "./title-music.mjs";

// Wording confirmed against rev-240 OpenOSRS injected game class kk.
export const OSRS_TITLE_FONT_IDS=Object.freeze({bold12:496,plain11:494});
export const OSRS_TITLE_COPY=Object.freeze({
    loading:"RuneScape is loading - please wait...",
    welcome:"Welcome to RuneScape",newUser:"New User",existingUser:"Existing User",
    loginPrompt:"Enter your username/email & password.",
    loginLabel:"Login:",passwordLabel:"Password:",
    remember:"Remember username",hide:"Hide username",
    help:"Can't login? Click here.",login:"Login",cancel:"Cancel",
});
export function titleLayout(width,height){
    const scale=Math.min(width/765,height/503,1);
    const x=(width-765*scale)/2,y=(height-503*scale)/2;
    return {scale,x,y,panelOffset:0,
        backgroundScale:scale,bx:x-162*scale,by:y,
        muteX:x+725*scale,muteY:y+463*scale};
}
// Native caret indexes map onto the cache font, including masked
// passwords and horizontally scrolled text. Never paint the password itself.
export function titleFieldLayout(font,value,selectionStart,selectionEnd,active,width=185){
    const advances=Array.from({length:value.length+1},(_,i)=>font.measure(value.slice(0,i)));
    const caret=selectionEnd??value.length;
    let start=0;
    while(start<caret&&advances[caret]-advances[start]>width)start++;
    let end=start;
    while(end<value.length&&advances[end+1]-advances[start]<=width)end++;
    const x=index=>advances[Math.max(start,Math.min(end,index))]-advances[start];
    return {start,end,text:value.slice(start,end),caret:x(caret),
        selection:null,
        indexAt:position=>{
            let index=start;while(index<end&&position>(advances[index]+advances[index+1])/2-advances[start])index++;
            return index;
        }};
}
export async function namedTitleFile(cache,index,name){
    const catalog=await verifiedCatalog(cache,index),group=catalog.names.get(djb2(name));
    if(group===undefined)throw new Error("Cache title asset missing: "+name);
    const ids=catalog.fileIdsForGroup.get(group);
    if(ids?.length!==1)throw new Error("Unexpected title asset archive: "+name);
    const files=unpackArchiveFiles(await decodeGroup(await cache.loadGroup(index,group)),ids,new Set(ids));
    return files.get(ids[0]);
}
function spriteCanvas(frame){
    const canvas=document.createElement("canvas");canvas.width=frame.sheetWidth;canvas.height=frame.sheetHeight;
    const ctx=canvas.getContext("2d"),data=ctx.createImageData(frame.width,frame.height);
    data.data.set(frame.rgba);ctx.putImageData(data,frame.x,frame.y);return canvas;
}
export class NativeTitleScreen{
    constructor({canvas,stage,form,status,onCancel=()=>{}}){
        this.canvas=canvas;this.stage=stage;this.form=form;this.status=status;this.onCancel=onCancel;
        this.form.noValidate=true;
        this.mode="loading";this.percent=0;this.message="Connecting to update server";this.assets={sprites:new Map()};this.visible=true;
        this.newAccount=document.getElementById("title-new-account");this.login=document.getElementById("title-login");
        this.back=document.getElementById("title-cancel");this.mute=document.getElementById("title-mute");
        this.remember=document.getElementById("title-remember");
        this.hideUsername=document.getElementById("title-hide-username");
        this.help=document.getElementById("title-login-help");
        this.worldButton=document.getElementById("title-world-switch");
        this.worldCurrent=document.getElementById("title-world-current");
        this.worldBack=document.getElementById("title-world-back");
        this.worldId=255;this.worldReturnMode="welcome";
        this.remembered=false;this.usernameHidden=false;
        this.optionHover={remember:false,hide:false,help:false};
        try{
            this.remembered=localStorage.getItem("soloscape:title:remember") === "true";
            if(this.remembered)document.getElementById("login-username").value=
                localStorage.getItem("soloscape:title:username")??"";
        }catch{}
        this.remember?.setAttribute("aria-checked",String(this.remembered));
        this.fieldLayouts=new Map();this.fieldListeners=[];
        for(const input of [document.getElementById("login-username"),document.getElementById("login-password")]){
            const collapse=()=>{const end=input.selectionEnd??input.value.length;if(input.selectionStart!==end)input.setSelectionRange(end,end);};
            const down=event=>{
                if(event.button!==0)return;
                event.preventDefault();input.focus();
                const rect=input.getBoundingClientRect();
                const caret=this.fieldLayouts.get(input)?.indexAt((event.clientX-rect.left)*192/rect.width)??input.value.length;
                input.setSelectionRange(caret,caret);this.paint();
            };
            const prevent=event=>{event.preventDefault();collapse();};
            const key=event=>{
                if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="a")event.preventDefault();
                if(event.shiftKey&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))event.preventDefault();
            };
            for(const [type,handler] of [["pointerdown",down],["selectstart",prevent],["dblclick",prevent],["select",collapse],["keydown",key]]){
                input.addEventListener(type,handler);this.fieldListeners.push([input,type,handler]);
            }
        }
        this.login.addEventListener("click",()=>this.showLogin(OSRS_TITLE_COPY.loginPrompt));
        for(const [node,key] of [[this.remember,"remember"],[this.hideUsername,"hide"],[this.help,"help"]]){
            node?.addEventListener("pointerenter",()=>{this.optionHover[key]=true;this.paint();});
            node?.addEventListener("pointerleave",()=>{this.optionHover[key]=false;this.paint();});
        }
        this.remember?.addEventListener("click",()=>{
            this.remembered=!this.remembered;
            this.remember.setAttribute("aria-checked",String(this.remembered));
            this.persistRememberedUsername();this.paint();
        });
        this.hideUsername?.addEventListener("click",()=>{
            this.usernameHidden=!this.usernameHidden;
            this.hideUsername.setAttribute("aria-checked",String(this.usernameHidden));this.paint();
        });
        this.help?.addEventListener("click",()=>{
            // The OSRS recovery page does not manage SoloScape server accounts.
            this.status.textContent="Account recovery is managed by the SoloScape server.";
            this.paint();
        });
        this.usernameInput= document.getElementById("login-username");
        this.usernameInput.addEventListener("input",this.saveUsername=()=>this.persistRememberedUsername());
        this.worldButton?.addEventListener("click",()=>this.showWorldSelect());
        this.worldCurrent?.addEventListener("click",()=>this.closeWorldSelect());
        this.worldBack?.addEventListener("click",()=>this.closeWorldSelect());
        this.back.addEventListener("click",()=>{this.onCancel();this.showWelcome();});
        this.mute.addEventListener("click",()=>{this.music?.toggle();this.mute.setAttribute("aria-pressed",String(this.music?.muted??false));});
        this.gesture=()=>void this.music?.unlock();
        document.addEventListener("pointerup",this.gesture,true);document.addEventListener("keydown",this.gesture,true);
        this.resize=()=>this.paint();window.addEventListener("resize",this.resize);
        window.visualViewport?.addEventListener("resize",this.resize);
        this.syncControls();this.frame=()=>{if(this.visible){this.paint();this.animation=requestAnimationFrame(this.frame);}};this.frame();
    }
    async start(cache){
        this.music=new NativeTitleMusic(cache,{onStatus:m=>{this.status.textContent=m;}});
        const steps=[
            ["Checking for updates - ",async()=>cache.loadMaster()],
            ["Loading title screen - ",async()=>{
                const bytes=await namedTitleFile(cache,10,"titlewide.jpg");
                this.assets.background=await createImageBitmap(new Blob([bytes],{type:"image/jpeg"}));
                if(this.assets.background.width!==545||this.assets.background.height!==671)throw new Error("Unexpected revision-240 wide title dimensions");
            }],
            ...["logo","titlebox","titlebutton","runes","title_mute","sl_button"].map(name=>["Loading sprites - ",async()=>{
                let frames;
                try{frames=decodeIndexedSprites(await namedTitleFile(cache,8,name));}
                catch(error){
                    // The OSRS option sprite is decorative: use drawn radio boxes
                    // if this optional archive is absent; never break login.
                    if(name==="sl_button")return;
                    throw error;
                }
                this.assets.sprites.set(name,frames.map(spriteCanvas));
                if(name==="runes"){
                    const runes=frames.map(f=>({subWidth:f.width,subHeight:f.height,xOffset:f.x,yOffset:f.y,
                        pixels:Uint8Array.from({length:f.width*f.height},(_,i)=>Number(f.rgba[i*4+3]>0))}));
                    this.fire=new LoginScreenAnimation(runes);
                }
            }]),
            ["Loading fonts - ",async()=>{this.assets.font=await loadCacheMenuFont(cache,OSRS_TITLE_FONT_IDS.bold12);this.assets.small=await loadCacheMenuFont(cache,OSRS_TITLE_FONT_IDS.plain11);}],
            ["Loaded title screen",async()=>this.music.prepare()],
        ];
        try{
            for(let i=0;i<steps.length;i++){
                this.message=steps[i][0]+(steps[i][0].endsWith(" - ")?`${this.percent}%`:"");
                this.paint();await steps[i][1]();this.percent=Math.round((i+1)*100/steps.length);
            }
            this.canvas.dataset.loaded="true";this.showWelcome();
        }catch(error){this.mode="error";this.message=error.message;this.status.textContent="Title cache unavailable: "+error.message;this.syncControls();}
    }
    persistRememberedUsername(){
        try{
            if(this.remembered){
                localStorage.setItem("soloscape:title:remember","true");
                localStorage.setItem("soloscape:title:username",this.usernameInput?.value??"");
            }else{
                localStorage.removeItem("soloscape:title:remember");
                localStorage.removeItem("soloscape:title:username");
            }
        }catch{} // Storage might be unavailable in private browsing.
    }
    showWorldSelect(){
        if(!["welcome","login"].includes(this.mode))return;
        this.worldReturnMode=this.mode;
        this.mode="world-select";this.syncControls();this.paint();
    }
    closeWorldSelect(){
        if(this.mode!=="world-select")return;
        this.mode=this.worldReturnMode;
        this.syncControls();this.paint();
    }
    showWelcome(){this.mode="welcome";this.visible=true;document.body.classList.remove("in-game");this.status.textContent="";this.music?.show();this.syncControls();this.restart();}
    showLogin(message=""){
        this.mode="login";this.visible=true;document.body.classList.remove("in-game");this.status.textContent=message;
        document.getElementById("login-password").value="";
        this.music?.show();this.syncControls();this.restart();document.getElementById("login-username").focus();
    }
    beginConnecting(){
        this.connectingPasswordLength=document.getElementById("login-password").value.length;
        this.mode="connecting";this.status.textContent="Connecting to server...";this.syncControls();this.paint();
    }
    enterGame(){this.visible=false;document.body.classList.add("in-game");cancelAnimationFrame(this.animation);this.music?.hide();this.syncControls();}
    validateCredentials(){
        for(const [id,label] of [["login-username","username/email"],["login-password","password"]]){
            const input=document.getElementById(id);
            if(!(id==="login-username"?input.value.trim():input.value)){
                this.status.textContent="Please enter your "+label+".";input.focus();this.paint();return false;
            }
        }
        return true;
    }
    restart(){cancelAnimationFrame(this.animation);if(this.visible)this.frame();}
    syncControls(){
        this.newAccount.hidden=this.login.hidden=this.mode!=="welcome";
        this.form.hidden=this.mode!=="login";this.back.hidden=this.mode!=="login";
        this.mute.hidden=["loading","error"].includes(this.mode)||!this.visible;
        if(this.worldButton)this.worldButton.hidden=!this.visible||!["welcome","login"].includes(this.mode);
        if(this.worldCurrent)this.worldCurrent.hidden=this.mode!=="world-select";
        if(this.worldBack)this.worldBack.hidden=this.mode!=="world-select";
        this.canvas.parentElement.hidden=!this.visible;
    }
    text(ctx,text,x,y,color="#ffffff",small=false){
        const font=small?this.assets.small:this.assets.font;
        if(font){font.draw(ctx,text,x-Math.floor(font.measure(text)/2),y,color,true);}
        else{ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillStyle=color;ctx.fillText(text,x,y);}
    }
    button(ctx,x,y,label){const sprite=this.assets.sprites.get("titlebutton")?.[0];if(sprite)ctx.drawImage(sprite,Math.floor(x-sprite.width/2),Math.floor(y-sprite.height/2));this.text(ctx,label,x,y+5);}
    option(ctx,{x,label,checked,hovered=false}){
        const font=this.assets.small??this.assets.font;if(!font)return;
        // OpenOSRS login reference displays dark circular toggles with a green
        // tick when checked. The cache option sprite in this build is square.
        ctx.beginPath();ctx.fillStyle=hovered?"#50351b":"#2d1d11";
        ctx.arc(x+6,284,6,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#0b0604";ctx.lineWidth=1.2;ctx.stroke();
        if(checked){
            ctx.beginPath();ctx.moveTo(x+2,284);ctx.lineTo(x+5,287);
            ctx.lineTo(x+10,280);ctx.strokeStyle="#36ce74";ctx.lineWidth=2;
            ctx.stroke();
        }
        font.draw(ctx,label,x+17,290,"#ffff00",true);
    }
    paint(){
        if(!this.visible)return;
        const bounds=this.canvas.parentElement.getBoundingClientRect();
        const ctx=this.canvas.getContext("2d");
        // Rasterize once in native client pixels. Device density and small
        // viewports scale only the finished image, never individual glyphs.
        if(this.canvas.width!==765||this.canvas.height!==503){this.canvas.width=765;this.canvas.height=503;}
        ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#000000";ctx.fillRect(0,0,765,503);ctx.imageSmoothingEnabled=false;
        const l=titleLayout(765,503),controls=titleLayout(bounds.width,bounds.height),{background}=this.assets;
        if(background){
            ctx.save();ctx.translate(l.bx,l.by);ctx.scale(l.backgroundScale,l.backgroundScale);
            ctx.drawImage(background,0,0);ctx.translate(1089,0);ctx.scale(-1,1);ctx.drawImage(background,0,0);ctx.restore();
        }
        if(this.fire&&this.mode!=="loading"){
            const fire=this.fire.updateAndGetCanvas(0);
            if(fire){
                const fw=128*l.backgroundScale,fh=264*l.backgroundScale;
                ctx.drawImage(fire,l.bx+140*l.backgroundScale,l.by,fw,fh);
                ctx.drawImage(fire,l.bx+821*l.backgroundScale,l.by,fw,fh);
            }
        }
        this.stage.style.transform=`translate(${controls.x}px,${controls.y+controls.panelOffset*controls.scale}px) scale(${controls.scale})`;
        ctx.save();ctx.translate(l.x,l.y);ctx.scale(l.scale,l.scale);
        const logo=this.assets.sprites.get("logo")?.[0];if(logo)ctx.drawImage(logo,382-Math.floor(logo.width/2),18);
        if(this.mode==="loading"||this.mode==="error"){
            this.text(ctx,this.mode==="error"?"Unable to load title screen":OSRS_TITLE_COPY.loading,382,237);
            ctx.strokeStyle="#8c1111";ctx.strokeRect(230.5,245.5,303,33);ctx.strokeStyle="#000000";ctx.strokeRect(231.5,246.5,301,31);
            ctx.fillStyle="#000000";ctx.fillRect(232,247,300,30);ctx.fillStyle="#8c1111";ctx.fillRect(232,247,this.percent*3,30);
            this.text(ctx,this.mode==="error"?"Check your connection and reload":this.message,382,268);
        }else{
            ctx.translate(0,l.panelOffset);
            const box=this.assets.sprites.get("titlebox")?.[0];if(box)ctx.drawImage(box,202,170);
            if(this.mode==="welcome"){
                this.text(ctx,OSRS_TITLE_COPY.welcome,382,251,"#ffff00");this.button(ctx,302,291,OSRS_TITLE_COPY.newUser);this.button(ctx,462,291,OSRS_TITLE_COPY.existingUser);
            }else if(this.mode==="world-select"){
                this.text(ctx,"Select a world",382,219,"#ffff00");
                this.text(ctx,`World ${this.worldId}`,382,267,"#ffffff");
                this.text(ctx,"Current world - only world configured",382,286,"#ffff00",true);
                this.button(ctx,382,321,"Back");
            }else if(this.mode==="login"||this.mode==="connecting"){
                // Reflect actual cache/authentication/map stages instead of always claiming
                // the TCP handshake is still in progress after it has succeeded.
                const message=this.status.textContent||"Connecting to server...";
                const words=message.split(" "),rows=[];let line="";
                for(const word of words){const next=line?line+" "+word:word;if(line&&(this.assets.font?.measure(next)??next.length*7)>320){rows.push(line);line=word;}else line=next;}if(line)rows.push(line);
                rows.slice(0,3).forEach((row,i)=>this.text(ctx,row,382,214+i*15,"#ffff00"));
                const font=this.assets.font,fields=[[OSRS_TITLE_COPY.loginLabel,"login-username",253,false],[OSRS_TITLE_COPY.passwordLabel,"login-password",268,true]];
                for(const [label,id,y,masked] of fields){
                    const input=document.getElementById(id),value=masked||this.usernameHidden?"*".repeat(masked&&this.mode==="connecting"?this.connectingPasswordLength:input.value.length):input.value;
                    const active=this.mode==="login"&&document.activeElement===input,field=titleFieldLayout(font,value,input.selectionStart,input.selectionEnd,active);
                    this.fieldLayouts.set(input,field);
                    const x=272+font.measure(label);
                    input.style.left=x+"px";
                    font.draw(ctx,label,272,y,"#ffffff",true);
                    font.draw(ctx,field.text,x,y,"#ffffff",true);
                    if(active&&Math.floor(performance.now()/500)%2===0)font.draw(ctx,"|",x+field.caret,y,"#ffffff",true);
                }
                if(this.mode==="login"){
                    this.option(ctx,{x:267,label:OSRS_TITLE_COPY.remember,checked:this.remembered,hovered:this.optionHover.remember});
                    this.option(ctx,{x:408,label:OSRS_TITLE_COPY.hide,checked:this.usernameHidden,hovered:this.optionHover.hide});
                    this.button(ctx,302,321,OSRS_TITLE_COPY.login);
                    this.button(ctx,462,321,OSRS_TITLE_COPY.cancel);
                    this.text(ctx,OSRS_TITLE_COPY.help,382,357,this.optionHover.help?"#ffff00":"#ffffff",true);
                }
            }
        }
        ctx.restore();
        if(this.worldButton&&!this.worldButton.hidden){
            // Rev-240 world-select button at the fixed bottom-left. This is
            // outside the titlebox transform, like the original client.
            const sprite=this.assets.sprites.get("sl_button")?.[0];
            if(sprite)ctx.drawImage(sprite,5,463);
            else{
                ctx.fillStyle="#3b2b20";ctx.fillRect(5,463,100,35);
                ctx.strokeStyle="#000000";ctx.strokeRect(5.5,463.5,99,34);
            }
            const font=this.assets.font,small=this.assets.small??font;
            if(font){
                const name=`World ${this.worldId}`;
                font.draw(ctx,name,55-Math.floor(font.measure(name)/2),477,"#ffffff",true);
            }
            if(small){
                const prompt="Click to switch";
                small.draw(ctx,prompt,55-Math.floor(small.measure(prompt)/2),491,"#ffffff",true);
            }
        }
        if(!this.mute.hidden){
            this.mute.style.left=controls.muteX+"px";this.mute.style.top=controls.muteY+"px";
            this.mute.style.width=this.mute.style.height=36*controls.scale+"px";
            const sprite=this.assets.sprites.get("title_mute")?.[this.music?.muted?1:0];if(sprite)ctx.drawImage(sprite,l.muteX,l.muteY);
        }
    }
    dispose(){this.usernameInput?.removeEventListener("input",this.saveUsername);cancelAnimationFrame(this.animation);for(const [input,type,handler] of this.fieldListeners)input.removeEventListener(type,handler);window.removeEventListener("resize",this.resize);window.visualViewport?.removeEventListener("resize",this.resize);document.removeEventListener("pointerup",this.gesture,true);document.removeEventListener("keydown",this.gesture,true);this.fire?.destroy();this.music?.dispose();this.assets.background?.close();}
}
