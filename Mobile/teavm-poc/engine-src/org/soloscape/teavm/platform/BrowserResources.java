package org.soloscape.teavm.platform;

import java.io.*;
import java.net.*;
import java.util.*;

/** Explicit preloaded classpath resources, with fresh streams for every lookup. */
public final class BrowserResources {
    private static final Map<String, byte[]> RESOURCES = new HashMap<>();
    private BrowserResources() { }
    public static synchronized void register(String name, byte[] bytes) {
        if (name.startsWith("/") || name.isEmpty() || name.contains("..")) throw new IllegalArgumentException("Classpath resource name");
        RESOURCES.put(name, Objects.requireNonNull(bytes).clone());
    }
    public static synchronized InputStream stream(Object loader, String name) {
        byte[] bytes = RESOURCES.get(Objects.requireNonNull(name));
        recordLookup(name,bytes!=null);
        return bytes == null ? null : new ByteArrayInputStream(bytes);
    }
    @org.teavm.jso.JSBody(params={"name","found"},script="const a=globalThis.soloscapeOriginalResourceLookups??(globalThis.soloscapeOriginalResourceLookups=[]);if(a.length<32)a.push({name,found});")
    private static native void recordLookup(String name,boolean found);
    private static String relative(Class<?> type, String name) {
        if (name.startsWith("/")) return name.substring(1);
        String owner = type.getName(); int end = owner.lastIndexOf('.');
        return end < 0 ? name : owner.substring(0,end).replace('.','/') + "/" + name;
    }
    public static InputStream classStream(Class<?> type, String name) { return stream(null,relative(type,name)); }
    public static URL classResource(Class<?> type, String name) { return resource(null,relative(type,name)); }
    public static InputStream systemStream(String name) { return stream(null,name); }
    public static URL systemResource(String name) { return resource(null,name); }
    public static Enumeration<URL> systemResources(String name) { return resources(null,name); }
    public static Enumeration<URL> resources(Object loader, String name) {
        URL url = resource(loader,name);
        return Collections.enumeration(url == null ? Collections.<URL>emptyList() : Collections.singletonList(url));
    }
    public static synchronized URL resource(Object loader, String name) {
        if (!RESOURCES.containsKey(name)) { recordLookup(name,false); return null; }
        recordLookup(name,true);
        try {
            return new URL(null,"soloscape-resource:/"+name,new URLStreamHandler() {
                protected URLConnection openConnection(URL url) {
                    return new URLConnection(url) {
                        public void connect() { connected = true; }
                        public InputStream getInputStream() throws IOException {
                            InputStream result=stream(null,name);
                            if(result==null)throw new FileNotFoundException(name);
                            connect();return result;
                        }
                    };
                }
            });
        } catch (MalformedURLException impossible) { throw new IllegalArgumentException(name,impossible); }
    }
}
