// Native OSRS uses raw RSA (Java BigInteger), XTEA and ISAAC, not WebCrypto RSA padding.
// ISAAC adapted from rsprot/OpenRS2; see ../licenses/rsprot-MIT.txt.
export function validateSeed(seed){
    if(!seed||seed.length!==4||!Array.from(seed).every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=4294967295))
        throw new Error("Expected four 32-bit cipher seed words");
}

export function validateRsaPublicKey({exponent,modulus}={}){
    if(typeof exponent!=="string"||typeof modulus!=="string"||
        !/^[0-9a-f]{1,8}$/i.test(exponent)||!/^[0-9a-f]{256,1024}$/i.test(modulus))
        throw new Error("Invalid native RSA public key (hexadecimal, 1024–4096 bits)");
    const e=BigInt("0x"+exponent),n=BigInt("0x"+modulus);
    if(e<3n||!(e&1n)||!(n&1n)||n.toString(2).length<1024)
        throw new Error("Invalid native RSA public key");
    return {e,n};
}

export function rsaEncrypt(bytes,key){
    const {e,n}=validateRsaPublicKey(key);
    if(!(bytes instanceof Uint8Array)||!bytes.length||bytes[0]!==1)throw new Error("Invalid native RSA block");
    let base=0n;for(const b of bytes)base=(base<<8n)|BigInt(b);
    if(base>=n)throw new Error("Native RSA block exceeds key modulus");
    let power=e,result=1n;
    while(power){if(power&1n)result=result*base%n;base=base*base%n;power>>=1n;}
    let hex=result.toString(16);if(hex.length&1)hex="0"+hex;
    // Java BigInteger(byte[]) is signed: retain a leading zero for positive ciphertext.
    if(parseInt(hex.slice(0,2),16)&128)hex="00"+hex;
    return Uint8Array.from(hex.match(/../g),b=>parseInt(b,16));
}

export function xteaEncrypt(bytes,seed){
    validateSeed(seed);
    const out=bytes.slice(),view=new DataView(out.buffer,out.byteOffset,out.byteLength),delta=0x9e3779b9;
    // Native login encrypts complete blocks; the final incomplete block is unchanged.
    for(let at=0;at+8<=out.length;at+=8){
        let a=view.getInt32(at),b=view.getInt32(at+4),sum=0;
        for(let round=0;round<32;round++){
            a=(a+((((b<<4)^(b>>>5))+b)^(sum+seed[sum&3])))|0;
            sum=(sum+delta)|0;
            b=(b+((((a<<4)^(a>>>5))+a)^(sum+seed[(sum>>>11)&3])))|0;
        }
        view.setInt32(at,a);view.setInt32(at+4,b);
    }
    return out;
}

export class IsaacCipher {
    constructor(seed){
        validateSeed(seed);
        this.results=new Int32Array(256);this.results.set(seed);
        this.memory=new Int32Array(256);this.a=0;this.b=0;this.c=0;
        const words=new Int32Array(8).fill(0x9e3779b9);
        const mix=()=>{
            words[0]^=words[1]<<11;words[3]+=words[0];words[1]+=words[2];
            words[1]^=words[2]>>>2;words[4]+=words[1];words[2]+=words[3];
            words[2]^=words[3]<<8;words[5]+=words[2];words[3]+=words[4];
            words[3]^=words[4]>>>16;words[6]+=words[3];words[4]+=words[5];
            words[4]^=words[5]<<10;words[7]+=words[4];words[5]+=words[6];
            words[5]^=words[6]>>>4;words[0]+=words[5];words[6]+=words[7];
            words[6]^=words[7]<<8;words[1]+=words[6];words[7]+=words[0];
            words[7]^=words[0]>>>9;words[2]+=words[7];words[0]+=words[1];
        };
        for(let i=0;i<4;i++)mix();
        for(const source of [this.results,this.memory])for(let i=0;i<256;i+=8){
            for(let k=0;k<8;k++)words[k]+=source[i+k];
            mix();this.memory.set(words,i);
        }
        words.fill(0);this.generate();this.count=256;
    }
    generate(){
        this.c=(this.c+1)|0;this.b=(this.b+this.c)|0;
        for(let i=0;i<256;i++){
            const x=this.memory[i];
            switch(i&3){
                case 0:this.a^=this.a<<13;break;
                case 1:this.a^=this.a>>>6;break;
                case 2:this.a^=this.a<<2;break;
                case 3:this.a^=this.a>>>16;break;
            }
            this.a=(this.a+this.memory[(i+128)&255])|0;
            const y=(this.memory[(x>>>2)&255]+this.a+this.b)|0;
            this.memory[i]=y;this.b=(this.memory[(y>>>10)&255]+x)|0;this.results[i]=this.b;
        }
    }
    nextInt(){if(!this.count){this.generate();this.count=256;}return this.results[--this.count];}
    clear(){this.results.fill(0);this.memory.fill(0);this.a=this.b=this.c=this.count=0;}
}
