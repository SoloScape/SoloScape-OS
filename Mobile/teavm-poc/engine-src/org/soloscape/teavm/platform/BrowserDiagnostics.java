package org.soloscape.teavm.platform;
import java.util.*;
import java.lang.reflect.Field;
import org.teavm.jso.JSBody;

/** Browser capability data, without inventing JVM process or GC measurements. */
public final class BrowserDiagnostics {
    private static final Map<String,String> ENVIRONMENT=new HashMap<>();
    public static void configureEnvironment(String key,String value){ENVIRONMENT.put(key,value);}
    public static Map<String,String> getenv(){return Collections.unmodifiableMap(ENVIRONMENT);}
    public static long maxMemory(Object runtime){return (long)memoryLimit();}
    @JSBody(script="return globalThis.performance?.memory?.jsHeapSizeLimit ?? 268435456;")
    private static native double memoryLimit();
    public static void load(String path){throw new UnsatisfiedLinkError("Native JVM libraries are unavailable in the browser: "+path);}
    public static void exit(int status){
        try{org.soloscape.teavm.platform.fs.BrowserStorage.cleanup();}
        catch(java.io.IOException error){BrowserLoggerFactory.getLogger("engine-filesystem").error("Exit checkpoint failed",error);}
        exitEvent(status);throw new BrowserShutdown(status);
    }
    @JSBody(params={"status"},script="globalThis.soloscapeEngineExit=status;globalThis.soloscapeOnEngineExit?.(status);")
    private static native void exitEvent(int status);
    public static Object[] signers(Class<?> type){return null;}
    public static int getInt(Field field,Object target)throws IllegalAccessException {
        Class<?> type=field.getType();
        if(type!=int.class&&type!=short.class&&type!=byte.class&&type!=char.class)throw new IllegalArgumentException("Field cannot widen to int");
        Object value=field.get(target);return value instanceof Character?(Character)value:((Number)value).intValue();
    }
    public static void setInt(Field field,Object target,int value)throws IllegalAccessException {
        Class<?> type=field.getType();
        if(type==int.class)field.set(target,value);
        else if(type==long.class)field.set(target,(long)value);
        else if(type==float.class)field.set(target,(float)value);
        else if(type==double.class)field.set(target,(double)value);
        else throw new IllegalArgumentException("Integer cannot widen to field type");
    }
    public static final class BrowserShutdown extends Error { public final int status;BrowserShutdown(int status){super("Engine exited: "+status);this.status=status;} }
    public static final class ProcessHandle {
        public static ProcessHandle current(){return new ProcessHandle();}
        public Optional<ProcessHandle> parent(){return Optional.empty();}
        public Info info(){return new Info();}
        public static final class Info {public Optional<String> command(){return Optional.empty();}}
    }
    public interface GarbageCollectorMXBean {boolean isValid();long getCollectionTime();}
    public static final class RuntimeMXBean {public List<String> getInputArguments(){return Collections.emptyList();}}
    public static final class ManagementFactory {
        public static List<GarbageCollectorMXBean> getGarbageCollectorMXBeans(){return Collections.emptyList();}
        public static RuntimeMXBean getRuntimeMXBean(){return new RuntimeMXBean();}
    }
}
