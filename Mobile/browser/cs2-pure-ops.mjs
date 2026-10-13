// Pure revision-240 CS2 math/string operations. Stack order follows the pinned
// OpenOSRS gamepack and the BSD-2-Clause TSPS opcode reference.
// Unknown opcodes are NOT silently treated as successful.
const int32 = n => n | 0;
const signed = n => BigInt.asIntN(32, n);
const validRange = (low, high) => {
    if(low < 0 || high > 31 || high < low) throw new Error("Invalid CS2 bit range");
    return ((1n << BigInt(high-low+1)) - 1n) << BigInt(low);
};
const div = (a,b) => {if(b===0)throw new Error("CS2 division by zero");return int32(a/b);};
const isAlpha = n => n>=65&&n<=90||n>=97&&n<=122;
const isNumber = n => n>=48&&n<=57;
const popcount = value => {let n=value>>>0,c=0;while(n){n&=n-1;c++;}return c;};
const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Returns false for an unsupported opcode; caller retains state-machine ownership.
export function executePureCs2(op,ints,strings,pop,take,{random=Math.random,gender}={}){
    const unary=fn=>ints.push(int32(fn(pop(ints))));
    const binary=fn=>{const [a,b]=take(ints,2);ints.push(int32(fn(a,b)));};
    switch(op){
        case 4000:binary((a,b)=>a+b);break;
        case 4001:binary((a,b)=>a-b);break;
        case 4002:binary((a,b)=>Math.imul(a,b));break;
        case 4003:binary(div);break;
        case 4004:unary(a=>Math.floor(random()*a));break;
        case 4005:unary(a=>Math.floor(random()*(a+1)));break;
        case 4006:{const [a,b,c,d,e]=take(ints,5);ints.push(int32(a+div(Math.imul(b-a,e-c),d-c)));break;}
        case 4007:binary((a,b)=>a+int32(a*b/100));break;
        case 4008:binary((a,b)=>a|(1<<b));break;
        case 4009:binary((a,b)=>a&~(1<<b));break;
        case 4010:binary((a,b)=>(a&(1<<b))!==0?1:0);break;
        case 4011:binary((a,b)=>{if(!b)throw new Error("CS2 modulo by zero");return a%b;});break;
        case 4012:binary((a,b)=>Math.pow(a,b));break;
        case 4013:binary((a,b)=>a===0?0:b===0?2147483647:b===1?a:b===2?Math.sqrt(a):b===3?Math.cbrt(a):b===4?Math.sqrt(Math.sqrt(a)):Math.pow(a,1/b));break;
        case 4014:binary((a,b)=>a&b);break;
        case 4015:binary((a,b)=>a|b);break;
        case 4016:binary(Math.min);break;
        case 4017:binary(Math.max);break;
        case 4018:{const [a,b,c]=take(ints,3);if(b===0)throw new Error("CS2 scale by zero");
            ints.push(Number(signed(BigInt.asIntN(64,(BigInt(c)*BigInt(a))/BigInt(b)))));break;}
        case 4025:unary(popcount);break;
        case 4026:binary((a,b)=>a^(1<<b));break;
        case 4027:
        case 4028:
        case 4029:{const [a,low,high]=take(ints,3),mask=validRange(low,high),value=BigInt(a>>>0);
            ints.push(Number(signed(op===4027?(value|mask):op===4028?(value&~mask):((value&mask)>>BigInt(low)))));break;}
        case 4030:{const [a,b,low,high]=take(ints,4),mask=validRange(low,high);
            const limit=(1n<<BigInt(high-low+1))-1n,insert=BigInt(Math.max(0,Math.min(b,Number(limit))));
            ints.push(Number(signed((BigInt(a>>>0)&~mask)|(insert<<BigInt(low)))));break;}
        case 4032:unary(a=>Math.sin((a&16383)*Math.PI/8192)*16384);break;
        case 4033:unary(a=>Math.cos((a&16383)*Math.PI/8192)*16384);break;
        case 4034:binary((a,b)=>Math.round(Math.atan2(a,b)*8192/Math.PI)&16383);break;
        case 4035:unary(Math.abs);break;
        case 4036:{const s=pop(strings);const n=/^-?\d+$/.test(s.trim())?Number(s):NaN;
            ints.push(Number.isInteger(n)&&n>=-2147483648&&n<=2147483647?n:-1);break;}
        case 4100:strings.push(pop(strings)+pop(ints));break;
        case 4101:{const [a,b]=take(strings,2);strings.push(a+b);break;}
        case 4102:{const n=pop(ints);strings.push(pop(strings)+(n>=0?"+":"")+n);break;}
        case 4103:strings.push(pop(strings).toLowerCase());break;
        case 4104:{const n=pop(ints),date=new Date((11745+n)*86400000);
            if(!Number.isFinite(date.getTime()))throw new Error("Invalid CS2 date");
            strings.push(date.getUTCDate()+"-"+months[date.getUTCMonth()]+"-"+date.getUTCFullYear());break;}
        case 4105:{const [a,b]=take(strings,2);if(gender===undefined)throw new Error("CS2 player gender unavailable");
            strings.push(gender===0?a:b);break;}
        case 4106:strings.push(String(pop(ints)));break;
        case 4107:{const [a,b]=take(strings,2);ints.push(a===b?0:a<b?-1:1);break;}
        case 4110:{const choice=pop(ints),[a,b]=take(strings,2);strings.push(choice===1?a:b);break;}
        case 4111:strings.push(pop(strings).replace(/</g,"&lt;").replace(/>/g,"&gt;"));break;
        case 4112:strings.push(pop(strings)+String.fromCharCode(pop(ints)));break;
        case 4113:unary(n=>Number(n>=32&&n<=126||n>=160&&n<=255||[0x20ac,0x152,0x153,0x178,0x2014].includes(n)));break;
        case 4114:unary(n=>Number(isAlpha(n)||isNumber(n)));break;
        case 4115:unary(n=>Number(isAlpha(n)));break;
        case 4116:unary(n=>Number(isNumber(n)));break;
        case 4117:ints.push(pop(strings).length);break;
        case 4118:{const [start,end]=take(ints,2),s=pop(strings);
            if(start<0||end<start||end>s.length)throw new Error("CS2 substring bounds");
            strings.push(s.slice(start,end));break;}
        case 4119:strings.push(pop(strings).replace(/<[^>]*>/g,""));break;
        case 4120:ints.push(pop(strings).indexOf(String.fromCharCode(pop(ints))));break;
        case 4121:{const from=pop(ints),[str,needle]=take(strings,2);ints.push(str.indexOf(needle,from));break;}
        case 4122:strings.push(pop(strings).toUpperCase());break;
        default:return false;
    }
    return true;
}
