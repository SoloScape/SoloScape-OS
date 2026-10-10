package org.soloscape.teavm.platform.fs;
import java.util.*;import java.io.*;import org.teavm.interop.*;import org.teavm.jso.*;
/** A sandboxed cache filesystem, hydrated before startup and committed to IndexedDB. */
public final class BrowserStorage {
    static final Map<String,Entry> entries=new TreeMap<>();
    static boolean mounted;
    static final Set<String> deleteOnExit=new LinkedHashSet<>();
    static {entries.put("/",new Entry(true));}
    public static void cleanup()throws IOException{
        if(!mounted)return;List<String> paths=new ArrayList<>(deleteOnExit);Collections.reverse(paths);
        for(String path:paths)new File(path).delete();deleteOnExit.clear();sync();
    }
    static final class Entry {boolean directory,localCache;byte[] bytes=new byte[0];Entry(boolean directory){this.directory=directory;}}
    static String normalize(String raw){
        String path=raw.replace('\\','/');if(!path.startsWith("/"))path="/"+path;
        ArrayDeque<String> parts=new ArrayDeque<>();for(String p:path.split("/")){if(p.isEmpty()||p.equals("."))continue;if(p.equals("..")){if(!parts.isEmpty())parts.removeLast();}else parts.add(p);}
        StringBuilder result=new StringBuilder();for(String p:parts)result.append('/').append(p);return result.length()==0?"/":result.toString();
    }
    @Async public static native void mount()throws IOException;
    private static void mount(AsyncCallback<Void> callback){
        load((records,error)->{
            if(error!=null){callback.error(new IOException(error));return;}
            entries.clear();entries.put("/",new Entry(true));
            for(int i=0;i<count(records);i++){
                Entry entry=new Entry(directory(records,i));JSObject data=data(records,i);entry.bytes=new byte[byteCount(data)];
                for(int j=0;j<entry.bytes.length;j++)entry.bytes[j]=(byte)at(data,j);entries.put(name(records,i),entry);
            }
            mounted=true;new File("/home/soloscape").mkdirs();new File("/tmp").mkdirs();
            System.setProperty("user.home","/home/soloscape");
            // The original client uses this exact Jagex cache path. When the
            // explicitly enabled loopback host supplies native cache bytes, map
            // those files into browser memory without copying a 237 MB dat2
            // into TeaVM's byte-array heap or writing to the server.
            final String cache="/home/soloscape/jagexcache/oldschool/LIVE/";
            if(localCacheSize(cache+"main_file_cache.dat2")>=0){
                new File(cache).mkdirs();
                mountLocal(cache+"main_file_cache.dat2");
                mountLocal(cache+"main_file_cache.idx255");
                for(int i=0;i<=24;i++)mountLocal(cache+"main_file_cache.idx"+i);
            }
            callback.complete(null);
        });
    }
    private static void mountLocal(String path){
        if(localCacheSize(path)<0)return;
        Entry entry=new Entry(false);entry.localCache=true;entries.put(path,entry);
    }
    @JSBody(params={"path"},script="const a=globalThis.soloscapeOriginalCacheFiles?.get(path);return a?a.length:-1;")
    static native int localCacheSize(String path);
    @JSBody(params={"path","offset","out","start","count"},script="const a=globalThis.soloscapeOriginalCacheFiles?.get(path);if(!a||offset>=a.length)return -1;const n=Math.min(count,a.length-offset);out.set(a.subarray(offset,offset+n),start);return n;")
    static native int localCacheRead(String path,int offset,@JSByRef byte[] out,int start,int count);
    @JSBody(params={"path","offset","bytes","start","count"},script="const files=globalThis.soloscapeOriginalCacheFiles;let a=files?.get(path);if(!a)throw new Error('Native cache not mounted: '+path);const end=offset+count;if(end>a.length){const b=new Uint8Array(end);b.set(a);a=b;files.set(path,a);}a.set(bytes.subarray(start,start+count),offset);")
    static native void localCacheWrite(String path,int offset,@JSByRef byte[] bytes,int start,int count);
    @JSBody(params={"path"},script="const a=globalThis.soloscapeOriginalCacheFiles?.get(path);return a?1:0;")
    static native boolean hasLocalCache(String path);
    @Async public static native void sync()throws IOException;
    private static void sync(AsyncCallback<Void> callback){
        if(!mounted){callback.error(new IOException("Engine filesystem has not been mounted"));return;}
        JSObject records=records();
        for(Map.Entry<String,Entry> item:entries.entrySet())if(!item.getValue().localCache)append(records,item.getKey(),item.getValue().directory,item.getValue().bytes);
        save(records,error->{if(error==null)callback.complete(null);else callback.error(new IOException(error));});
    }
    @JSFunctor private interface Loaded extends JSObject {void done(JSObject data,String error);}
    @JSFunctor private interface Saved extends JSObject {void done(String error);}
    @JSBody(params={"done"},script="let finished=false;const finish=(files,error)=>{if(finished)return;finished=true;done(files,error);};const temporary=()=>{globalThis.soloscapeOriginalFsEphemeral=true;setTimeout(()=>finish([],null),0);};if(globalThis.isSecureContext===false||!globalThis.indexedDB){temporary();return;}let request;try{request=indexedDB.open('soloscape-original-engine-fs',1);}catch{temporary();return;}request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'name'});request.onblocked=temporary;request.onerror=temporary;request.onsuccess=()=>{if(finished){request.result.close();return;}const db=request.result;globalThis.soloscapeEngineDatabase?.close();globalThis.soloscapeEngineDatabase=db;db.onversionchange=()=>db.close();let get;try{get=db.transaction('files','readonly').objectStore('files').getAll();}catch{temporary();return;}get.onsuccess=()=>finish(get.result,null);get.onerror=temporary;};")
    private static native void load(Loaded done);
    @JSBody(params={"records","done"},script="if(globalThis.soloscapeOriginalFsEphemeral){done(null);return;}const db=globalThis.soloscapeEngineDatabase;if(!db){done('Filesystem not mounted');return;}const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');store.clear();for(const record of records)store.put(record);tx.oncomplete=()=>done(null);tx.onerror=()=>done(String(tx.error));tx.onabort=()=>done(String(tx.error||'Storage transaction aborted'));")
    private static native void save(JSObject records,Saved done);
    @JSBody(script="return [];")private static native JSObject records();
    @JSBody(params={"records","name","directory","bytes"},script="records.push({name,directory,bytes:new Uint8Array(bytes)});")
    private static native void append(JSObject records,String name,boolean directory,@JSByRef byte[] bytes);
    @JSBody(params={"records"},script="return records.length;")private static native int count(JSObject records);
    @JSBody(params={"records","i"},script="return records[i].name;")private static native String name(JSObject records,int i);
    @JSBody(params={"records","i"},script="return records[i].directory;")private static native boolean directory(JSObject records,int i);
    @JSBody(params={"records","i"},script="return records[i].bytes;")private static native JSObject data(JSObject records,int i);
    @JSBody(params={"data"},script="return data.length;")private static native int byteCount(JSObject data);
    @JSBody(params={"data","i"},script="return data[i];")private static native int at(JSObject data,int i);
}
