// Revision 240 desktop login, pinned rsprot 1.0.0-ALPHA-20260912.
// Wire layouts adapted from rsprot; see ../licenses/rsprot-MIT.txt.
import {validateSeed,validateRsaPublicKey,rsaEncrypt,xteaEncrypt} from "./login-crypto.mjs";

export const LOGIN_REVISION=240;
const CP1252="€\u0000‚ƒ„…†‡ˆ‰Š‹Œ\u0000Ž\u0000\u0000‘’“”•–—˜™š›œ\u0000žŸ";
export function loginString(value,max,name){
    if(typeof value!=="string"||!value.length||value.length>max)throw new Error("Invalid "+name+" length");
    const bytes=[];
    for(const ch of value){
        const code=ch.codePointAt(0),extended=CP1252.indexOf(ch);
        if(code>0&&code<128||code>=160&&code<=255)bytes.push(code);
        else if(extended>=0&&ch!=="\u0000")bytes.push(128+extended);
        else throw new Error(name+" contains unsupported characters");
    }
    bytes.push(0);return Uint8Array.from(bytes);
}
class Writer {
    constructor(){this.values=[];}
    u8(n){this.values.push(n&255);return this;}
    u16(n){return this.u8(n>>>8).u8(n);}
    u32(n,order="be"){
        for(const shift of {be:[24,16,8,0],le:[0,8,16,24],me:[8,0,24,16],ime:[16,24,0,8]}[order])this.u8(n>>>shift);
        return this;
    }
    bytes(bytes){for(const b of bytes)this.u8(b);return this;}
    emptyString2(){return this.u16(0);}
    finish(){return Uint8Array.from(this.values);}
}
const CRC_LAYOUT=[[20,"ime"],[0,"me"],[8,"ime"],[1,"le"],[13,"le"],[15,"ime"],[17,"le"],
    [9,"ime"],[18,"ime"],[5,"be"],[7,"le"],[16,"le"],[19,"be"],[3,"le"],[12,"le"],
    [14,"le"],[6,"le"],[21,"ime"],[2,"le"],[4,"be"],[22,"me"],[11,"be"],[10,"me"]];

export function loginCacheCrcs(master){
    if(!Array.isArray(master)||master.length<23)throw new Error("Revision-240 login requires cache indices 0–22");
    return master.slice(0,23).map((entry,index)=>{
        if(entry?.archive!==index||!Number.isInteger(entry.crc)||entry.crc<0||entry.crc>0xffffffff)
            throw new Error("Invalid login cache manifest");
        return entry.crc;
    });
}

export function encodeLogin({revision=LOGIN_REVISION,username,password,otp="",sessionId,seed,uuid,rsa,crcs,width=765,height=503}){
    if(revision!==LOGIN_REVISION)throw new Error("Native login requires revision 240");
    validateSeed(seed);validateRsaPublicKey(rsa);
    if(!(sessionId instanceof Uint8Array)||sessionId.length!==8)throw new Error("Invalid native session ID");
    if(!(uuid instanceof Uint8Array)||uuid.length!==24)throw new Error("Invalid client identifier");
    if(!crcs||crcs.length!==23||!Array.from(crcs).every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff))
        throw new Error("Expected 23 cache CRCs");
    if(!Number.isInteger(width)||width<1||width>65535||!Number.isInteger(height)||height<1||height>65535)
        throw new Error("Invalid viewport dimensions");
    const name=loginString(username.trim(),320,"Username"),pass=loginString(password,80,"Password");
    if(typeof otp!=="string"||otp!==""&&!/^\d{6}$/.test(otp))throw new Error("Authenticator code must be six digits");
    const auth=new Writer().u8(1);
    for(const word of seed)auth.u32(word);
    auth.bytes(sessionId);
    if(otp){const code=Number(otp);auth.u8(3).u8(code>>>16).u8(code>>>8).u8(code).u8(0);}
    else auth.u8(2).u32(0);
    auth.u8(0).bytes(pass);
    const plainRsa=auth.finish();let encryptedRsa;
    try{encryptedRsa=rsaEncrypt(plainRsa,rsa);}finally{plainRsa.fill(0);auth.values.fill(0);pass.fill(0);}
    const body=new Writer().bytes(name).u8(2).u16(width).u16(height).bytes(uuid).u8(0).u32(0).u8(0);
    // HostPlatformStats v9: browser has no Java/native hardware data. Keep fields neutral.
    body.u8(9).u8(0).u8(0).u16(0).u8(0).u8(0).u8(0).u8(0).u8(1).u16(0).u8(0)
        .u8(0).u16(0).u16(0);
    for(let i=0;i<4;i++)body.emptyString2();
    body.u8(0).u16(0).emptyString2().emptyString2().u8(0).u8(0);
    for(let i=0;i<4;i++)body.u32(0);
    body.emptyString2().emptyString2().u8(0).u32(0); // deprecated client type, reflection constant
    for(const [index,order] of CRC_LAYOUT)body.u32(crcs[index],order);
    const plainBody=body.finish(),encryptedBody=xteaEncrypt(plainBody,seed);
    plainBody.fill(0);body.values.fill(0);name.fill(0);
    const payload=new Writer().u32(revision).u32(1).u32(0).u8(1).u8(0).u8(0)
        .u16(encryptedRsa.length).bytes(encryptedRsa).bytes(encryptedBody).finish();
    return new Writer().u8(16).u16(payload.length).bytes(payload).finish();
}

export function decodeLoginSuccess(bytes,cipher){
    if(bytes.length!==34||bytes[0]>1||bytes[6]>1||bytes[9]>1)throw new Error("Malformed native login success");
    // Authenticator token consumes four cipher words only when the flag is set.
    // No trusted-computer token is persisted by this client.
    if(bytes[0])for(let i=1;i<=4;i++)cipher.nextInt();
    const playerIndex=(bytes[7]<<8)|bytes[8];
    if(playerIndex<1||playerIndex>2047)throw new Error("Invalid local player index");
    return {playerIndex,staffModLevel:bytes[5],playerMod:bytes[6]===1,member:bytes[9]===1};
}

const LOGIN_ERRORS=new Map([[3,"Invalid username or password"],[4,"Account banned"],[5,"Account already logged in"],
    [6,"Client out of date"],[7,"World full"],[8,"Login server offline"],[9,"Connection limit reached"],
    [10,"Session ID rejected"],[14,"Server update in progress"],[16,"Too many login attempts"],[18,"Account locked"],
    [22,"Invalid login packet"],[23,"Login server did not reply"],[24,"Account could not be loaded"],
    [56,"Authenticator code required"],[57,"Invalid authenticator code"],[68,"Client out of date; reload"],
    [65,"Login proof of work rejected"]]);
export class NativeLoginError extends Error {
    constructor(code){super(LOGIN_ERRORS.get(code)??"Native login rejected (code "+code+")");this.code=code;}
}
