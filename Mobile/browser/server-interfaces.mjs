import {decodeInterfacePacket,encodeInterfaceButton} from "./interface-protocol.mjs";

// Packet state is synchronous. Cache reads and painting never hold up the game
// stream; every continuation checks the revision that requested it.
export class ServerInterfaces {
    constructor({view,session,onStatus=()=>{}}){
        this.view=view;this.session=session;this.onStatus=onStatus;
        this.top=-1;this.mounts=new Map();this.patches=new Map();this.events=[];
        this.loaded=new Map();this.revision=0;this.closed=false;this.queued=false;
    }
    groupIds(){return new Set([this.top,...[...this.mounts.values()].map(m=>m.groupId)].filter(id=>id>=0));}
    forget(groupId){
        if(this.groupIds().has(groupId))return;
        const nested=[];
        for(const [uid,mount] of this.mounts)if(uid>>>16===groupId){this.mounts.delete(uid);nested.push(mount.groupId);}
        for(const uid of this.patches.keys())if(uid>>>16===groupId)this.patches.delete(uid);
        this.events=this.events.filter(e=>e.uid>>>16!==groupId);
        this.loaded.delete(groupId);
        for(const id of nested)this.forget(id);
    }
    handle(packet){
        if(this.closed)return false;
        const message=decodeInterfacePacket(packet);if(!message)return false;
        const before=this.groupIds();
        switch(message.kind){
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
        await this.view.showGroup(group);
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
            const packet=action?encodeInterfaceButton(w,{op:action}):null;
            if(packet||w.noClickThrough)return {node,op:action,packet};
        }
        return null;
    }
    click(x,y){
        if(this.closed)return false;
        const hit=this.hit(x,y);if(!hit)return false;
        if(hit.packet)this.session.sendGame(hit.packet.opcode,hit.packet.payload);
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
            press={...p,uid:hit.node.widget.uid,id:e.pointerId,revision:this.revision};
            consume(e);surface.setPointerCapture?.(e.pointerId);
        };
        const move=e=>{if(press?.id===e.pointerId)consume(e);};
        const up=e=>{
            if(press?.id!==e.pointerId)return;
            consume(e);const p=point(e),hit=this.hit(p.x,p.y),old=press;press=null;
            surface.releasePointerCapture?.(e.pointerId);
            if(e.button===0&&old.revision===this.revision&&hit?.node.widget.uid===old.uid&&Math.hypot(p.x-old.x,p.y-old.y)<8)
                this.click(p.x,p.y);
        };
        const cancel=e=>{if(press?.id===e.pointerId){consume(e);press=null;}};
        const context=e=>{
            if(e.target?.tagName&&e.target.tagName!=="CANVAS")return;
            const p=point(e);if(this.hit(p.x,p.y))consume(e);
        };
        const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,contextmenu:context};
        for(const [name,fn] of Object.entries(handlers))surface.addEventListener(name,fn,{capture:true,passive:false});
        this.unbindInput=()=>{for(const [name,fn] of Object.entries(handlers))surface.removeEventListener(name,fn,true);press=null;};
    }
    close(){
        this.closed=true;this.revision++;this.unbindInput?.();this.view.close();
        this.mounts.clear();this.patches.clear();this.events=[];this.loaded.clear();this.top=-1;
    }
}
