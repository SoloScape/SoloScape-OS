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
    static final class Entry {boolean directory;byte[] bytes=new byte[0];Entry(boolean directory){this.directory=directory;}}
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
            System.setProperty("user.home","/home/soloscape");callback.complete(null);
        });
    }
    @Async public static native void sync()throws IOException;
    private static void sync(AsyncCallback<Void> callback){
        if(!mounted){callback.error(new IOException("Engine filesystem has not been mounted"));return;}
        JSObject records=records();
        for(Map.Entry<String,Entry> item:entries.entrySet())append(records,item.getKey(),item.getValue().directory,item.getValue().bytes);
        save(records,error->{if(error==null)callback.complete(null);else callback.error(new IOException(error));});
    }
    @JSFunctor private interface Loaded extends JSObject {void done(JSObject data,String error);}
    @JSFunctor private interface Saved extends JSObject {void done(String error);}
    @JSBody(params={"done"},script="if(!globalThis.indexedDB){done(null,'IndexedDB unavailable');return;}const request=indexedDB.open('soloscape-original-engine-fs',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'name'});request.onerror=()=>done(null,String(request.error));request.onsuccess=()=>{const db=request.result;globalThis.soloscapeEngineDatabase?.close();globalThis.soloscapeEngineDatabase=db;db.onversionchange=()=>db.close();const tx=db.transaction('files','readonly'),get=tx.objectStore('files').getAll();get.onsuccess=()=>done(get.result,null);get.onerror=()=>done(null,String(get.error));};")
    private static native void load(Loaded done);
    @JSBody(params={"records","done"},script="const db=globalThis.soloscapeEngineDatabase;if(!db){done('Filesystem not mounted');return;}const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');store.clear();for(const record of records)store.put(record);tx.oncomplete=()=>done(null);tx.onerror=()=>done(String(tx.error));tx.onabort=()=>done(String(tx.error||'Storage transaction aborted'));")
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
