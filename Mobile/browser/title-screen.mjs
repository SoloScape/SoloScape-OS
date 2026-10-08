// Classic title coordinates and loading bar follow TSPS's login renderer.
// Every image/font is fetched by name from SoloScape's verified 240 cache.
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeIndexedSprites} from "./sprite-preview.mjs";
import {loadCacheMenuFont} from "./native-menu.mjs";
import {djb2} from "./terrain-world.mjs";
import {LoginScreenAnimation} from "./title-fire.mjs";
import {NativeTitleMusic} from "./title-music.mjs";

export function titleLayout(width,height){
    const scale=Math.min(width/(width<600?400:765),height/503,1.5);
    const backgroundScale=Math.max(width/765,height/503);
    return {scale,x:width/2-382*scale,y:(height-503*scale)/2,
        backgroundScale,bx:(width-765*backgroundScale)/2,by:(height-503*backgroundScale)/2};
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
        this.mode="loading";this.percent=0;this.message="Connecting to update server";this.assets={sprites:new Map()};this.visible=true;
        this.newAccount=document.getElementById("title-new-account");this.login=document.getElementById("title-login");
        this.back=document.getElementById("title-cancel");this.mute=document.getElementById("title-mute");
        this.newAccount.addEventListener("click",()=>this.showLogin("Choose a new username and password. Your account is created on first login.",true));
        this.login.addEventListener("click",()=>this.showLogin("Enter your username and password."));
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
            ["Checking cache manifest",async()=>cache.loadMaster()],
            ["Loading title background",async()=>{
                const bytes=await namedTitleFile(cache,10,"title.jpg");
                this.assets.background=await createImageBitmap(new Blob([bytes],{type:"image/jpeg"}));
                if(this.assets.background.width!==383||this.assets.background.height!==503)throw new Error("Unexpected revision-240 title dimensions");
            }],
            ...["logo","titlebox","titlebutton","runes","title_mute"].map(name=>["Loading "+name.replaceAll("_"," "),async()=>{
                const frames=decodeIndexedSprites(await namedTitleFile(cache,8,name));
                this.assets.sprites.set(name,frames.map(spriteCanvas));
                if(name==="runes"){
                    const runes=frames.map(f=>({subWidth:f.width,subHeight:f.height,xOffset:f.x,yOffset:f.y,
                        pixels:Uint8Array.from({length:f.width*f.height},(_,i)=>Number(f.rgba[i*4+3]>0))}));
                    this.fire=new LoginScreenAnimation(runes);
                }
            }]),
            ["Loading fonts",async()=>{this.assets.font=await loadCacheMenuFont(cache,496);this.assets.small=await loadCacheMenuFont(cache,495);}],
            ["Loading Scape Main",async()=>this.music.prepare()],
        ];
        try{
            for(let i=0;i<steps.length;i++){this.message=steps[i][0];this.paint();await steps[i][1]();this.percent=Math.round((i+1)*100/steps.length);}
            this.canvas.dataset.loaded="true";this.showWelcome();
        }catch(error){this.mode="error";this.message=error.message;this.status.textContent="Title cache unavailable: "+error.message;this.syncControls();}
    }
    showWelcome(){this.mode="welcome";this.visible=true;document.body.classList.remove("in-game");this.status.textContent="";this.music?.show();this.syncControls();this.restart();}
    showLogin(message="",newAccount=false){
        this.mode="login";this.visible=true;document.body.classList.remove("in-game");this.status.textContent=message;
        document.getElementById("login-password").value="";document.getElementById("login-otp").value="";
        document.getElementById("login-password").autocomplete=newAccount?"new-password":"current-password";
        this.music?.show();this.syncControls();this.restart();document.getElementById("login-username").focus();
    }
    enterGame(){this.visible=false;document.body.classList.add("in-game");cancelAnimationFrame(this.animation);this.music?.hide();this.syncControls();}
    restart(){cancelAnimationFrame(this.animation);if(this.visible)this.frame();}
    syncControls(){
        this.newAccount.hidden=this.login.hidden=this.mode!=="welcome";
        this.form.hidden=this.mode!=="login";this.back.hidden=this.mode!=="login";
        this.mute.hidden=["loading","error"].includes(this.mode)||!this.visible;
        this.canvas.parentElement.hidden=!this.visible;
    }
    text(ctx,text,x,y,color="#ffffff",small=false){
        const font=small?this.assets.small:this.assets.font;
        if(font){font.draw(ctx,text,x-font.measure(text)/2+1,y+1,"#000000");font.draw(ctx,text,x-font.measure(text)/2,y,color);}
        else{ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillStyle=color;ctx.fillText(text,x,y);}
    }
    button(ctx,x,y,label){const sprite=this.assets.sprites.get("titlebutton")?.[0];if(sprite)ctx.drawImage(sprite,Math.floor(x-sprite.width/2),Math.floor(y-sprite.height/2));this.text(ctx,label,x,y+5);}
    paint(){
        if(!this.visible)return;
        const width=window.innerWidth,height=window.visualViewport?.height??window.innerHeight,ratio=Math.min(3,window.devicePixelRatio||1),ctx=this.canvas.getContext("2d");
        if(this.canvas.width!==Math.round(width*ratio)||this.canvas.height!==Math.round(height*ratio)){this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);}
        this.canvas.style.height=height+"px";ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle="#000000";ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        const l=titleLayout(width,height),{background}=this.assets;
        if(background){
            ctx.save();ctx.translate(l.bx,l.by);ctx.scale(l.backgroundScale,l.backgroundScale);
            ctx.drawImage(background,0,0);ctx.translate(765,0);ctx.scale(-1,1);ctx.drawImage(background,0,0);ctx.restore();
        }
        if(this.fire&&this.mode!=="loading"){
            const fire=this.fire.updateAndGetCanvas(0);
            if(fire){
                const fw=128*l.scale,fh=264*l.scale;
                ctx.drawImage(fire,Math.max(0,l.x-22*l.scale),Math.max(0,l.y),fw,fh);
                ctx.drawImage(fire,Math.min(width-fw,l.x+659*l.scale),Math.max(0,l.y),fw,fh);
            }
        }
        this.stage.style.transform=`translate(${l.x}px,${l.y}px) scale(${l.scale})`;
        ctx.save();ctx.translate(l.x,l.y);ctx.scale(l.scale,l.scale);
        const logo=this.assets.sprites.get("logo")?.[0];if(logo)ctx.drawImage(logo,382-Math.floor(logo.width/2),18);
        if(this.mode==="loading"||this.mode==="error"){
            this.text(ctx,this.mode==="error"?"Unable to load title screen":"RuneScape is loading - please wait...",382,237);
            ctx.strokeStyle="#8c1111";ctx.strokeRect(230.5,245.5,303,33);ctx.strokeStyle="#000000";ctx.strokeRect(231.5,246.5,301,31);
            ctx.fillStyle="#000000";ctx.fillRect(232,247,300,30);ctx.fillStyle="#8c1111";ctx.fillRect(232,247,this.percent*3,30);
            this.text(ctx,this.mode==="error"?"Check your connection and reload":this.message,382,268);
        }else{
            const box=this.assets.sprites.get("titlebox")?.[0];if(box)ctx.drawImage(box,202,170);
            if(this.mode==="welcome"){
                this.text(ctx,"Welcome to SoloScape",382,251,"#ffff00");this.button(ctx,302,291,"New account");this.button(ctx,462,291,"Login");
            }else if(this.mode==="login"){
                const message=this.status.textContent;
                const words=message.split(" "),rows=[];let line="";
                for(const word of words){const next=line?line+" "+word:word;if(line&&(this.assets.font?.measure(next)??next.length*7)>320){rows.push(line);line=word;}else line=next;}if(line)rows.push(line);
                rows.slice(0,3).forEach((row,i)=>this.text(ctx,row,382,200+i*15,"#ffff00"));
                const font=this.assets.font,fields=[["Username:","login-username",251,false],["Password:","login-password",271,true],["Code:","login-otp",291,false]];
                for(const [label,id,y,masked] of fields){
                    const input=document.getElementById(id),value=masked?"*".repeat(input.value.length):input.value;
                    let display=value;while(display.length&&font.measure(display)>185)display=display.slice(1);
                    font.draw(ctx,label,274,y,"#ffffff");font.draw(ctx,display+(document.activeElement===input&&Math.floor(performance.now()/500)%2===0?"|":""),346,y,"#ffffff");
                }
                this.button(ctx,302,326,document.getElementById("login-submit").disabled?"Please wait...":"Login");this.button(ctx,462,326,"Cancel");
            }
        }
        ctx.restore();
        if(!this.mute.hidden){const sprite=this.assets.sprites.get("title_mute")?.[this.music?.muted?1:0];if(sprite)ctx.drawImage(sprite,width-46,height-46);}
    }
    dispose(){cancelAnimationFrame(this.animation);window.removeEventListener("resize",this.resize);window.visualViewport?.removeEventListener("resize",this.resize);document.removeEventListener("pointerup",this.gesture,true);document.removeEventListener("keydown",this.gesture,true);this.fire?.destroy();this.music?.dispose();this.assets.background?.close();}
}
