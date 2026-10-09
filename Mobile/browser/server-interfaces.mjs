import {decodeInterfacePacket,encodeInterfaceButton} from "./interface-protocol.mjs";
import {NativeScripts,runWidgetScript} from "./native-scripts.mjs";
import {wrapCacheText} from "./interface-canvas.mjs";

// Packet state is synchronous. Cache reads and painting never hold up the game
// stream; every continuation checks the revision that requested it.
export class ServerInterfaces {
    constructor({view,session,onStatus=()=>{},scripts=new NativeScripts(view.cache),mobile=()=>globalThis.matchMedia?.("(pointer: coarse)").matches??false}){
        this.view=view;this.session=session;this.onStatus=onStatus;
        this.top=-1;this.mounts=new Map();this.patches=new Map();this.events=[];
        this.loaded=new Map();this.revision=0;this.closed=false;this.queued=false;
        this.scripts=scripts;this.mobile=mobile;this.scriptMessages=new Map();this.patchStamps=new Map();this.varps=new Map();this.varcs=new Map();this.varcStrings=new Map();this.awaiting=null;
    }
    groupIds(){return new Set([this.top,...[...this.mounts.values()].map(m=>m.groupId)].filter(id=>id>=0));}
    forget(groupId){
        if(this.groupIds().has(groupId))return;
        const nested=[];
        for(const [uid,mount] of this.mounts)if(uid>>>16===groupId){this.mounts.delete(uid);nested.push(mount.groupId);}
        for(const uid of this.patches.keys())if(uid>>>16===groupId)this.patches.delete(uid);
        this.events=this.events.filter(e=>e.uid>>>16!==groupId);
        this.loaded.delete(groupId);
        for(const uid of this.patchStamps.keys())if(uid>>>16===groupId)this.patchStamps.delete(uid);
        for(const [key,script] of this.scriptMessages)if(script.groupId===groupId)this.scriptMessages.delete(key);
        for(const id of nested)this.forget(id);
    }
    handle(packet){
        if(this.closed)return false;
        const message=decodeInterfacePacket(packet);if(!message)return false;
        const before=this.groupIds();
        switch(message.kind){
            case "varp":
                if(this.varps.get(message.id)===message.value)return true;
                if(!this.varps.has(message.id)&&this.varps.size>=65536)throw new Error("Varp budget exceeded");
                this.varps.set(message.id,message.value);
                if(!this.scriptMessages.size)return true;
                break;
            case "script":{
                // These are the server's choice builder, text alignment and
                // chat-background reset entry points. Dependencies use real CS2.
                if(![58,600,2379].includes(message.id))return true;
                const groupId=message.id===58?219:message.id===600?message.args.at(-1)>>>16:-1;
                const key=message.id+":"+groupId+":"+(message.id===600?message.args.at(-1):0);
                if(!this.scriptMessages.has(key)&&this.scriptMessages.size>=256)throw new Error("Dialogue script budget exceeded");
                this.scriptMessages.set(key,{...message,groupId,order:this.revision+1});
                if(message.id===58)this.awaiting=null;
                break;
            }
            case "top":this.top=message.groupId;break;
            case "open":
                if(!this.mounts.has(message.uid)&&this.mounts.size>=128)throw new Error("Interface mount budget exceeded");
                this.mounts.set(message.uid,message);break;
            case "close":this.mounts.delete(message.uid);break;
            case "move":{
                const mount=this.mounts.get(message.source);
                this.mounts.delete(message.source);this.mounts.delete(message.destination);
                if(mount)this.mounts.set(message.destination,{...mount,uid:message.destination});
                break;
            }
            case "resync":
                this.top=message.groupId;this.mounts=new Map(message.mounts.map(m=>[m.uid,m]));
                this.events=message.events;break;
            case "patch":
                if(!this.patches.has(message.uid)&&this.patches.size>=4096)throw new Error("Interface update budget exceeded");
                this.patches.set(message.uid,{...this.patches.get(message.uid),...message.patch});break;
            case "events":{
                const events=this.events.filter(e=>e.uid!==message.uid||e.start!==message.start||e.end!==message.end);
                if(events.length>=4096)throw new Error("Interface event budget exceeded");
                this.events=[...events,message];break;
            }
        }
        if(message.kind==="patch"){
            const stamps=this.patchStamps.get(message.uid)??new Map();
            for(const key of Object.keys(message.patch))stamps.set(key,this.revision+1);
            this.patchStamps.set(message.uid,stamps);
            if(message.patch.text!==undefined&&this.awaiting?.groupId===message.uid>>>16)this.awaiting=null;
        }else if(["top","open","close","resync","move"].includes(message.kind))this.awaiting=null;
        for(const id of before)this.forget(id);
        this.revision++;this.view.close();this.schedule();return true;
    }
    schedule(){
        if(this.queued||this.closed)return;
        this.queued=true;
        this.pending=Promise.resolve().then(()=>{this.queued=false;return this.refresh();});
        // Cache/unsupported-widget failures are visible without dropping game transport.
        void this.pending.catch(error=>{if(!this.closed)this.onStatus("Server interface unavailable: "+error.message);});
    }
    refreshPortraits(){
        if(this.closed||![...this.patches.values()].some(p=>p.modelKind==="player"))return;
        this.revision++;this.view.close();this.schedule();
    }
    async refresh(){
        const revision=this.revision,ids=this.groupIds();
        const results=await Promise.allSettled([...ids].map(async id=>[id,this.loaded.get(id)??await this.view.interfaces.load(id)]));
        if(this.closed||revision!==this.revision)return;
        this.loaded.clear();
        for(const result of results){
            if(result.status==="fulfilled")this.loaded.set(...result.value);
            else this.onStatus("Server interface cache unavailable: "+result.reason.message);
        }
        const group=this.compose();
        if(!group.roots.length){this.view.close();return;}
        for(const message of [...this.scriptMessages.values()].sort((a,b)=>a.order-b.order)){
            if(message.groupId>=0&&!ids.has(message.groupId))continue;
            try{
                await runWidgetScript(this.scripts,message.id,message.args,group,{varps:this.varps,varcs:this.varcs,varcStrings:this.varcStrings,mobile:this.mobile(),
                    isCurrent:()=>!this.closed&&revision===this.revision,
                    canWrite:(w,key)=>w.childIndex!==undefined||(this.patchStamps.get(w.uid)?.get(key)??0)<=message.order,
                    measure:async(id,text,width,height)=>{
                        const font=await this.view.assets.font(id),rows=wrapCacheText(font,text,width);
                        return height?rows.length:Math.max(0,...rows.map(row=>font.measure(row)));
                    }});
            }catch(error){
                if(revision!==this.revision||this.closed)return;
                this.onStatus("Dialogue script "+message.id+": "+error.message);
                // Failed bytecode must not leave a half-created option menu.
                if(message.id===58){this.view.close();return;}
            }
            if(revision!==this.revision||this.closed)return;
        }
        const permissions=w=>{
            const index=w.childIndex??-1;
            for(const e of this.events)if(e.uid===w.uid&&e.start<=index&&e.end>=index){w.flags=e.flags;w.flags2=e.flags2;}
            for(const child of (w.dynamicChildren??[]).filter(Boolean))permissions(child);
        };
        for(const w of group.widgets.values())permissions(w);
        const rendered=await this.view.showGroup(group);
        if(revision===this.revision&&rendered?.missingAssets)
            this.onStatus("Server interface: "+rendered.missingAssets+" cache asset/animation unavailable");
    }
    compose(){
        const groups=new Map(),widgets=new Map(),children=new Map();
        const flags=new Map(this.events.filter(e=>e.start<=-1&&e.end>=-1).map(e=>[e.uid,e]));
        for(const [id,source] of this.loaded){
            const copies=new Map();
            for(const [uid,original] of source.widgets){
                if(widgets.size>=8192)throw new Error("Active interface widget budget exceeded");
                const widget={...original,...this.patches.get(uid)};
                const event=flags.get(uid);
                if(event){
                    widget.flags=event.flags;widget.flags2=event.flags2;
                }
                // Layout clamps scrolling against the resolved content/viewport size.
                widget.scrollY=Math.max(0,widget.scrollY||0);
                copies.set(uid,widget);widgets.set(uid,widget);
            }
            for(const [uid,list] of source.children)children.set(uid,list.map(w=>copies.get(w.uid)));
            groups.set(id,{roots:source.roots.map(w=>copies.get(w.uid))});
        }
        for(const [uid,mount] of this.mounts){
            const roots=groups.get(mount.groupId)?.roots;
            if(!widgets.has(uid)||!roots)continue;
            // Type 0 mounts are modal. They consume input inside their roots.
            if(mount.type===0)for(const root of roots)root.noClickThrough=true;
            children.set(uid,[...children.get(uid)??[],...roots]);
        }
        // Native equivalent of the dialogue branch of chatbox scripts 113/923.
        // Their remaining branches own chat history/settings, which are not yet
        // implemented. Cache group 162 keeps these mount/background hosts hidden
        // until a modal opens; never reveal arbitrary hidden mount components.
        const chatBase=162*65536,modal=chatBase+567;
        if([217,219,231].includes(this.mounts.get(modal)?.groupId)){
            const update=(id,patch)=>{
                const w=widgets.get(chatBase+id);if(!w)return;
                for(const [key,value] of Object.entries(patch))
                    if(!Object.hasOwn(this.patches.get(w.uid)??{},key))w[key]=value;
            };
            update(567,{hidden:false,rawWidth:0,rawHeight:0,widthMode:1,heightMode:1});
            update(560,{hidden:false});update(56,{hidden:true});update(566,{hidden:true});
        }
        return {groupId:this.top,widgets,children,roots:groups.get(this.top)?.roots??[]};
    }
    hit(x,y){
        const nodes=this.view.active?.layout.nodes??[];
        for(let i=nodes.length-1;i>=0;i--){
            const node=nodes[i],c=node.clip;
            if(x<c.x||x>=c.r||y<c.y||y>=c.b)continue;
            const w=node.widget;
            if(![0,3,4,5,9].includes(w.type))continue;
            const action=w.isIf3?(w.actions??[]).findIndex((label,i)=>label&&((w.flags??0)&(1<<(i+1))))+1:1;
            const packet=(w.flags&1)||action?encodeInterfaceButton(w,{op:action||1}):null;
            if(packet||w.noClickThrough)return {node,op:action,packet};
        }
        return null;
    }
    click(x,y){
        if(this.closed)return false;
        const hit=this.hit(x,y);if(!hit)return false;
        if(hit.packet&&!(hit.packet.opcode===82&&this.awaiting)){
            this.session.sendGame(hit.packet.opcode,hit.packet.payload);
            if(hit.packet.opcode===82)this.awaiting={groupId:hit.node.widget.groupId};
        }
        return true;
    }
    bindInput(surface){
        this.unbindInput?.();
        let press=null;
        const point=e=>{const r=this.view.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
        const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
        const down=e=>{
            if(e.target?.tagName&&e.target.tagName!=="CANVAS")return;
            const p=point(e),hit=this.hit(p.x,p.y);
            if(!hit)return;
            press={...p,uid:hit.node.widget.uid,childIndex:hit.node.widget.childIndex,id:e.pointerId,revision:this.revision};
            consume(e);surface.setPointerCapture?.(e.pointerId);
        };
        const move=e=>{if(press?.id===e.pointerId)consume(e);};
        const up=e=>{
            if(press?.id!==e.pointerId)return;
            consume(e);const p=point(e),hit=this.hit(p.x,p.y),old=press;press=null;
            surface.releasePointerCapture?.(e.pointerId);
            if(e.button===0&&old.revision===this.revision&&hit?.node.widget.uid===old.uid&&hit?.node.widget.childIndex===old.childIndex&&Math.hypot(p.x-old.x,p.y-old.y)<8)
                this.click(p.x,p.y);
        };
        const cancel=e=>{if(press?.id===e.pointerId){consume(e);press=null;}};
        const context=e=>{
            if(e.target?.tagName&&e.target.tagName!=="CANVAS")return;
            const p=point(e);if(this.hit(p.x,p.y))consume(e);
        };
        const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,contextmenu:context};
        const keyboard=e=>{
            if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName??""))return;
            const nodes=(this.view.active?.layout.nodes??[]).filter(n=>(n.widget.flags&1)&&n.widget.type===4&&String(n.widget.text??"").trim());
            const selected=/^[1-5]$/.test(e.key)?nodes.find(n=>n.widget.childIndex===Number(e.key)):
                [" ","Enter"].includes(e.key)?nodes.find(n=>n.widget.childIndex===undefined):null;
            if(selected){consume(e);this.click((selected.clip.x+selected.clip.r)/2,(selected.clip.y+selected.clip.b)/2);}
        };
        for(const [name,fn] of Object.entries(handlers))surface.addEventListener(name,fn,{capture:true,passive:false});
        surface.ownerDocument?.addEventListener("keydown",keyboard,true);
        this.unbindInput=()=>{for(const [name,fn] of Object.entries(handlers))surface.removeEventListener(name,fn,true);surface.ownerDocument?.removeEventListener("keydown",keyboard,true);press=null;};
    }
    close(){
        this.closed=true;this.revision++;this.unbindInput?.();this.view.close();
        this.mounts.clear();this.patches.clear();this.events=[];this.loaded.clear();this.top=-1;
        this.scriptMessages.clear();this.patchStamps.clear();this.varps.clear();this.varcs.clear();this.varcStrings.clear();this.awaiting=null;
    }
}
