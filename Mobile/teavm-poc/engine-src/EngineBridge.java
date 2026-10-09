import org.teavm.jso.JSExport;

/** Whole-engine reachability probe. No replacement or stripped game methods. */
public final class EngineBridge {
    private static client engine;
    private static boolean initializing;
    private static String initializationState="not-started", initializationError="";
    @org.teavm.jso.JSFunctor public interface Completion extends org.teavm.jso.JSObject {void completed(String error);}

    public static void main(String[] args) { }

    @JSExport public static void configureGateway(String host, int port, String url) {
        if(engine!=null||initializing)throw new IllegalStateException("Configure transport before initialization");
        org.soloscape.teavm.platform.net.Socket.configure(host,port,url);
    }

    @JSExport public static void configureEnvironment(String key,String value) {
        if(engine!=null||initializing)throw new IllegalStateException("Configure environment before initialization");
        org.soloscape.teavm.platform.BrowserDiagnostics.configureEnvironment(key,value);
    }

    @JSExport public static void unlockAudio() {
        org.soloscape.teavm.platform.audio.AudioSystem.unlock();
    }

    @JSExport public static void syncFilesystem(Completion callback) {
        if(callback==null)throw new IllegalArgumentException("Filesystem completion callback required");
        new Thread(()->{
            try{org.soloscape.teavm.platform.fs.BrowserStorage.sync();if(callback!=null)callback.completed(null);}
            catch(Throwable error){if(callback!=null)callback.completed(error.toString());}
        }).start();
    }

    @JSExport public static void configureCanvas(String elementId) {
        if (engine != null || initializing) throw new IllegalStateException("Configure canvas before initialization");
        org.soloscape.teavm.platform.awt.NativeCanvas.hostId = elementId;
    }

    @JSExport public static void registerResource(String name, String hex) {
        if (engine != null || initializing) throw new IllegalStateException("Register resources before initialization");
        if ((hex.length() & 1) != 0) throw new IllegalArgumentException("Resource hex length");
        byte[] bytes = new byte[hex.length()/2];
        for (int i=0;i<bytes.length;i++) {
            int high=Character.digit(hex.charAt(i*2),16), low=Character.digit(hex.charAt(i*2+1),16);
            if (high<0 || low<0) throw new IllegalArgumentException("Resource hex digit");
            bytes[i]=(byte)((high<<4)|low);
        }
        org.soloscape.teavm.platform.BrowserResources.register(name,bytes);
    }

    @JSExport public static String startupState(){return initializationState;}
    @JSExport public static String startupError(){return initializationError;}

    @JSExport public static void initialize() { initializeAsync(null); }

    @JSExport public static void initializeAsync(Completion callback) {
        if(engine!=null||initializing)throw new IllegalStateException("Engine initialization already started");
        initializing=true;initializationState="loading";
        new Thread(()->{
            String failure=null;
            try {
                org.soloscape.teavm.platform.fs.BrowserStorage.mount();
                engine=new client();engine.initialize();initializationState="ready";
            }catch(Throwable error){failure=error.toString();initializationError=failure;initializationState="error";}
            finally{initializing=false;}
            if(callback!=null)callback.completed(failure);
        }).start();
    }
}
