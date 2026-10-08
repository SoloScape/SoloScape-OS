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

// Native OSRS "Choose Option" drawing and b12_full bitmap font logic are
// adapted from pinned TSPS widgets/gl/choose-option.ts and rs/font/BitmapFont.ts.
// Loads original revision-240 cache bytes, not browser fonts or replacement art.
import {decodeGroup,verifiedCatalog} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
// TSPS SpriteLoader accepts 0x0 font glyphs (spaces); the regular sprite
// preview decoder intentionally rejects them, so font glyphs require a strict
// specialised path. Palette indices are only used as font opacity masks.
export function decodeMenuFontSprites(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<2058||bytes.length>4*1024*1024)
        throw new Error("Invalid OSRS menu font sprites");
    const count=bytes.at(-2)*256+bytes.at(-1);
    if(count!==256)throw new Error("Expected 256 native font glyphs");
    const meta=bytes.length-7-count*8;
    if(meta<0)throw new Error("Invalid font glyph offsets");
    const short=i=>{if(i<0||i+2>bytes.length)throw new Error("Truncated font sprite");return bytes[i]*256+bytes[i+1];};
    const sheetWidth=short(meta),sheetHeight=short(meta+2),colors=bytes[meta+4]+1;
    if(!sheetWidth||!sheetHeight||sheetWidth>2048||sheetHeight>2048||colors<1)
        throw new Error("Unsafe font sprite sheet");
    const paletteStart=meta-(colors-1)*3;
    if(paletteStart<0)throw new Error("Truncated font sprite palette");
    const frames=[],indices=[];
    for(let i=0;i<count;i++){
        const x=short(meta+5+i*2),y=short(meta+5+count*2+i*2),
            width=short(meta+5+count*4+i*2),height=short(meta+5+count*6+i*2);
        if(x+width>sheetWidth||y+height>sheetHeight||width*height>32768)
            throw new Error("Invalid font sprite dimensions");
        frames.push({x,y,width,height,rgba:new Uint8ClampedArray(width*height*4)});
    }
    let offset=0;
    for(const frame of frames){
        if(offset>=paletteStart)throw new Error("Truncated font glyph stream");
        const flags=bytes[offset++];
        if(flags&~3)throw new Error("Unsupported font glyph storage");
        const length=frame.width*frame.height,alpha=!!(flags&2),column=!!(flags&1);
        if(offset+length*(alpha?2:1)>paletteStart)throw new Error("Font glyph exceeds file boundary");
        const order=new Uint8Array(length);
        for(let j=0;j<length;j++){
            const x=column?Math.floor(j/frame.height):j%frame.width;
            const y=column?j%frame.height:Math.floor(j/frame.width);
            order[y*frame.width+x]=bytes[offset++];
        }
        const opacity=new Uint8Array(length);
        if(alpha)for(let j=0;j<length;j++){
            const x=column?Math.floor(j/frame.height):j%frame.width,
                y=column?j%frame.height:Math.floor(j/frame.width);
            opacity[y*frame.width+x]=bytes[offset++];
        }
        for(let j=0;j<length;j++){
            if(order[j]>=colors)throw new Error("Font glyph palette index out of range");
            frame.rgba[j*4+3]=order[j]===0?0:alpha?opacity[j]:255;
        }
    }
    if(offset!==paletteStart)throw new Error("Font glyph stream has trailing bytes");
    return frames;
}

export const MENU_FONT_ID=496; // b12_full: TSPS ui/fonts.ts
export const MENU_ROW_HEIGHT=15;
export const MENU_HEIGHT_BASE=22;
export const MENU_BACKGROUND="#5d5447";
const byte=(bytes,pos)=>{if(pos.index>=bytes.length)throw new Error("Truncated OSRS font metrics");return bytes[pos.index++];};
const signed=n=>n<<24>>24;
export function decodeMenuFontMetrics(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<257||bytes.length>131072)
        throw new Error("Invalid OSRS font metrics");
    const at={index:0},advances=new Uint8Array(256);
    for(let i=0;i<256;i++)advances[i]=byte(bytes,at);
    if(bytes.length===257)return {advances,ascent:byte(bytes,at),kerning:null};
    const heights=new Uint8Array(256),tops=new Uint8Array(256);
    for(let i=0;i<256;i++)heights[i]=byte(bytes,at);
    for(let i=0;i<256;i++)tops[i]=byte(bytes,at);
    const right=[],left=[];
    for(const sides of [right,left]){
        for(let i=0;i<256;i++){
            const distances=new Uint8Array(heights[i]);let value=0;
            for(let j=0;j<distances.length;j++){value=(value+signed(byte(bytes,at)))&255;distances[j]=value;}
            sides.push(distances);
        }
    }
    if(at.index!==bytes.length)throw new Error("Unexpected OSRS font metrics tail");
    const kerning=new Int8Array(65536);
    for(let a=0;a<256;a++){
        if(a===32||a===160)continue;
        for(let b=0;b<256;b++){
            if(b===32||b===160)continue;
            const start=Math.max(tops[a],tops[b]),end=Math.min(tops[a]+heights[a],tops[b]+heights[b]);
            let distance=Math.min(advances[a],advances[b]);
            for(let row=start;row<end;row++){
                const sum=left[a][row-tops[a]]+right[b][row-tops[b]];
                if(sum<distance)distance=sum;
            }
            kerning[a*256+b]=Math.max(-128,Math.min(127,-distance));
        }
    }
    return {advances,ascent:tops[32]+heights[32],kerning};
}
const cp1252=ch=>{const code=ch.charCodeAt(0);return code===160?32:code<256?code:63};
export class CacheMenuFont{
    constructor(frames,metrics){
        if(frames.length<256)throw new Error("Missing b12_full cache glyphs");
        this.frames=frames;this.advances=metrics.advances;this.ascent=metrics.ascent;
        this.kerning=metrics.kerning;this.glyphs=new Map();
    }
    measure(text){
        let width=0,previous=-1;
        for(const char of text){
            const code=cp1252(char);
            if(previous>=0&&this.kerning)width+=this.kerning[previous*256+code];
            width+=this.advances[code]||this.frames[code].width;previous=code;
        }
        return width;
    }
    glyph(code,color){
        const key=color+":"+code;
        if(this.glyphs.has(key))return this.glyphs.get(key);
        const frame=this.frames[code],canvas=document.createElement("canvas");
        canvas.width=frame.width;canvas.height=frame.height;
        const ctx=canvas.getContext("2d");
        if(!ctx)throw new Error("2D canvas unavailable for cached font");
        const pixels=ctx.createImageData(frame.width,frame.height),rgb=parseInt(color.slice(1),16);
        for(let i=0;i<frame.width*frame.height;i++){
            const alpha=frame.rgba[i*4+3];if(!alpha)continue;
            pixels.data[i*4]=rgb>>16&255;pixels.data[i*4+1]=rgb>>8&255;
            pixels.data[i*4+2]=rgb&255;pixels.data[i*4+3]=alpha;
        }
        ctx.putImageData(pixels,0,0);
        if(this.glyphs.size>4096)this.glyphs.clear();
        this.glyphs.set(key,canvas);return canvas;
    }
    draw(ctx,text,x,baseline,color,shadow=false){
        let pen=x,previous=-1;
        for(const char of text){
            const code=cp1252(char),f=this.frames[code];
            if(previous>=0&&this.kerning)pen+=this.kerning[previous*256+code];
            if(f.width&&f.height){
                const dx=Math.round(pen+f.x),dy=Math.round(baseline-this.ascent+f.y);
                if(shadow)ctx.drawImage(this.glyph(code,"#000000"),dx+1,dy+1);
                ctx.drawImage(this.glyph(code,color),dx,dy);
            }
            pen+=this.advances[code]||f.width;previous=code;
        }
        return pen;
    }
}
export async function loadCacheMenuFont(cache,fontId=MENU_FONT_ID){
    if(!cache||typeof cache.loadGroup!=="function")throw new Error("Revision-240 JS5 cache required for menu font");
    if(!Number.isInteger(fontId)||fontId<0||fontId>65535)throw new Error("Invalid cache font id");
    const load=async index=>{
        const catalog=await verifiedCatalog(cache,index),fileIds=catalog.fileIdsForGroup.get(fontId);
        if(!fileIds?.includes(0))throw new Error("Cache b12_full font file missing at "+index+":"+MENU_FONT_ID);
        const payload=await decodeGroup(await cache.loadGroup(index,fontId));
        const files=unpackArchiveFiles(payload,fileIds,new Set([0]));
        const result=files.get(0);if(!result)throw new Error("Cache font group missing its verified file");
        return result;
    };
    const [sprites,metrics]=await Promise.all([load(8),load(13)]);
    return new CacheMenuFont(decodeMenuFontSprites(sprites),decodeMenuFontMetrics(metrics));
}

// Normalization follows client MenuEngine's reverse insertion ordering and
// high-priority (<1000) actions before Examine (1003) and Cancel (1006).
export function buildNativeMenuEntries(info){
    if(!info)return [];
    if(info.kind==="ground")return [
        {option:"Walk here",target:"",kind:"walk",opcode:23},
        {option:"Cancel",target:"",kind:"cancel",opcode:1006}
    ];
    const normal=[],low=[];
    for(const {slot,label} of info.actions??[]){
        const item={option:label,target:info.name,kind:"npc",slot,opcode:9+slot};
        (label.toLowerCase()==="attack"?low:normal).push(item);
    }
    // Cache actions were inserted in ascending action-slot order by the client.
    // Reverse insertion order when displaying, as TSPS MenuEngine.normalizeMenuEntries does.
    return [...normal.reverse(),...low.reverse(),
        {option:"Examine",target:info.name,kind:"examine",opcode:1003},
        {option:"Cancel",target:"",kind:"cancel",opcode:1006}];
}
export function menuDimensions(entries,font){
    if(!entries.length)throw new Error("Empty OSRS interaction menu");
    const widest=Math.max(font.measure("Choose Option"),...entries.map(e=>font.measure(e.option+(e.target?" "+e.target:""))));
    return {width:widest+8,height:entries.length*MENU_ROW_HEIGHT+MENU_HEIGHT_BASE};
}
export function menuRectangle(anchor,entries,font,width,height,scale=1){
    const measured=menuDimensions(entries,font),w=measured.width*scale,h=measured.height*scale;
    return {x:Math.max(0,Math.min(width-w,Math.floor(anchor.x-w/2))),
        y:Math.max(0,Math.min(height-h,Math.floor(anchor.y))),w,h,scale};
}
export function menuIndexAt(rect,x,y,count){
    if(!rect||x<=rect.x||x>=rect.x+rect.w)return -1;
    const row=(y-rect.y)/rect.scale;
    for(let i=0;i<count;i++)if(row>18+i*15&&row<34+i*15)return i;
    return -1;
}
export class NativeChooseOptionMenu{
    constructor(canvas,{onEntry=()=>{}}={}){
        this.canvas=canvas;this.context=canvas.getContext("2d");
        if(!this.context)throw new Error("Native menu requires 2D canvas");
        this.font=null;this.pending=null;this.active=null;this.hover=-1;
        this.onEntry=onEntry;this.generation=0;
        this.onPointerMove=e=>{if(!this.active)return;this.hover=this.hit(e);this.render();};
        this.onPointerDown=e=>{
            if(!this.active)return;
            e.preventDefault();e.stopPropagation();
            const i=this.hit(e),{info,entries}=this.active,entry=entries[i];this.close();
            if(entry&&entry.kind!=="cancel")this.onEntry(entry,info);
        };
        this.onContextMenu=e=>e.preventDefault();
        this.onKey=e=>{if(e.key==="Escape"&&this.active){e.preventDefault();this.close();}};
        canvas.addEventListener("pointermove",this.onPointerMove);
        canvas.addEventListener("pointerdown",this.onPointerDown);
        canvas.addEventListener("contextmenu",this.onContextMenu);
        document.addEventListener("keydown",this.onKey);
    }
    async load(cache){
        const generation=++this.generation;this.font=null;this.close();
        const font=await loadCacheMenuFont(cache);
        if(generation!==this.generation)return;
        this.font=font;if(this.pending){const info=this.pending;this.pending=null;this.open(info);}
    }
    open(info){
        if(!info){this.close();return;}
        if(!this.font){this.pending=info;return;}
        const entries=buildNativeMenuEntries(info);
        if(!entries.length){this.close();return;}
        this.pending=null;this.canvas.hidden=false;
        this.active={info,entries};this.hover=-1;this.render();
    }
    close(){
        this.active=null;this.pending=null;this.hover=-1;
        this.canvas.hidden=true;this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    measureCanvas(){
        const parent=this.canvas.parentElement,width=parent.clientWidth,height=parent.clientHeight;
        const ratio=Math.min(3,window.devicePixelRatio||1);
        const pxWidth=Math.max(1,Math.round(width*ratio)),pxHeight=Math.max(1,Math.round(height*ratio));
        if(this.canvas.width!==pxWidth||this.canvas.height!==pxHeight){
            this.canvas.width=pxWidth;this.canvas.height=pxHeight;
        }
        this.context.setTransform(ratio,0,0,ratio,0,0);
        return {width,height};
    }
    render(){
        if(!this.active||!this.font)return;
        const ctx=this.context,{width,height}=this.measureCanvas(),entries=this.active.entries;
        ctx.clearRect(0,0,width,height);
        const scale=window.matchMedia?.("(pointer: coarse)")?.matches?2:1;
        const rect=menuRectangle(this.active.info,entries,this.font,width,height,scale);
        this.active.rect=rect;
        ctx.save();ctx.translate(rect.x,rect.y);ctx.scale(scale,scale);
        const w=rect.w/scale,h=rect.h/scale;
        ctx.fillStyle=MENU_BACKGROUND;ctx.fillRect(0,0,w,h);
        ctx.fillStyle="#000000";ctx.fillRect(1,1,w-2,16);
        ctx.strokeStyle="#000000";ctx.lineWidth=1;ctx.strokeRect(1.5,18.5,w-3,h-20);
        this.font.draw(ctx,"Choose Option",3,14,MENU_BACKGROUND);
        for(let i=0;i<entries.length;i++){
            const item=entries[i],y=31+i*15,color=i===this.hover?"#ffff00":"#ffffff";
            let x=this.font.draw(ctx,item.option,3,y,color,true);
            if(item.target){
                x=this.font.draw(ctx," ",x,y,color,true);
                this.font.draw(ctx,item.target,x,y,"#ffff00",true);
            }
        }
        ctx.restore();
    }
    hit(event){
        if(!this.active?.rect)return -1;
        const r=this.canvas.getBoundingClientRect();
        return menuIndexAt(this.active.rect,event.clientX-r.left,event.clientY-r.top,this.active.entries.length);
    }
    dispose(){
        this.generation++;this.close();
        this.canvas.removeEventListener("pointermove",this.onPointerMove);
        this.canvas.removeEventListener("pointerdown",this.onPointerDown);
        this.canvas.removeEventListener("contextmenu",this.onContextMenu);
        document.removeEventListener("keydown",this.onKey);
    }
}
