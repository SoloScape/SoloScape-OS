package org.soloscape.teavm.platform;
import java.io.ByteArrayOutputStream;
import java.security.NoSuchAlgorithmException;
import org.teavm.interop.*;
import org.teavm.jso.*;

/** Secure-context Web Crypto, awaited through TeaVM's coroutine bridge. */
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
    public byte[] digest(){byte[] result=calculate(algorithm,bytes.toByteArray());reset();return result;}
    @Async private static native byte[] calculate(String algorithm,byte[] bytes);
    private static void calculate(String algorithm,byte[] bytes,AsyncCallback<byte[]> callback){
        digestNative(algorithm,bytes,(data,error)->{
            if(error!=null){callback.error(new IllegalStateException(error));return;}
            byte[] output=new byte[length(data)];for(int i=0;i<output.length;i++)output[i]=(byte)at(data,i);callback.complete(output);
        });
    }
    @JSFunctor private interface Completion extends JSObject {void done(JSObject bytes,String error);}
    @JSBody(params={"algorithm","bytes","done"},script="if(!globalThis.crypto?.subtle){done(null,'Web Crypto requires a secure context');return;}crypto.subtle.digest(algorithm,new Uint8Array(bytes)).then(data=>done(new Uint8Array(data),null),error=>done(null,String(error)));")
    private static native void digestNative(String algorithm,@JSByRef byte[] bytes,Completion done);
    @JSBody(params={"bytes"},script="return bytes.length;")private static native int length(JSObject bytes);
    @JSBody(params={"bytes","index"},script="return bytes[index];")private static native int at(JSObject bytes,int index);
}
