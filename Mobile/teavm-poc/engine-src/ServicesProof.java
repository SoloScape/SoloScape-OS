import java.io.*;import java.util.*;import java.net.URL;
import org.soloscape.teavm.platform.*;
import org.soloscape.teavm.platform.fs.BrowserStorage;
import org.soloscape.teavm.platform.net.BrowserHttp;
import org.soloscape.teavm.platform.audio.*;
import org.teavm.jso.*;

public final class ServicesProof {
    public static final class ReflectionTarget {public static int value=3;public static int sum(int number,String text){return number+text.length();}}
    public static void main(String[] args){}
    private static void check(boolean value,String name){if(!value)throw new AssertionError(name);}
    private static byte[] hex(String text){byte[] bytes=new byte[text.length()/2];for(int i=0;i<bytes.length;i++)bytes[i]=(byte)Integer.parseInt(text.substring(i*2,i*2+2),16);return bytes;}
    private static String hex(byte[] bytes){StringBuilder text=new StringBuilder();for(byte b:bytes){String part=Integer.toHexString(b&255);if(part.length()==1)text.append('0');text.append(part);}return text.toString();}
    @JSExport public static void verify(String root,String image,String serialization){
        new Thread(()->{try{run(root,hex(image),hex(serialization));done("PASS");}catch(Throwable error){done(error.toString());}}).start();
    }
    private static void run(String root,byte[] image,byte[] serialized)throws Exception{
        org.json.JSONObject json=new org.json.JSONObject("{\"ok\":true,\"n\":9007199254740993,\"a\":[1.25]}");
        check(json.getBoolean("ok")&&json.getLong("n")==9007199254740993L&&json.getJSONArray("a").optDouble(0,0)==1.25,"JSON values and integer precision");
        check(new java.security.SecureRandom().getAlgorithm().equals("NativePRNG"),"browser secure entropy");
        byte[] abc="abc".getBytes("UTF-8");BrowserDigest digest=BrowserDigest.getInstance("SHA-256");digest.update(abc);
        String hash="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
        check(hex(digest.digest()).equals(hash),"Web Crypto SHA-256");
        check(com.google.common.hash.Hashing.sha256().hashBytes(abc).toString().equals(hash),"unmodified Guava SHA-256");
        java.security.MessageDigest ranged=java.security.MessageDigest.getInstance("SHA-256");
        try{ranged.update(abc,2,2);throw new AssertionError("Digest range padded instead of rejected");}catch(IllegalArgumentException expected){}
        ranged.update(abc,0,3);check(hex(ranged.digest()).equals(hash),"digest range rejection preserves state");
        Object[] values=(Object[])new BrowserObjectInputStream(new ByteArrayInputStream(serialized)).readObject();
        check(values[0].equals("\u0000\ud83d\udc08")&&values[0]==values[1]&&(Integer)values[2]==-17&&(Long)values[3]==Long.MIN_VALUE&&((int[])values[4])[1]==-2&&(Boolean)values[5]&&values[6]==null,"JVM serialized payload");
        java.lang.reflect.Field field=Class.forName("ServicesProof$ReflectionTarget").getDeclaredField("value");
        BrowserDiagnostics.setInt(field,null,11);check(BrowserDiagnostics.getInt(field,null)==11,"reflected int field");
        java.lang.reflect.Method method=ReflectionTarget.class.getDeclaredMethod("sum",int.class,String.class);
        check((Integer)method.invoke(null,7,"abc")==10,"reflected method invocation");
        BrowserStorage.mount();
        org.soloscape.teavm.platform.fs.File file=new org.soloscape.teavm.platform.fs.File("/home/soloscape/proof.bin");
        org.soloscape.teavm.platform.fs.RandomAccessFile output=new org.soloscape.teavm.platform.fs.RandomAccessFile(file,"rw");
        output.seek(0);output.write(new byte[]{1,2},0,2);output.seek(4);output.write(9);output.getFD().sync();output.close();
        BrowserStorage.mount();org.soloscape.teavm.platform.fs.RandomAccessFile input=new org.soloscape.teavm.platform.fs.RandomAccessFile(file,"r");
        check(input.length()==5&&input.read()==1&&input.read()==2&&input.read()==0&&input.read()==0&&input.read()==9&&input.read()==-1,"IndexedDB random-access persistence");input.close();
        output=new org.soloscape.teavm.platform.fs.RandomAccessFile(file,"rw");output.seek(100);output.write(new byte[0],0,0);check(output.length()==5,"empty writes preserve file length");output.close();
        check(file.delete(),"sandbox deletion");BrowserStorage.sync();BrowserStorage.mount();check(!file.exists(),"persistent deletion");
        org.soloscape.teavm.platform.net.HttpsURLConnection request=(org.soloscape.teavm.platform.net.HttpsURLConnection)BrowserHttp.open(new URL(root+"/echo"));
        request.setRequestMethod("POST");request.setDoOutput(true);request.setConnectTimeout(3000);request.getOutputStream().write(abc);
        check(request.getResponseCode()==201&&request.getInputStream().read()==97,"Fetch status and request body");
        org.soloscape.teavm.platform.net.HttpsURLConnection failure=(org.soloscape.teavm.platform.net.HttpsURLConnection)BrowserHttp.open(new URL(root+"/missing"));
        check(failure.getResponseCode()==404&&failure.getErrorStream().read()==101,"Fetch error response");
        org.soloscape.teavm.platform.net.Socket.configure("proof",43594,root.replace("http://","ws://")+"/socket");
        org.soloscape.teavm.platform.net.Socket socket=new org.soloscape.teavm.platform.net.Socket(org.soloscape.teavm.platform.net.InetAddress.getByName("proof"),43594);
        socket.setSoTimeout(20);try{socket.getInputStream().read();throw new AssertionError("Socket read timeout ignored");}catch(IOException expected){}
        socket.setSoTimeout(2000);socket.getOutputStream().write(new byte[]{14,0,(byte)255});byte[] echoed=new byte[3];new DataInputStream(socket.getInputStream()).readFully(echoed);
        check(Arrays.equals(echoed,new byte[]{14,0,(byte)255}),"WebSocket byte-stream echo");socket.close();
        try{socket.getOutputStream();throw new AssertionError("Closed socket accepted writes");}catch(IOException expected){}
        org.soloscape.teavm.platform.awt.image.BufferedImage decoded=BrowserImageIO.read(new ByteArrayInputStream(image));
        check(decoded.getWidth()==2&&decoded.getHeight()==1&&decoded.pixelData()[0]==0xffff0000&&decoded.pixelData()[1]==0xff00ff00,"browser PNG decode ARGB");
        check(BrowserImageIO.read(new ByteArrayInputStream(new byte[]{1,2,3}))==null,"unknown image format");
        try{BrowserImageIO.read(new ByteArrayInputStream(Arrays.copyOf(image,16)));throw new AssertionError("Truncated image accepted");}catch(IOException expected){}
        AudioFormat format=new AudioFormat(22050,16,1,true,false);SourceDataLine line=(SourceDataLine)AudioSystem.getLine(new DataLine.Info(SourceDataLine.class,format,4096));
        line.open();line.start();byte[] pcm={0,0,0,(byte)128,(byte)255,127};check(line.write(pcm,0,pcm.length)==pcm.length&&audioSamples(),"signed PCM Web Audio conversion");line.flush();line.close();
    }
    @JSBody(script="const p=globalThis.soloscapeAudioLastPCM;return p?.length===3&&p[0]===0&&p[1]===-1&&p[2]===32767/32768;")private static native boolean audioSamples();
    @JSBody(params={"result"},script="globalThis.soloscapeServicesResult=result;")private static native void done(String result);
}
