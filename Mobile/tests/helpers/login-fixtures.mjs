import {generateKeyPairSync,privateDecrypt,constants} from "node:crypto";

export function fixtureKey(){
    const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:1024});
    const jwk=publicKey.export({format:"jwk"});
    return {privateKey,rsa:{exponent:Buffer.from(jwk.e,"base64url").toString("hex"),modulus:Buffer.from(jwk.n,"base64url").toString("hex")}};
}
// Independent Node RSA and a small fixture-only XTEA decoder for gateway assertions.
export function decodeFixtureLogin(packet,privateKey){
    if(packet[0]!==16||packet.readUInt16BE(1)!==packet.length-3)throw new Error("Wrong fixture login frame");
    if(packet.readUInt32BE(3)!==240)throw new Error("Wrong fixture revision");
    const size=packet.readUInt16BE(18),encrypted=packet.subarray(20,20+size),rsa=Buffer.alloc(128);
    rsa.set(encrypted.subarray(-128),128-Math.min(128,encrypted.length));
    const decrypted=privateDecrypt({key:privateKey,padding:constants.RSA_NO_PADDING},rsa);
    const start=decrypted.findIndex(n=>n!==0),auth=decrypted.subarray(start);
    if(auth[0]!==1)throw new Error("Wrong fixture RSA check");
    const seed=Array.from({length:4},(_,i)=>auth.readInt32BE(1+i*4)),body=Buffer.from(packet.subarray(20+size));
    for(let at=0;at+8<=body.length;at+=8){
        let a=body.readInt32BE(at),b=body.readInt32BE(at+4),sum=0xc6ef3720|0;
        for(let r=0;r<32;r++){
            b=(b-((((a<<4)^(a>>>5))+a)^(sum+seed[(sum>>>11)&3])))|0;
            sum=(sum-0x9e3779b9)|0;
            a=(a-((((b<<4)^(b>>>5))+b)^(sum+seed[sum&3])))|0;
        }
        body.writeInt32BE(a,at);body.writeInt32BE(b,at+4);
    }
    return {seed,sessionId:auth.subarray(17,25),password:auth.subarray(31,auth.indexOf(0,31)).toString("latin1"),
        username:body.subarray(0,body.indexOf(0)).toString("latin1")};
}
