package org.soloscape.teavm.platform.audio;
import java.util.Arrays;import org.teavm.jso.*;
/** PCM buffers scheduled against the Web Audio clock with bounded queued duration. */
public final class BrowserAudioLine implements SourceDataLine {
    private final DataLine.Info info;private JSObject handle;private boolean closed,started;
    BrowserAudioLine(DataLine.Info info){this.info=info;}
    public void open(){if(closed)throw new IllegalStateException("Audio line closed");if(handle==null)handle=create(info.format.rate,info.format.channels,Math.max(info.size,4096),info.format.bigEndian);}
    public void start(){open();started=true;unlock();}
    public int available(){return closed||handle==null?0:availableNative(handle);}
    public int write(byte[] data,int offset,int length){
        if(offset<0||length<0||offset>data.length-length||length%(2*info.format.channels)!=0)throw new IndexOutOfBoundsException();
        if(!started||closed)throw new IllegalStateException("Audio line is not running");
        int written=0;while(written<length&&!closed){
            int count=Math.min(length-written,available());count-=count%(2*info.format.channels);
            if(count==0){try{Thread.sleep(5);}catch(InterruptedException error){Thread.currentThread().interrupt();break;}continue;}
            writeNative(handle,Arrays.copyOfRange(data,offset+written,offset+written+count));written+=count;
        }return written;
    }
    public void flush(){if(handle!=null)flushNative(handle);}
    public void close(){if(!closed){closed=true;flush();}}
    @JSBody(script="globalThis.soloscapeAudioContext?.resume().catch(error=>console.warn('Engine audio resume failed',error));")
    public static native void unlock();
    @JSBody(params={"rate","channels","capacity","bigEndian"},script="const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Constructor)throw new Error('Web Audio unavailable');const context=globalThis.soloscapeAudioContext||(globalThis.soloscapeAudioContext=new Constructor());return {context,rate,channels,capacity,bigEndian,end:context.currentTime,sources:new Set()};")
    private static native JSObject create(float rate,int channels,int capacity,boolean bigEndian);
    @JSBody(params={"line"},script="if(line.context.state!=='running')return 0;const used=Math.ceil(Math.max(0,line.end-line.context.currentTime)*line.rate)*line.channels*2;return Math.max(0,line.capacity-used);")
    private static native int availableNative(JSObject line);
    @JSBody(params={"line","bytes"},script="const frameCount=bytes.length/(line.channels*2),buffer=line.context.createBuffer(line.channels,frameCount,line.rate),view=new DataView(new Uint8Array(bytes).buffer);for(let channel=0;channel<line.channels;channel++){const pcm=buffer.getChannelData(channel);for(let i=0;i<frameCount;i++)pcm[i]=view.getInt16((i*line.channels+channel)*2,!line.bigEndian)/32768;}globalThis.soloscapeAudioLastPCM=Array.from(buffer.getChannelData(0));const source=line.context.createBufferSource();source.buffer=buffer;source.connect(line.context.destination);const start=Math.max(line.context.currentTime,line.end);line.end=start+buffer.duration;line.sources.add(source);source.onended=()=>line.sources.delete(source);source.start(start);")
    private static native void writeNative(JSObject line,@JSByRef byte[] bytes);
    @JSBody(params={"line"},script="for(const source of line.sources){source.onended=null;source.stop();source.disconnect();}line.sources.clear();line.end=line.context.currentTime;")
    private static native void flushNative(JSObject line);
}
