package org.soloscape.teavm.platform;
import java.io.ByteArrayOutputStream;
import java.security.NoSuchAlgorithmException;
import org.teavm.interop.*;
import org.teavm.jso.*;

/** Web Crypto or HTTP SHA-256, preserving the original Java digest contract. */
public final class BrowserDigest {
    private final String algorithm;
    private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
    private BrowserDigest(String algorithm){this.algorithm=algorithm;}
    public static BrowserDigest getInstance(String algorithm)throws NoSuchAlgorithmException {
        String normalized=algorithm.toUpperCase(java.util.Locale.ROOT).replace("SHA256","SHA-256").replace("SHA512","SHA-512").replace("SHA1","SHA-1");
        if(!normalized.equals("SHA-256")&&!normalized.equals("SHA-512")&&!normalized.equals("SHA-1"))throw new NoSuchAlgorithmException(algorithm);
        return new BrowserDigest(normalized);
    }
    public void update(byte[] input){bytes.write(input,0,input.length);}
    public void reset(){bytes.reset();}
    public BrowserDigest copy(){BrowserDigest copy=new BrowserDigest(algorithm);copy.update(bytes.toByteArray());return copy;}
    public byte[] digest(){
        byte[] input=bytes.toByteArray(),result;
        if(localAvailable(algorithm)){
            result=new byte[32];
            if(calculateLocal(input,result))yieldLocal();
        }else result=calculate(algorithm,input);
        reset();return result;
    }
    // HTTP hashes are synchronous. Avoid creating an async callback and
    // converting 32 result bytes through JSO for every original Java nonce.
    // The original solver still chooses, hashes and checks every nonce.
    @JSBody(params={"algorithm"},script="return algorithm==='SHA-256'&&!globalThis.crypto?.subtle&&typeof globalThis.soloscapeOriginalSha256==='function';")
    private static native boolean localAvailable(String algorithm);
    // Check the cooperative budget once per 256 hashes, but yield only after
    // 8 ms of work. Reset the budget AFTER resuming, excluding timer delays.
    @JSBody(params={"bytes","out"},script="const input=new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);out.set(globalThis.soloscapeOriginalSha256(input));const ticks=globalThis.soloscapeOriginalSha256Ticks=((globalThis.soloscapeOriginalSha256Ticks||0)+1);if(ticks%256!==0)return false;const now=performance.now();if(globalThis.soloscapeOriginalSha256SliceStart===undefined)globalThis.soloscapeOriginalSha256SliceStart=now;return now-globalThis.soloscapeOriginalSha256SliceStart>=8;")
    private static native boolean calculateLocal(@JSByRef byte[] bytes,@JSByRef byte[] out);
    @Async private static native void yieldLocal();
    private static void yieldLocal(AsyncCallback<Void> callback){yieldNative(()->callback.complete(null));}
    @JSFunctor private interface YieldCompletion extends JSObject {void done();}
    // A message task gives input/rendering a turn without chained timer
    // delays. Older runtimes retain the timer fallback. Close both ports.
    @JSBody(params={"done"},script="const resume=()=>{globalThis.soloscapeOriginalSha256SliceStart=performance.now();done();};if(typeof MessageChannel==='function'){const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resume();};channel.port2.postMessage(null);}else setTimeout(resume,0);")
    private static native void yieldNative(YieldCompletion done);
    @Async private static native byte[] calculate(String algorithm,byte[] bytes);
    private static void calculate(String algorithm,byte[] bytes,AsyncCallback<byte[]> callback){
        digestNative(algorithm,bytes,(data,error)->{
            if(error!=null){callback.error(new IllegalStateException(error));return;}
            byte[] output=new byte[length(data)];for(int i=0;i<output.length;i++)output[i]=(byte)at(data,i);callback.complete(output);
        });
    }
    @JSFunctor private interface Completion extends JSObject {void done(JSObject bytes,String error);}
    @JSBody(params={"algorithm","bytes","done"},script="const input=new Uint8Array(bytes);if(globalThis.crypto?.subtle){globalThis.crypto.subtle.digest(algorithm,input).then(data=>done(new Uint8Array(data),null),error=>done(null,'Web Crypto digest failed'));return;}queueMicrotask(()=>done(null,'Digest not available on HTTP LAN'));")
    private static native void digestNative(String algorithm,@JSByRef byte[] bytes,Completion done);
    @JSBody(params={"bytes"},script="return bytes.length;")private static native int length(JSObject bytes);
    @JSBody(params={"bytes","index"},script="return bytes[index];")private static native int at(JSObject bytes,int index);
}
