import org.teavm.jso.JSExport;

/** Whole-engine reachability probe. No replacement or stripped game methods. */
public final class EngineBridge {
    private static client engine;

    public static void main(String[] args) { }

    @JSExport public static void configureCanvas(String elementId) {
        if (engine != null) throw new IllegalStateException("Configure canvas before initialization");
        org.soloscape.teavm.platform.awt.NativeCanvas.hostId = elementId;
    }

    @JSExport public static void registerResource(String name, String hex) {
        if (engine != null) throw new IllegalStateException("Register resources before initialization");
        if ((hex.length() & 1) != 0) throw new IllegalArgumentException("Resource hex length");
        byte[] bytes = new byte[hex.length()/2];
        for (int i=0;i<bytes.length;i++) {
            int high=Character.digit(hex.charAt(i*2),16), low=Character.digit(hex.charAt(i*2+1),16);
            if (high<0 || low<0) throw new IllegalArgumentException("Resource hex digit");
            bytes[i]=(byte)((high<<4)|low);
        }
        org.soloscape.teavm.platform.BrowserResources.register(name,bytes);
    }

    @JSExport public static void initialize() {
        if (engine != null) throw new IllegalStateException("Engine already initialized");
        engine = new client();
        engine.initialize();
    }
}
