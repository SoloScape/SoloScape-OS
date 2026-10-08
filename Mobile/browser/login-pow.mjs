// rsprot SHA-256 hashcash challenge. See ../licenses/rsprot-MIT.txt.
export function decodeProofOfWork(bytes){
    if(bytes.length<4||bytes.length>512||bytes[0]!==0||bytes[1]!==1||bytes[2]>22||bytes.at(-1)!==0||bytes.slice(3,-1).includes(0))
        throw new Error("Unsupported native login proof of work");
    return {version:bytes[1],difficulty:bytes[2],salt:new TextDecoder("utf-8",{fatal:true}).decode(bytes.slice(3,-1))};
}
function leadingZeros(hash){
    let bits=0;for(const n of new Uint8Array(hash)){if(!n){bits+=8;continue;}return bits+Math.clz32(n)-24;}return bits;
}
export async function solveProofOfWork(challenge,{signal,timeoutMs=45000}={}){
    const {version,difficulty,salt}=decodeProofOfWork(challenge);
    const base=version.toString(16)+difficulty.toString(16)+salt,encoder=new TextEncoder(),started=Date.now();
    // Bounded batches use WebCrypto off the UI thread. Abort and timeout are checked between batches.
    for(let start=0;start<2**24;start+=64){
        if(signal?.aborted)throw new Error("Native login cancelled");
        if(Date.now()-started>timeoutMs)throw new Error("Login proof of work timed out");
        const hashes=await Promise.all(Array.from({length:64},(_,i)=>
            crypto.subtle.digest("SHA-256",encoder.encode(base+(start+i).toString(16)))));
        const index=hashes.findIndex(hash=>leadingZeros(hash)>=difficulty);
        if(index>=0)return BigInt(start+index);
    }
    throw new Error("Login proof of work limit exceeded");
}
export function encodeProofOfWorkReply(solution){
    const bytes=new Uint8Array(11);bytes.set([19,0,8]);new DataView(bytes.buffer).setBigUint64(3,solution);return bytes;
}
