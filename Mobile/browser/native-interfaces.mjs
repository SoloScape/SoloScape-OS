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
// Revision-240 IF1/IF3 widget decoder adapted from pinned TSPS WidgetLoader.
// Only cache bytes are used as definitions; client script listeners are decoded
// as inert metadata, never evaluated by the browser.
import {ByteBuffer} from "./cache-reader.mjs";
import {decodeGroup,verifiedCatalog} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";

const nullable=n=>n===65535?-1:n;
const bounded=(n,max,label)=>{if(n>max)throw new Error("Unsafe "+label);return n;};
function listeners(r){
    const result=[];
    for(let i=0;i<18;i++){
        const count=bounded(r.readUnsignedByte(),64,"widget listener length"),args=[];
        for(let j=0;j<count;j++){
            const type=r.readUnsignedByte();
            if(type===0)args.push(r.readInt());
            else if(type===1)args.push(r.readString());
            else throw new Error("Unsupported widget listener argument type "+type);
        }
        result.push(args);
    }
    const triggers=[];
    for(let i=0;i<3;i++){
        const count=bounded(r.readUnsignedByte(),128,"widget trigger count"),ids=[];
        for(let j=0;j<count;j++)ids.push(r.readInt());
        triggers.push(ids);
    }
    return {listeners:result,triggers};
}
export function decodeWidget(uid,bytes){
    if(!Number.isInteger(uid)||uid<0||!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>256*1024)
        throw new Error("Invalid cached widget");
    const r=new ByteBuffer(bytes),isIf3=bytes[0]===255,groupId=uid>>>16,fileId=uid&65535;
    if(isIf3)r.readByte();
    const type=isIf3?r.readByte():r.readUnsignedByte();
    if(type<0||type>9)throw new Error("Unknown widget type "+type);
    const buttonType=isIf3?0:r.readUnsignedByte();
    const contentType=r.readUnsignedShort(),rawX=r.readShort(),rawY=r.readShort(),
        rawWidth=r.readUnsignedShort(),rawHeight=isIf3&&type===9?r.readShort():r.readUnsignedShort();
    const modes=isIf3?[r.readByte(),r.readByte(),r.readByte(),r.readByte()]:[0,0,0,0];
    let parentUid=nullable(r.readUnsignedShort());
    if(parentUid!==-1)parentUid=(uid&~65535)|parentUid;
    const opacity=isIf3?0:null;
    const widget={uid,groupId,fileId,isIf3,type,buttonType,contentType,rawX,rawY,rawWidth,rawHeight,
        widthMode:modes[0],heightMode:modes[1],xPositionMode:modes[2],yPositionMode:modes[3],
        parentUid,hidden:false,opacity:opacity??0,color:0,text:"",fontId:-1,spriteId:-1,
        scrollX:0,scrollY:0,scrollWidth:0,scrollHeight:0};
    if(isIf3){
        widget.hidden=r.readUnsignedByte()===1;
        if(type===0){widget.scrollWidth=r.readUnsignedShort();widget.scrollHeight=r.readUnsignedShort();
            widget.noClickThrough=r.readUnsignedByte()===1;}
        else if(type===5){widget.spriteId=r.readInt();widget.spriteAngle=r.readUnsignedShort();
            widget.spriteTiling=r.readUnsignedByte()===1;widget.opacity=r.readUnsignedByte();
            widget.borderType=r.readUnsignedByte();widget.shadowColor=r.readInt();
            widget.flippedV=r.readUnsignedByte()===1;widget.flippedH=r.readUnsignedByte()===1;}
        else if(type===6){widget.modelId=r.readInt();widget.modelOffsetX=r.readShort();widget.modelOffsetY=r.readShort();
            widget.rotationX=r.readUnsignedShort();widget.rotationY=r.readUnsignedShort();
            widget.rotationZ=r.readUnsignedShort();widget.modelZoom=r.readUnsignedShort();
            widget.sequenceId=nullable(r.readUnsignedShort());widget.modelOrthog=r.readUnsignedByte()===1;
            r.readUnsignedShort();if(widget.widthMode!==0)r.readUnsignedShort();
            if(widget.heightMode!==0)r.readUnsignedShort();}
        else if(type===4){widget.fontId=nullable(r.readUnsignedShort());widget.text=r.readString();
            widget.lineHeight=r.readUnsignedByte();widget.xTextAlignment=r.readUnsignedByte();
            widget.yTextAlignment=r.readUnsignedByte();widget.textShadowed=r.readUnsignedByte()===1;
            widget.color=r.readInt()>>>0;}
        else if(type===3){widget.color=r.readInt()>>>0;widget.filled=r.readUnsignedByte()===1;
            widget.opacity=r.readUnsignedByte();}
        else if(type===9){widget.lineWidth=r.readUnsignedByte();widget.color=r.readInt()>>>0;
            widget.lineDirection=r.readUnsignedByte()===1;}
        widget.flags=r.readMedium();widget.dataText=r.readString();
        widget.actions=[];
        for(let i=0,n=bounded(r.readUnsignedByte(),64,"widget actions");i<n;i++)widget.actions.push(r.readString());
        widget.dragZoneSize=r.readUnsignedByte();widget.dragThreshold=r.readUnsignedByte();
        widget.isScrollBar=r.readUnsignedByte()===1;widget.spellActionName=r.readString();
        const events=listeners(r);widget.listenerCount=events.listeners.filter(a=>a.length).length;
        widget.triggerCount=events.triggers.reduce((n,a)=>n+a.length,0);
    }else{
        widget.opacity=r.readUnsignedByte();widget.mouseOverRedirect=nullable(r.readUnsignedShort());
        // Legacy inventory and item-list widgets have additional per-slot fields
        // not implemented in the pinned decoder. Preserve their original
        // bounds but never invent item geometry or parse the remaining bytes
        // as another widget. Other real components in the group still render.
        if(type===2||type===7){widget.unsupported=true;return widget;}
        for(let i=0,n=bounded(r.readUnsignedByte(),64,"CS1 comparison count");i<n;i++){
            r.readUnsignedByte();r.readUnsignedShort();
        }
        for(let i=0,n=bounded(r.readUnsignedByte(),64,"CS1 instruction count");i<n;i++){
            for(let j=0,len=bounded(r.readUnsignedShort(),2048,"CS1 instruction length");j<len;j++)r.readUnsignedShort();
        }
        if(type===0){widget.scrollHeight=r.readUnsignedShort();widget.hidden=r.readUnsignedByte()===1;
            widget.rawChildren=[];
            for(let i=0,n=bounded(r.readUnsignedShort(),2048,"legacy widget children");i<n;i++)
                widget.rawChildren.push({fileId:r.readUnsignedShort(),x:r.readShort(),y:r.readShort()});}
        if(type===1){r.readUnsignedShort();r.readUnsignedByte();}
        if(type===3)widget.filled=r.readUnsignedByte()===1;
        if(type===4||type===1){widget.xTextAlignment=r.readUnsignedByte();widget.yTextAlignment=r.readUnsignedByte();
            widget.lineHeight=r.readUnsignedByte();widget.fontId=nullable(r.readUnsignedShort());
            widget.textShadowed=r.readUnsignedByte()===1;}
        if(type===4){widget.text=r.readString();widget.text2=r.readString();}
        if(type===1||type===3||type===4)widget.color=r.readInt()>>>0;
        if(type===3||type===4){widget.color2=r.readInt()>>>0;
            widget.mouseOverColor=r.readInt();widget.mouseOverColor2=r.readInt();}
        if(type===5){widget.spriteId=r.readInt();widget.spriteId2=r.readInt();}
        if(type===6){widget.modelId=r.readInt();widget.modelId2=r.readInt();
            widget.sequenceId=nullable(r.readUnsignedShort());widget.sequenceId2=nullable(r.readUnsignedShort());
            widget.modelZoom=r.readUnsignedShort();widget.rotationX=r.readUnsignedShort();widget.rotationY=r.readUnsignedShort();}
        if(type===8)widget.text=r.readString();
        if(buttonType===2){widget.spellActionName=r.readString();widget.spellTargetName=r.readString();r.readUnsignedShort();}
        if([1,4,5,6].includes(buttonType))widget.buttonText=r.readString();
    }
    if(r.offset!==r.length)throw new Error("Trailing widget bytes "+groupId+":"+fileId+" at "+r.offset+"/"+r.length);
    return widget;
}
export function linkInterfaceWidgets(widgets){
    const children=new Map();
    for(const widget of widgets.values()){
        const parent=widgets.get(widget.parentUid);
        if(parent){
            if(!children.has(parent.uid))children.set(parent.uid,[]);
            children.get(parent.uid).push(widget);
        }
    }
    // IF1 containers carry authoritative child positions and order.
    for(const parent of widgets.values())if(!parent.isIf3&&parent.rawChildren){
        const links=[];
        for(const entry of parent.rawChildren){
            const widget=widgets.get((parent.groupId<<16)|entry.fileId);
            if(widget){widget.parentUid=parent.uid;widget.legacyX=entry.x;widget.legacyY=entry.y;
                links.push(widget);}
        }
        children.set(parent.uid,links);
    }
    // IF1 container child links can override a child's cached parentUid.
    // Recalculate roots after applying those links rather than retaining
    // stale roots from the first pass.
    const actualRoots=[...widgets.values()].filter(w=>!widgets.has(w.parentUid));
    actualRoots.sort((a,b)=>(a.fileId===0?-1:b.fileId===0?1:a.fileId-b.fileId));
    return {roots:actualRoots,children};
}
export class NativeInterfaces{
    constructor(cache){this.cache=cache;this.groups=new Map();}
    async load(groupId){
        if(!Number.isInteger(groupId)||groupId<0||groupId>65535)throw new Error("Invalid interface group");
        if(this.groups.has(groupId))return this.groups.get(groupId);
        if(this.groups.size>=16)this.groups.delete(this.groups.keys().next().value);
        const promise=this.fetch(groupId);
        this.groups.set(groupId,promise);
        try{return await promise;}catch(error){this.groups.delete(groupId);throw error;}
    }
    async fetch(groupId){
        const catalog=await verifiedCatalog(this.cache,3);
        const ids=catalog.fileIdsForGroup.get(groupId);
        if(!ids?.length)throw new Error("Interface group "+groupId+" does not exist in the verified revision-240 cache");
        if(ids.length>2048)throw new Error("Interface group has too many components");
        const container=await this.cache.loadGroup(3,groupId),files=unpackArchiveFiles(await decodeGroup(container),ids,new Set(ids));
        const widgets=new Map();
        for(const id of ids){
            const bytes=files.get(id);if(!bytes)throw new Error("Missing interface component "+groupId+":"+id);
            const uid=(groupId<<16)|id;
            widgets.set(uid,decodeWidget(uid,bytes));
        }
        const tree=linkInterfaceWidgets(widgets);
        return {groupId,widgets,...tree};
    }
}
