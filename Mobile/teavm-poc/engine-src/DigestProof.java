import org.soloscape.teavm.platform.BrowserDigest;
import org.teavm.jso.JSBody;
import org.teavm.jso.JSExport;

/** Synthetic public hash workload only. Not reachable from EngineBridge. */
public final class DigestProof {
    public static void main(String[] args) {}
    @JSExport public static void verify() {
        new Thread(()->{
            try {
                StringBuilder salt=new StringBuilder("18");
                for(int i=0;i<990;i++)salt.append('a');
                String prefix=salt.toString();
                byte[] combined=new byte[32];
                BrowserDigest digest=BrowserDigest.getInstance("SHA-256");
                for(int i=0;i<20000;i++) {
                    digest.update((prefix+Integer.toHexString(i)).getBytes("UTF-8"));
                    byte[] hash=digest.digest();
                    if(hash.length!=32)throw new AssertionError("Hash length");
                    for(int j=0;j<32;j++)combined[j]^=hash[j];
                }
                StringBuilder result=new StringBuilder();
                for(byte value:combined){String part=Integer.toHexString(value&255);if(part.length()==1)result.append('0');result.append(part);}
                finished(result.toString());
            }catch(Throwable error){finished("FAIL");}
        }).start();
    }
    @JSBody(params={"value"},script="globalThis.soloscapeDigestProofResult=value;")
    private static native void finished(String value);
}
