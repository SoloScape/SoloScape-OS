package org.soloscape.teavm.platform.net;
import java.io.*;import java.util.*;import org.teavm.jso.*;import org.teavm.interop.*;
/** A byte stream over an explicitly configured fixed-target WebSocket gateway. */
public class Socket {
    private static final Map<String,String> ROUTES=new HashMap<>();
    private JSObject handle;private int timeout;private boolean closed;
    public static void configure(String host,int port,String gateway){
        if(!gateway.startsWith("ws://")&&!gateway.startsWith("wss://"))throw new IllegalArgumentException("WebSocket gateway URL");
        ROUTES.put(host+":"+port,gateway);
    }
    public Socket(){}
    public Socket(InetAddress address,int port)throws IOException{connect(new InetSocketAddress(address.host,port));}
    public void connect(SocketAddress address)throws IOException {
        if(closed||handle!=null)throw new IOException("Socket is closed or connected");
        InetSocketAddress target=(InetSocketAddress)address;String route=ROUTES.get(target.host+":"+target.port);
        if(route==null)throw new IOException("No browser gateway configured for "+target.host+":"+target.port);
        handle=open(route);
    }
    public boolean isConnected(){return handle!=null&&!closed;}
    public void setSoTimeout(int timeout){if(timeout<0)throw new IllegalArgumentException();this.timeout=timeout;}
    public void setTcpNoDelay(boolean enabled){} // WebSocket/TCP settings are controlled by the fixed gateway.
    public void setReceiveBufferSize(int size){if(size<=0)throw new IllegalArgumentException();}
    public void setSendBufferSize(int size){if(size<=0)throw new IllegalArgumentException();}
    private void check()throws IOException{if(!isConnected())throw new IOException("Socket is not connected");}
    private final InputStream input=new InputStream(){
        private byte[] pending=new byte[0];private int offset;
        public int available(){return pending.length-offset+(handle==null?0:queued(handle));}
        public int read()throws IOException{byte[] one=new byte[1];return read(one,0,1)<0?-1:one[0]&255;}
        public int read(byte[] out,int start,int count)throws IOException{
            if(start<0||count<0||start>out.length-count)throw new IndexOutOfBoundsException();if(count==0)return 0;check();
            if(offset==pending.length){pending=receive(handle,timeout);offset=0;if(pending==null)return -1;}
            int n=Math.min(count,pending.length-offset);System.arraycopy(pending,offset,out,start,n);offset+=n;return n;
        }
        public void close(){Socket.this.close();}
    };
    private final OutputStream output=new OutputStream(){
        public void write(int value)throws IOException{write(new byte[]{(byte)value},0,1);}
        public void write(byte[] bytes,int start,int count)throws IOException{
            if(start<0||count<0||start>bytes.length-count)throw new IndexOutOfBoundsException();check();
            while(count>0){int n=Math.min(count,65536);drain(handle);send(handle,Arrays.copyOfRange(bytes,start,start+n));start+=n;count-=n;}
        }
        public void close(){Socket.this.close();}
    };
    public InputStream getInputStream()throws IOException{check();return input;}
    public OutputStream getOutputStream()throws IOException{check();return output;}
    public void close(){if(!closed){closed=true;if(handle!=null)closeNative(handle);}}
    @JSFunctor private interface Completion extends JSObject{void done(JSObject result,String error);}
    @Async private static native JSObject open(String route)throws IOException;
    private static void open(String route,AsyncCallback<JSObject> callback){openNative(route,(result,error)->{if(error==null)callback.complete(result);else callback.error(new IOException(error));});}
    @JSBody(params={"route","done"},script="const ws=new WebSocket(route),s={ws,q:[],bytes:0,closed:false,error:null,wait:null};ws.binaryType='arraybuffer';const finish=(data,error)=>{const w=s.wait;if(w){s.wait=null;clearTimeout(w.timer);w.done(data,error);}};let connecting=true;const timer=setTimeout(()=>{if(!connecting)return;connecting=false;s.error='Gateway connect timeout';ws.close();done(null,s.error);},10000);ws.onopen=()=>{if(!connecting){ws.close();return;}connecting=false;clearTimeout(timer);done(s,null);};ws.onmessage=e=>{const data=new Uint8Array(e.data);if(!data.length)return;if(data.length>1048576){s.error='Gateway frame exceeded 1 MiB';finish(null,s.error);ws.close();return;}if(s.wait)finish(data,null);else{s.q.push(data);s.bytes+=data.length;if(s.bytes>1048576){s.error='Gateway receive queue exceeded 1 MiB';ws.close();}}};ws.onerror=()=>{s.error='Gateway transport failed';if(connecting){connecting=false;clearTimeout(timer);done(null,s.error);}finish(null,s.error);};ws.onclose=e=>{s.closed=true;if(e.code!==1000)s.error=s.error||('Gateway closed: '+e.code);if(connecting){connecting=false;clearTimeout(timer);done(null,s.error||'Gateway closed during connect');}finish(null,s.error);};")
    private static native void openNative(String route,Completion done);
    @Async private static native byte[] receive(JSObject socket,int timeout)throws IOException;
    private static void receive(JSObject socket,int timeout,AsyncCallback<byte[]> callback){
        receiveNative(socket,timeout,(data,error)->{if(error!=null){callback.error(new IOException(error));return;}if(data==null){callback.complete(null);return;}byte[] result=new byte[length(data)];for(int i=0;i<result.length;i++)result[i]=(byte)at(data,i);callback.complete(result);});
    }
    @JSBody(params={"s","timeout","done"},script="if(s.q.length){const data=s.q.shift();s.bytes-=data.length;done(data,null);return;}if(s.closed||s.error){done(null,s.error);return;}if(s.wait){done(null,'Concurrent stream reads are unsupported');return;}const w={done,timer:null};s.wait=w;if(timeout)w.timer=setTimeout(()=>{if(s.wait===w){s.wait=null;done(null,'Socket read timed out');}},timeout);")
    private static native void receiveNative(JSObject socket,int timeout,Completion done);
    @Async private static native void drain(JSObject socket)throws IOException;
    private static void drain(JSObject socket,AsyncCallback<Void> callback){drainNative(socket,(result,error)->{if(error==null)callback.complete(null);else callback.error(new IOException(error));});}
    @JSBody(params={"s","done"},script="const check=()=>{if(s.closed||s.error){done(null,s.error||'Socket closed');return;}if(s.ws.bufferedAmount<983040)done(null,null);else setTimeout(check,5);};check();")
    private static native void drainNative(JSObject socket,Completion done);
    @JSBody(params={"s","bytes"},script="s.ws.send(new Uint8Array(bytes));")private static native void send(JSObject socket,@JSByRef byte[] bytes);
    @JSBody(params={"s"},script="s.ws.close(1000);")private static native void closeNative(JSObject socket);
    @JSBody(params={"s"},script="return s.bytes;")private static native int queued(JSObject socket);
    @JSBody(params={"data"},script="return data.length;")private static native int length(JSObject data);
    @JSBody(params={"data","i"},script="return data[i];")private static native int at(JSObject data,int i);
}
