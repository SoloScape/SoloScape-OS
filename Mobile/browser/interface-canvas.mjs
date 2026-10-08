/*
BSD 2-Clause License

Copyright (c) 2022-2026, dennisdev, xrsps
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
THE POSSIBILITY OF SUCH DAMAGE.
*/
// Native IF1/IF3 cache widget canvas renderer. Layout follows the
// pinned TSPS widgets/layout/WidgetLayout.ts. Never executes CS1/CS2 or invents
// missing sprites, player/item models, animation or server state.
import {NativeInterfaces} from "./native-interfaces.mjs";
import {loadCacheMenuFont} from "./native-menu.mjs";
import {decodeGroup,verifiedCatalog} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {decodeIndexedSprites} from "./sprite-preview.mjs";

const rgb=n=>"#"+(n&0xffffff).toString(16).padStart(6,"0");
const safe=(n,max)=>Math.max(-max,Math.min(max,n));
export function widgetLayout(widget,parentWidth,parentHeight){
    const w=widget.rawWidth|0,h=widget.rawHeight|0,wm=widget.widthMode|0,hm=widget.heightMode|0;
    let width=wm===1?parentWidth-w:wm===2?(w*parentWidth>>14):w;
    let height=hm===1?parentHeight-h:hm===2?(h*parentHeight>>14):h;
    if(wm===4)width=Math.floor(Math.max(1,w)*Math.max(1,height)/Math.max(1,h));
    if(hm===4)height=Math.floor(Math.max(1,h)*Math.max(1,width)/Math.max(1,w));
    if(widget.type===2&&!widget.isIf3){width=w*32;height=h*32;}
    const x=widget.legacyX??widget.rawX??0,y=widget.legacyY??widget.rawY??0,
        xm=widget.xPositionMode|0,ym=widget.yPositionMode|0;
    const align=(raw,mode,parent,length)=>{
        if(mode===1)return ((parent-length)>>1)+raw;
        if(mode===2)return parent-length-raw;
        if(mode===3)return raw*parent>>14;
        if(mode===4)return ((parent-length)>>1)+(raw*parent>>14);
        if(mode===5)return parent-length-(raw*parent>>14);
        return raw;
    };
    return {x:align(x,xm,parentWidth,width),y:align(y,ym,parentHeight,height),width,height};
}
export function flattenInterface(group,width,height,{limit=2048}={}){
    if(!group?.roots?.length)throw new Error("Verified interface has no root widgets");
    const nodes=[],seen=new Set(),skipped=[];
    function visit(widget,px,py,pw,ph,clip,depth){
        if(depth>64||nodes.length>limit)throw new Error("Interface tree exceeds safety limits");
        if(seen.has(widget.uid))return;
        seen.add(widget.uid);
        if(widget.hidden)return;
        const layout=widgetLayout(widget,pw,ph),x=px+layout.x,y=py+layout.y;
        const w=layout.width,h=layout.height;
        if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||!Number.isFinite(h))throw new Error("Unsafe widget layout");
        if(Math.abs(x)>1e6||Math.abs(y)>1e6||Math.abs(w)>4096||Math.abs(h)>4096)throw new Error("Widget layout outside bounds");
        const widgetClip={x:Math.max(clip.x,x),y:Math.max(clip.y,y),
            r:Math.min(clip.r,x+Math.max(0,w)),b:Math.min(clip.b,y+Math.max(0,h))};
        if(widgetClip.r<=widgetClip.x||widgetClip.b<=widgetClip.y)return;
        nodes.push({widget,x,y,width:w,height:h,clip:widgetClip});
        if(![0,3,4,5,9].includes(widget.type))skipped.push({uid:widget.uid,type:widget.type});
        const childX=x-Math.max(0,Math.min(widget.scrollX??0,Math.max(0,(widget.scrollWidth||w)-w))),
            childY=y-Math.max(0,Math.min(widget.scrollY??0,Math.max(0,(widget.scrollHeight||h)-h))),
            childW=widget.scrollWidth||w,childH=widget.scrollHeight||h;
        for(const child of group.children.get(widget.uid)??[])visit(child,childX,childY,childW,childH,widgetClip,depth+1);
    }
    const clip={x:0,y:0,r:width,b:height};
    for(const root of group.roots)visit(root,0,0,width,height,clip,0);
    return {nodes,skipped};
}
export class NativeInterfaceAssets{
    constructor(cache){this.cache=cache;this.fonts=new Map();this.sprites=new Map();}
    async font(id){
        if(id<0)return null;
        if(!this.fonts.has(id)){
            const result=loadCacheMenuFont(this.cache,id);
            const record={promise:result,value:null};this.fonts.set(id,record);
            result.then(font=>{record.value=font;},()=>this.fonts.delete(id));
        }
        return this.fonts.get(id).promise;
    }
    async sprite(id){
        if(!Number.isInteger(id)||id<0)return null;
        if(!this.sprites.has(id)){
            if(this.sprites.size>=256)this.sprites.delete(this.sprites.keys().next().value);
            const result=this.loadSprite(id);
            const record={promise:result,value:null};this.sprites.set(id,record);
            result.then(frame=>{record.value=frame;},()=>this.sprites.delete(id));
        }
        return this.sprites.get(id).promise;
    }
    async loadSprite(id){
        const table=await verifiedCatalog(this.cache,8);
        const packedGroup=(id>>>16)&65535,packedFile=id&65535;
        const candidates=packedGroup?[{group:packedGroup,file:packedFile},{group:id,file:0}]:[{group:id,file:0}];
        let found=null;
        for(const item of candidates){
            const files=table.fileIdsForGroup.get(item.group);
            if(files?.includes(item.file)){found={...item,files};break;}
        }
        if(!found)throw new Error("Cache sprite "+id+" missing from index 8");
        const group=await this.cache.loadGroup(8,found.group),bytes=await decodeGroup(group);
        const sprite=unpackArchiveFiles(bytes,found.files,new Set([found.file])).get(found.file);
        if(!sprite)throw new Error("Missing verified sprite "+id);
        const frames=decodeIndexedSprites(sprite);
        if(!frames.length)throw new Error("Sprite frame missing");
        return frames[0];
    }
}
function frameCanvas(frame){
    const canvas=document.createElement("canvas");canvas.width=frame.sheetWidth;canvas.height=frame.sheetHeight;
    const context=canvas.getContext("2d");
    if(!context)throw new Error("2D cached sprite context unavailable");
    const data=context.createImageData(frame.width,frame.height);data.data.set(frame.rgba);
    context.putImageData(data,frame.x,frame.y);
    return canvas;
}
function drawWidget(ctx,node,assets){
    const {widget:w,x,y,width,height}=node;
    if(w.type===3){
        ctx.globalAlpha=1-Math.min(255,Math.max(0,w.opacity|0))/256;
        ctx.fillStyle=rgb(w.color);ctx.strokeStyle=rgb(w.color);
        if(w.filled)ctx.fillRect(x,y,width,height);
        else ctx.strokeRect(x+.5,y+.5,Math.max(0,width-1),Math.max(0,height-1));
    }else if(w.type===9){
        ctx.strokeStyle=rgb(w.color);ctx.lineWidth=Math.max(1,w.lineWidth??1);
        ctx.beginPath();if(w.lineDirection){ctx.moveTo(x,y+height);ctx.lineTo(x+width,y);}
        else{ctx.moveTo(x,y);ctx.lineTo(x+width,y+height);}ctx.stroke();
    }else if(w.type===4){
        const font=assets.fonts.get(w.fontId)?.value;
        if(!font)return;
        const text=String(w.text??"").replace(/<br\s*\/?>/gi,"\n");
        const rows=text.split("\n").slice(0,128),step=Math.max(1,w.lineHeight||font.ascent||12);
        const ascent=Math.max(1,font.ascent||12);
        for(let i=0;i<rows.length;i++){
            const line=rows[i].replace(/<[^>]*>/g,"");
            const measured=font.measure(line);
            let tx=x+2;
            if(w.xTextAlignment===1)tx=x+(width-measured)/2;
            else if(w.xTextAlignment===2)tx=x+width-measured;
            let ty=y+ascent+i*step;
            if(w.yTextAlignment===1)ty=y+(height-rows.length*step)/2+ascent+i*step;
            else if(w.yTextAlignment===2)ty=y+height-rows.length*step+ascent+i*step;
            if(ty-ascent>y+height)break;
            if(w.textShadowed)font.draw(ctx,line,tx+1,ty+1,"#000000");
            font.draw(ctx,line,tx,ty,rgb(w.color));
        }
    }else if(w.type===5){
        const frame=assets.sprites.get(w.spriteId)?.value;
        if(!frame)return;
        const image=assets.spriteCanvases.get(w.spriteId);if(!image)return;
        ctx.globalAlpha=1-Math.min(255,Math.max(0,w.opacity|0))/256;
        ctx.translate(x+width/2,y+height/2);
        if(w.spriteAngle)ctx.rotate(w.spriteAngle*Math.PI/1024);
        ctx.scale(w.flippedH?-1:1,w.flippedV?-1:1);
        if(w.spriteTiling){
            const tw=frame.sheetWidth,th=frame.sheetHeight;
            if(width*height/Math.max(1,tw*th)>2048)throw new Error("Widget sprite tiling budget exceeded");
            for(let sy=-height/2;sy<height/2;sy+=th)
                for(let sx=-width/2;sx<width/2;sx+=tw)ctx.drawImage(image,sx,sy);
        }else ctx.drawImage(image,-width/2,-height/2,width,height);
    }
}
export class NativeInterfaceCanvas{
    constructor(canvas,cache){
        this.canvas=canvas;this.cache=cache;this.interfaces=new NativeInterfaces(cache);
        this.assets=new NativeInterfaceAssets(cache);this.assets.spriteCanvases=new Map();
        this.generation=0;this.active=null;
    }
    async show(groupId){
        const token=++this.generation;
        const group=await this.interfaces.load(groupId);
        if(token!==this.generation)return null;
        return this.showGroup(group);
    }
    async showGroup(group){
        const token=++this.generation,groupId=group.groupId;
        const bounds=this.bounds(),layout=flattenInterface(group,bounds.width,bounds.height);
        const fonts=[...new Set(layout.nodes.filter(n=>n.widget.type===4&&n.widget.fontId>=0).map(n=>n.widget.fontId))];
        const sprites=[...new Set(layout.nodes.filter(n=>n.widget.type===5&&n.widget.spriteId>=0).map(n=>n.widget.spriteId))];
        if(fonts.length>32||sprites.length>128)throw new Error("Interface exceeds bounded asset budget");
        const unavailable=[];
        await Promise.all([...fonts.map(async id=>{
            try{await this.assets.font(id);}catch(error){unavailable.push({kind:"font",id,reason:error.message});}
        }),...sprites.map(async id=>{
            try{const frame=await this.assets.sprite(id);
                if(token===this.generation)this.assets.spriteCanvases.set(id,frameCanvas(frame));
            }catch(error){unavailable.push({kind:"sprite",id,reason:error.message});}
        })]);
        if(token!==this.generation)return null;
        this.active={group,layout,unavailable};this.canvas.hidden=false;this.paint();
        return {groupId,components:group.widgets.size,rendered:layout.nodes.length,
            unsupported:layout.skipped.length,missingAssets:unavailable.length};
    }
    bounds(){
        const parent=this.canvas.parentElement;
        return {width:Math.max(1,parent?.clientWidth||this.canvas.clientWidth||1),
            height:Math.max(1,parent?.clientHeight||this.canvas.clientHeight||1)};
    }
    paint(){
        if(!this.active)return;
        const {width,height}=this.bounds(),ctx=this.canvas.getContext("2d");
        if(!ctx)throw new Error("Interface requires canvas 2D");
        const ratio=Math.min(3,window.devicePixelRatio||1);
        const w=Math.round(width*ratio),h=Math.round(height*ratio);
        if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
        ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
        const layout=flattenInterface(this.active.group,width,height);
        this.active.layout=layout;
        for(const node of layout.nodes){
            ctx.save();ctx.beginPath();ctx.rect(node.clip.x,node.clip.y,node.clip.r-node.clip.x,node.clip.b-node.clip.y);
            ctx.clip();drawWidget(ctx,node,this.assets);ctx.restore();
        }
    }
    close(){++this.generation;this.active=null;this.canvas.hidden=true;}
}
