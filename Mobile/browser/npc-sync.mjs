// Native revision-240 rsprot desktop NPC_INFO_*_V6 wire layout.
// Refer to rsprot osrs-240 NpcInfoClient and NpcAvatarExtendedInfoDesktopWriter (MIT).
import {PacketReader} from "./player-sync.mjs";

const STEPS=[[-1,1],[0,1],[1,1],[-1,0],[1,0],[-1,-1],[0,-1],[1,-1]];
const ANGLES=[768,1024,1280,512,1536,256,0,1792];
const TYPE_BITS=[12,14,17,24],CLOCK_BITS=[18,19,20,32];
const MASK_BITS=0x200|0x200000|0x2|0x80000|0x10000|0x400|0x2000000|
    0x10|0x1|0x800|0x2000|0x4|0x20000|0x8000|0x100|0x8|0x80|0x100000;
const nullable=id=>id===65535?-1:id;
const signed=(n,bits)=>n>>(bits-1)?n-(2**bits):n;
const clone=n=>({...n,sequence:n.sequence&&{...n.sequence}});
const orient=(dx,dy)=>Math.round(Math.atan2(-dx,-dy)*1024/Math.PI)&2047;

function readMask(r,n){
    let flags=r.u8();
    if(flags&0x20)flags|=r.u8()<<8;
    if(flags&0x1000)flags|=r.u8()<<16;
    if(flags&0x40000)flags|=r.u8()<<24;
    if(flags & ~(MASK_BITS|0x20|0x1000|0x40000))throw new Error("Unknown NPC update mask "+flags.toString(16));
    if(flags&0x200)n.tint={start:r.u16(),end:r.u16(2),hue:r.i8(2),saturation:r.i8(3),lightness:r.i8(3),weight:r.u8(2)};
    if(flags&0x200000){
        const b=r.data(4),bits=((b[1]<<24)|(b[0]<<16)|(b[3]<<8)|b[2])>>>0;
        const ids=["turnLeft","turnRight","walk","walkBack","walkLeft","walkRight","run","runBack","runLeft","runRight",
            "crawl","crawlBack","crawlLeft","crawlRight","idle"];
        n.animationOverrides={...(n.animationOverrides??{})};
        for(let i=0;i<ids.length;i++)if(bits&(1<<i)){
            const alt=[3,1,0,1,1,3,0,2,1,2,1,2,3,0,0][i];
            n.animationOverrides[ids[i]]=nullable(r.u16(alt));
        }
    }
    if(flags&0x2){
        n.spotanims=[];
        for(let count=r.u8(3);count>0;count--){
            const slot=r.u8(),id=nullable(r.u16()),v=r.u32(true),loop=r.u8(1)!==0;
            n.spotanims.push({slot,id,height:v>>>16,delay:v&65535,loop});
        }
    }
    if(flags&0x80000)throw new Error("NPC head model customisation requires cache-specific layout");
    if(flags&0x10000){
        const mask=r.u8(1);n.headIcons=[];
        for(let i=0;i<8;i++)if(mask&(1<<i))n.headIcons.push({slot:i,group:r.smart2or4(),index:r.smart()});
    }
    if(flags&0x400)n.visibleOps=r.u8(3);
    if(flags&0x2000000){
        const f=r.u8(3),custom={models:[],recolours:[],retextures:[],mirror:Boolean(f&16)};
        if(f&~63)throw new Error("Unsupported NPC body customisation flags");
        if(f&2)for(let count=r.u8();count>0;count--)custom.models.push(r.u32());
        if(f&4)for(let count=r.u8();count>0;count--)custom.recolours.push(r.u16());
        if(f&8)for(let count=r.u8(2);count>0;count--)custom.retextures.push(r.u16(1));
        if(f&32){
            custom.bodyType=r.u8(1);custom.kits=[];
            for(let count=r.u8(1);count>0;count--)custom.kits.push(r.u16(3));
        }
        n.customisation=f&1?null:custom;
    }
    if(flags&0x10)n.overheadText=r.string();
    if(flags&0x1)n.freeze={delay:r.u16(3),duration:r.u16(2),cancelSequence:r.u8()===1};
    if(flags&0x800)n.combatLevel=r.u32(true);
    if(flags&0x2000)n.exactMove={dx1:r.i8(1),dy1:r.i8(3),dx2:r.i8(),dy2:r.i8(1),
        delay1:r.u16(1),delay2:r.u16(2),direction:r.u16(1)};
    if(flags&0x4)n.sequence={id:nullable(r.u16(1)),delay:r.u8(1)};
    if(flags&0x20000){
        n.hits=[];
        for(let count=r.u8(1);count>0;count--)n.hits.push({type:r.smart(),value:r.smart(),delay:r.smart(),limit:r.smart()});
    }
    if(flags&0x8000)n.transparency={start:r.u16(1),end:r.u16(),startAlpha:r.i8(1),endAlpha:r.i8(),useStart:r.u8()===1};
    if(flags&0x100)n.name=r.string();
    if(flags&0x8)n.type=nullable(r.u16(2));
    if(flags&0x80){
        const b=r.u8(1),kind=(b>>>3)&7;
        const facing={kind,walkMode:b&7,instant:Boolean(b&64)};
        if(kind===0){facing.entityType=r.smart();facing.index=r.smart2or4();facing.angle=r.smart();}
        else if(kind===1){facing.x=r.smart();facing.y=r.smart();facing.size=r.smart();}
        else if(kind===2)facing.angle=r.smart();
        else if(kind!==3)throw new Error("Unsupported NPC facing kind");
        n.facing=facing;if(facing.angle!==undefined)n.orientation=facing.angle&2047;
    }
    if(flags&0x100000){
        n.headbars=[];
        for(let count=r.u8(1);count>0;count--){
            const type=r.smart(),endTime=r.smart();
            if(endTime===32767){n.headbars.push({type,removed:true});continue;}
            const startTime=r.smart(),startFill=r.u8(3),endFill=endTime>0?r.u8(2):startFill;
            n.headbars.push({type,endTime,startTime,startFill,endFill});
        }
    }
}
function move(n,dx,dy,speed){
    n.previousX=n.x;n.previousY=n.y;n.x+=dx;n.y+=dy;n.teleported=false;
    n.moving=dx!==0||dy!==0;n.moveSpeed=speed;
    if(n.moving)n.orientation=orient(dx,dy);
}
export class NativeNpcSync{
    constructor(){this.npcs=new Map();this.high=[];this.origin=null;}
    reset(){this.npcs=new Map();this.high=[];this.origin=null;}
    setOrigin(payload,baseX,baseY){
        if(!(payload instanceof Uint8Array)||payload.length!==2||!Number.isInteger(baseX)||!Number.isInteger(baseY))
            throw new Error("Invalid NPC update origin");
        this.origin={x:baseX+payload[0],y:baseY+payload[1]};
    }
    decode(payload,{large=false,plane=0}={}){
        if(!this.origin)throw new Error("NPC info before update origin");
        if(!(payload instanceof Uint8Array))throw new Error("Invalid NPC packet");
        const r=new PacketReader(payload),npcs=new Map([...this.npcs].map(([id,n])=>[id,clone(n)])),
            high=[],masks=[],count=r.bits(8);
        if(count>this.high.length)throw new Error("NPC retained count exceeds previous list");
        for(let i=0;i<count;i++){
            const index=this.high[i],npc=npcs.get(index);
            if(!npc)throw new Error("Missing retained NPC");
            const updated=r.bits(1)===1;
            npc.teleported=false;
            if(!updated){npc.moving=false;high.push(index);continue;}
            const type=r.bits(2);
            if(type===3){npcs.delete(index);continue;}
            if(type===1){
                const [dx,dy]=STEPS[r.bits(3)];move(npc,dx,dy,1);
                if(r.bits(1))masks.push(index);
            }else if(type===2){
                const running=r.bits(1)===1;
                const [dx,dy]=STEPS[r.bits(3)];move(npc,dx,dy,running?2:0);
                if(running){const [x,y]=STEPS[r.bits(3)];move(npc,x,y,2);}
                if(r.bits(1))masks.push(index);
            }else{npc.moving=false;masks.push(index);}
            high.push(index);
        }
        for(const index of this.high.slice(count))npcs.delete(index);
        const distanceBits=large?8:6;
        while(payload.length*8-r.bitOffset>=16){
            const index=r.bits(16);
            if(index===65535)break;
            if(npcs.has(index)||high.length>=255)throw new Error("Invalid NPC spawn index/count");
            let spawnCycle=0;
            if(r.bits(1)){
                const bits=CLOCK_BITS[r.bits(2)];
                spawnCycle=bits===32?r.bits(16)*65536+r.bits(16):r.bits(bits);
            }
            const type=r.bits(TYPE_BITS[r.bits(2)]),extended=r.bits(1)===1,
                x=signed(r.bits(distanceBits),distanceBits),direction=r.bits(3),
                jump=r.bits(1)===1,y=signed(r.bits(distanceBits),distanceBits);
            const npc={index,type,x:this.origin.x+x,y:this.origin.y+y,plane,orientation:ANGLES[direction],
                moving:false,moveSpeed:0,teleported:jump,spawnCycle,sequence:null};
            if(npc.x<0||npc.x>16383||npc.y<0||npc.y>16383)throw new Error("NPC spawn outside world");
            npcs.set(index,npc);high.push(index);
            if(extended)masks.push(index);
        }
        r.align();
        for(const id of masks)readMask(r,npcs.get(id));
        if(r.remaining)throw new Error("Unexpected NPC info bytes");
        this.npcs=npcs;this.high=high;
        return npcs;
    }
}
