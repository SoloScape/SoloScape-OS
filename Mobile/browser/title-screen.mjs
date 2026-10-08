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
    const scale=Math.min(width/765,height/503,1);
    const x=(width-765*scale)/2,y=(height-503*scale)/2;
    return {scale,x:x+.5*scale,y,panelOffset:-18.5,
        backgroundScale:scale,bx:x-162*scale,by:y,
        muteX:x+725*scale,muteY:y+463*scale};
}
// Native input selection indexes map onto the cache font, including masked
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
        selection:active&&selectionStart!==selectionEnd?[x(selectionStart),x(selectionEnd)]:null,
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
        this.mode="loading";this.percent=0;this.message="Connecting to update server";this.assets={sprites:new Map()};this.visible=true;
        this.newAccount=document.getElementById("title-new-account");this.login=document.getElementById("title-login");
        this.back=document.getElementById("title-cancel");this.mute=document.getElementById("title-mute");
        this.fieldLayouts=new Map();this.fieldListeners=[];
        for(const input of [document.getElementById("login-username"),document.getElementById("login-password")]){
            let anchor=null;
            const indexAt=event=>{
                const rect=input.getBoundingClientRect();
                return this.fieldLayouts.get(input)?.indexAt((event.clientX-rect.left)*192/rect.width)??0;
            };
            const down=event=>{
                if(event.pointerType==="touch"||event.button!==0)return;
                event.preventDefault();input.focus();anchor=event.shiftKey?(input.selectionStart??0):indexAt(event);
                const end=indexAt(event);input.setSelectionRange(Math.min(anchor,end),Math.max(anchor,end),end<anchor?"backward":"forward");
                input.setPointerCapture(event.pointerId);this.paint();
            };
            const move=event=>{
                if(anchor===null)return;const end=indexAt(event);
                input.setSelectionRange(Math.min(anchor,end),Math.max(anchor,end),end<anchor?"backward":"forward");this.paint();
            };
            const up=()=>{anchor=null;};
            const double=event=>{
                const index=indexAt(event),value=input.value;let start=index,end=index;
                while(start>0&&!/\s/.test(value[start-1]))start--;
                while(end<value.length&&!/\s/.test(value[end]))end++;
                input.setSelectionRange(start,end);this.paint();
            };
            for(const [type,handler] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["lostpointercapture",up],["dblclick",double]]){
                input.addEventListener(type,handler);this.fieldListeners.push([input,type,handler]);
            }
        }
        this.login.addEventListener("click",()=>this.showLogin("Enter your username/email & password."));
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
                const bytes=await namedTitleFile(cache,10,"titlewide.jpg");
                this.assets.background=await createImageBitmap(new Blob([bytes],{type:"image/jpeg"}));
                if(this.assets.background.width!==545||this.assets.background.height!==671)throw new Error("Unexpected revision-240 wide title dimensions");
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
    showLogin(message=""){
        this.mode="login";this.visible=true;document.body.classList.remove("in-game");this.status.textContent=message;
        document.getElementById("login-password").value="";
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
        const bounds=this.canvas.parentElement.getBoundingClientRect();
        const width=bounds.width,height=bounds.height,ratio=Math.min(3,window.devicePixelRatio||1),ctx=this.canvas.getContext("2d");
        if(this.canvas.width!==Math.round(width*ratio)||this.canvas.height!==Math.round(height*ratio)){this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);}
        this.canvas.style.height=height+"px";ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle="#000000";ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        const l=titleLayout(width,height),{background}=this.assets;
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
        this.stage.style.transform=`translate(${l.x}px,${l.y+l.panelOffset*l.scale}px) scale(${l.scale})`;
        ctx.save();ctx.translate(l.x,l.y);ctx.scale(l.scale,l.scale);
        const logo=this.assets.sprites.get("logo")?.[0];if(logo)ctx.drawImage(logo,382-Math.floor(logo.width/2),18);
        if(this.mode==="loading"||this.mode==="error"){
            this.text(ctx,this.mode==="error"?"Unable to load title screen":"RuneScape is loading - please wait...",382,237);
            ctx.strokeStyle="#8c1111";ctx.strokeRect(230.5,245.5,303,33);ctx.strokeStyle="#000000";ctx.strokeRect(231.5,246.5,301,31);
            ctx.fillStyle="#000000";ctx.fillRect(232,247,300,30);ctx.fillStyle="#8c1111";ctx.fillRect(232,247,this.percent*3,30);
            this.text(ctx,this.mode==="error"?"Check your connection and reload":this.message,382,268);
        }else{
            ctx.translate(0,l.panelOffset);
            const box=this.assets.sprites.get("titlebox")?.[0];if(box)ctx.drawImage(box,202,170);
            if(this.mode==="welcome"){
                this.text(ctx,"Welcome to RuneScape",382,251,"#ffff00");this.button(ctx,302,291,"New User");this.button(ctx,462,291,"Existing User");
            }else if(this.mode==="login"){
                const message=this.status.textContent;
                const words=message.split(" "),rows=[];let line="";
                for(const word of words){const next=line?line+" "+word:word;if(line&&(this.assets.font?.measure(next)??next.length*7)>320){rows.push(line);line=word;}else line=next;}if(line)rows.push(line);
                rows.slice(0,3).forEach((row,i)=>this.text(ctx,row,382,211+i*15,"#ffff00"));
                const font=this.assets.small,fields=[["Login:","login-username",253,false],["Password:","login-password",268,true]];
                for(const [label,id,y,masked] of fields){
                    const input=document.getElementById(id),value=masked?"*".repeat(input.value.length):input.value;
                    const active=document.activeElement===input,field=titleFieldLayout(font,value,input.selectionStart,input.selectionEnd,active);
                    this.fieldLayouts.set(input,field);
                    const x=274+font.measure(label);
                    input.style.left=x+"px";
                    font.draw(ctx,label,274,y,"#ffffff",true);
                    if(field.selection){ctx.fillStyle="#316ac5";ctx.fillRect(x+field.selection[0],y-12,field.selection[1]-field.selection[0],15);}
                    font.draw(ctx,field.text,x,y,"#ffffff",true);
                    if(active&&!field.selection&&Math.floor(performance.now()/500)%2===0)font.draw(ctx,"|",x+field.caret,y,"#ffffff",true);
                }
                this.button(ctx,302,321,document.getElementById("login-submit").disabled?"Please wait...":"Login");this.button(ctx,462,321,"Cancel");
            }
        }
        ctx.restore();
        if(!this.mute.hidden){
            const mx=l.muteX,my=l.muteY;
            this.mute.style.left=mx+"px";this.mute.style.top=my+"px";
            this.mute.style.width=this.mute.style.height=36*l.scale+"px";
            const sprite=this.assets.sprites.get("title_mute")?.[this.music?.muted?1:0];if(sprite)ctx.drawImage(sprite,mx,my,36*l.scale,36*l.scale);
        }
    }
    dispose(){cancelAnimationFrame(this.animation);for(const [input,type,handler] of this.fieldListeners)input.removeEventListener(type,handler);window.removeEventListener("resize",this.resize);window.visualViewport?.removeEventListener("resize",this.resize);document.removeEventListener("pointerup",this.gesture,true);document.removeEventListener("keydown",this.gesture,true);this.fire?.destroy();this.music?.dispose();this.assets.background?.close();}
}
