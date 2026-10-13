// Bounded revision-240 CS2 decoding follows pinned BSD TSPS rs/cs2/Script.ts.
// See the upstream BSD licence retained in native-interfaces.mjs.
import {ByteBuffer} from "./cache-reader.mjs";
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
import {executePureCs2} from "./cs2-pure-ops.mjs";
import {executeWidgetCs2} from "./cs2-widget-ops.mjs";

export function decodeClientScript(bytes,id){
    const r=new ByteBuffer(bytes);
    if(r.length<19)throw new Error("Truncated client script");
    r.offset=r.length-2;const switchLength=r.readUnsignedShort(),end=r.length-2-switchLength-16;
    if(end<1)throw new Error("Invalid client script footer");
    r.offset=end;
    const count=r.readInt(),localInts=r.readUnsignedShort(),localStrings=r.readUnsignedShort(),localLongs=r.readUnsignedShort(),
        intArgs=r.readUnsignedShort(),stringArgs=r.readUnsignedShort(),longArgs=r.readUnsignedShort();
    if(count<0||count>20000||Math.max(localInts,localStrings,localLongs)>256||intArgs>localInts||stringArgs>localStrings||longArgs>localLongs)
        throw new Error("Client script exceeds bounds");
    const switches=[];
    for(let n=r.readUnsignedByte();n>0;n--){
        const table=new Map(),size=r.readUnsignedShort();if(size>4096)throw new Error("Unsafe script switch");
        for(let i=0;i<size;i++)table.set(r.readInt(),r.readInt());switches.push(table);
    }
    if(r.offset!==r.length-2)throw new Error("Invalid script switch footer");
    r.offset=0;const name=r.readString(),instructions=[];
    while(r.offset<end){
        const op=r.readUnsignedShort();
        const value=op===3?r.readString():op===61?(BigInt(r.readInt())<<32n)|BigInt(r.readInt()>>>0):
            op>=100||[21,38,39,62,63].includes(op)?r.readUnsignedByte():r.readInt();
        instructions.push({op,value});
        if(instructions.length>count)throw new Error("Script instruction count mismatch");
    }
    if(r.offset!==end||instructions.length!==count)throw new Error("Script instruction count mismatch");
    return {id,name,instructions,localInts,localStrings,localLongs,intArgs,stringArgs,longArgs,switches};
}
export class NativeScripts {
    constructor(cache){this.cache=cache;this.scripts=new Map();this.varbits=new Map();}
    async varbit(id){
        if(!this.varbits.has(id)){
            const promise=(async()=>{
                const c=await verifiedCatalog(this.cache,2),ids=c.fileIdsForGroup.get(14);
                if(!ids?.includes(id))throw new Error("Missing varbit "+id);
                const bytes=unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(2,14)),ids,new Set([id]),{maxFiles:100000}).get(id);
                const r=new ByteBuffer(bytes);if(r.readUnsignedByte()!==1)throw new Error("Invalid varbit definition");
                const base=r.readUnsignedShort(),start=r.readUnsignedByte(),end=r.readUnsignedByte();
                if(start>end||end>31||r.readUnsignedByte()!==0||r.offset!==r.length)throw new Error("Invalid varbit bounds");
                return {base,start,end};
            })();this.varbits.set(id,promise);promise.catch(()=>this.varbits.delete(id));
        }
        return this.varbits.get(id);
    }
    load(id){
        if(!Number.isInteger(id)||id<0||id>65535)throw new Error("Invalid client script ID");
        if(!this.scripts.has(id)){
            if(this.scripts.size>=128)this.scripts.delete(this.scripts.keys().next().value);
            const promise=(async()=>{
                const catalog=await verifiedCatalog(this.cache,12),ids=catalog.fileIdsForGroup.get(id);
                if(!ids?.includes(0))throw new Error("Missing verified client script "+id);
                const files=unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(12,id)),ids,new Set([0]));
                return decodeClientScript(files.get(0),id);
            })();
            this.scripts.set(id,promise);promise.catch(()=>this.scripts.delete(id));
        }
        return this.scripts.get(id);
    }
}

// A dialogue-focused CS2 interpreter: actual verified bytecode drives widget
// creation, layout and labels. Unknown operations abort; never eval cache code.
export async function runWidgetScript(loader,id,args,scene,{varps=new Map(),varcs=new Map(),varcStrings=new Map(),mobile=false,
    measure=async()=>{throw new Error("Cache font measurement unavailable");},isCurrent=()=>true,
    canWrite=()=>true,maxSteps=20000}={}){
    const ints=[],strings=[],longs=[],arrays=new Map(),calls=[],targets=[null,null];let frame,steps=0,created=0;
    const pop=stack=>{if(!stack.length)throw new Error("CS2 stack underflow");return stack.pop();};
    const take=(stack,n)=>{if(n<0||n>stack.length)throw new Error("CS2 argument underflow");return stack.splice(stack.length-n,n);};
    const enter=(script,i,s,l=[])=>({script,pc:0,ints:[...i,...new Array(script.localInts-i.length).fill(0)],
        strings:[...s,...new Array(script.localStrings-s.length).fill("")],
        longs:[...l,...new Array((script.localLongs??0)-l.length).fill(0n)]});
    const first=await loader.load(id),i=args.filter(a=>typeof a==="number"),s=args.filter(a=>typeof a==="string"),
        l=args.filter(a=>typeof a==="bigint");
    if(i.length!==first.intArgs||s.length!==first.stringArgs||l.length!==(first.longArgs??0))
        throw new Error("Unsupported CS2 argument signature");
    frame=enter(first,i,s,l);
    const find=uid=>scene.widgets.get(uid>>>0);
    const write=(w,patch)=>{if(!w)throw new Error("Missing CS2 target widget");
        for(const [key,value] of Object.entries(patch))if(canWrite(w,key))w[key]=value;};
    while(frame){
        if(!isCurrent())return false;
        if(++steps>maxSteps||ints.length>1024||strings.length>1024||longs.length>1024)throw new Error("CS2 execution budget exceeded");
        const instruction=frame.script.instructions[frame.pc++];if(!instruction)throw new Error("CS2 PC outside script");
        let {op,value}=instruction;
        if(op===0)ints.push(value);
        else if(op===3)strings.push(value);
        else if(op===61)longs.push(BigInt(value));
        else if(op===62)pop(longs);
        else if(op===63)strings.push(null);
        else if(op===6)frame.pc+=value;
        else if([68,69,70,71,72,73].includes(op)){
            const [a,b]=take(longs,2),yes=op===68?a!==b:op===69?a===b:op===70?a<b:op===71?a>b:op===72?a<=b:a>=b;
            if(yes)frame.pc+=value;
        }else if([7,8,9,10,31,32].includes(op)){
            const [a,b]=take(ints,2),yes=op===7?a!==b:op===8?a===b:op===9?a<b:op===10?a>b:op===31?a<=b:a>=b;
            if(yes)frame.pc+=value;
        }else if(op===21)frame=calls.pop()??null;
        else if(op===33||op===35){const locals=op===33?frame.ints:frame.strings;if(value>=locals.length||value<0)throw new Error("Invalid CS2 local");(op===33?ints:strings).push(locals[value]);}
        else if(op===34||op===36){const locals=op===34?frame.ints:frame.strings;if(value>=locals.length||value<0)throw new Error("Invalid CS2 local");locals[value]=pop(op===34?ints:strings);}
        else if(op===66||op===67){
            if(value<0||value>=frame.longs.length)throw new Error("Invalid CS2 long local");
            if(op===66)longs.push(frame.longs[value]);else frame.longs[value]=pop(longs);
        }
        else if(op===37)strings.push(take(strings,value).join(""));
        else if(op===38||op===39)pop(op===38?ints:strings);
        else if(op===40){
            if(calls.length>=64)throw new Error("CS2 call depth exceeded");
            const next=await loader.load(value);
            calls.push(frame);frame=enter(next,take(ints,next.intArgs),take(strings,next.stringArgs),take(longs,next.longArgs??0));
        }else if(op===1)ints.push(varps.get(value)??0);
        else if(op===2)varps.set(value,pop(ints));
        else if(op===25||op===27){
            const b=await loader.varbit(value),width=b.end-b.start+1;
            if(width<1||width>32)throw new Error("Invalid CS2 varbit bounds");
            const mask=width===32?0xffffffff:2**width-1;
            if(op===25)ints.push(((varps.get(b.base)??0)>>>b.start)&mask);
            else{
                const next=pop(ints);
                if(next<0||next>mask)throw new Error("CS2 varbit value outside bounds");
                const old=varps.get(b.base)??0;
                varps.set(b.base,((old&~(mask<<b.start))|((next&mask)<<b.start))|0);
            }
        }
        else if(op===42)ints.push(varcs.get(value)??0);
        else if(op===43)varcs.set(value,pop(ints));
        else if(op===44){
            const slot=value>>>16,type=value&65535,length=pop(ints);
            if(slot>4||length<0||length>5000)throw new Error("CS2 array bounds");
            arrays.set(slot,new Array(length).fill(type===105?0:-1));
        }else if(op===45||op===46){
            const array=arrays.get(value);
            if(!array)throw new Error("Undefined CS2 array");
            if(op===45){const index=pop(ints);if(index<0||index>=array.length)throw new Error("CS2 array index");ints.push(array[index]);}
            else{const [index,item]=take(ints,2);if(index<0||index>=array.length)throw new Error("CS2 array index");array[index]=item;}
        }
        else if(op===49)strings.push(varcStrings.get(value)??"");
        else if(op===50)varcStrings.set(value,pop(strings));
        else if(op===60){const jump=frame.script.switches[value]?.get(pop(ints));if(jump!==undefined)frame.pc+=jump;}
        else if(executePureCs2(op,ints,strings,pop,take,{gender:scene.playerGender})){}
        else if(op===4108||op===4109){const [width,font]=take(ints,2),text=pop(strings);ints.push(await measure(font,text,width,op===4108));}
        else if(op===6518)ints.push(Number(mobile));
        else if(op===6519)ints.push(0); // Native browser uses desktop wire protocol.
        else if(op===100){
            const [uid,type,index,nested]=take(ints,4),parent=find(uid);
            if(!parent||nested||index<0||index>=128||![0,3,4,5,6,9].includes(type)||++created>256)throw new Error("Unsupported dynamic CS2 widget");
            parent.dynamicChildren??=[];
            const w={uid:uid>>>0,parentUid:uid>>>0,groupId:parent.groupId,childIndex:index,type,isIf3:true,
                rawX:0,rawY:0,rawWidth:0,rawHeight:0,color:0,text:"",fontId:-1,spriteId:-1,hidden:false,flags:0,actions:[],listeners:[]};
            parent.dynamicChildren[index]=w;targets[value===1?1:0]=w;
        }else if(op===101){
            const w=targets[value===1?1:0],parent=w&&find(w.parentUid);
            if(!parent||w.childIndex===undefined)throw new Error("Missing CS2 dynamic child");
            if(parent.dynamicChildren?.[w.childIndex]===w)parent.dynamicChildren[w.childIndex]=null;
            targets[value===1?1:0]=null;
        }else if(op===102){const parent=find(pop(ints));if(!parent)throw new Error("Missing CS2 parent");parent.dynamicChildren=[];}
        else if(op===200){const [uid,index]=take(ints,2),parent=find(uid),w=index===-1?parent:parent?.dynamicChildren?.[index];targets[value===1?1:0]=w;ints.push(Number(Boolean(w)));}
        else if(op===201){const w=find(pop(ints));targets[value===1?1:0]=w;ints.push(Number(Boolean(w)));}
        else {
            let w;if(op>=2000&&op<3000){w=find(pop(ints));op-=1000;}else w=targets[value===1?1:0];
            if(executeWidgetCs2(op,w,ints,strings,pop,take,write)){}
            else if([1403,1404,1419].includes(op)){
                const signature=pop(strings);if(!/^[is]*$/.test(signature)||signature.length>64)throw new Error("Unsupported widget listener signature");
                const listener=new Array(signature.length+1);
                for(let n=signature.length;n>0;n--)listener[n]=pop(signature[n-1]==="s"?strings:ints);
                listener[0]=pop(ints);write(w,{[op===1403?"onMouseOver":op===1404?"onMouseLeave":"onKey"]:listener});
            }else throw new Error("Unsupported CS2 opcode "+op);
        }
    }
    return true;
}
