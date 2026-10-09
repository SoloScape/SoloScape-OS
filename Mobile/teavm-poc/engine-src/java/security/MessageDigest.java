package java.security;
import org.soloscape.teavm.platform.BrowserDigest;
/** Classlib entry point also used by unmodified Guava hashing code. */
public class MessageDigest implements Cloneable {
    private BrowserDigest digest;
    private final String algorithm;
    protected MessageDigest(String algorithm)throws NoSuchAlgorithmException{this.algorithm=algorithm;digest=BrowserDigest.getInstance(algorithm);}
    public static MessageDigest getInstance(String algorithm)throws NoSuchAlgorithmException{return new MessageDigest(algorithm);}
    public String getAlgorithm(){return algorithm;}
    public int getDigestLength(){return algorithm.replace("-","").equalsIgnoreCase("SHA1")?20:algorithm.replace("-","").equalsIgnoreCase("SHA512")?64:32;}
    public void update(byte value){digest.update(new byte[]{value});}
    public void update(byte[] bytes){digest.update(bytes);}
    public void update(byte[] bytes,int offset,int length){
        if(offset<0||length<0||offset>bytes.length-length)throw new IllegalArgumentException("Digest input range");
        digest.update(java.util.Arrays.copyOfRange(bytes,offset,offset+length));
    }
    public byte[] digest(){return digest.digest();}
    public byte[] digest(byte[] bytes){update(bytes);return digest();}
    public void reset(){digest.reset();}
    public Object clone()throws CloneNotSupportedException {
        try{MessageDigest copy=new MessageDigest(algorithm);copy.digest=digest.copy();return copy;}
        catch(NoSuchAlgorithmException error){throw new CloneNotSupportedException(error.toString());}
    }
}
