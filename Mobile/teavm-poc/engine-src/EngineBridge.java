import org.teavm.jso.JSExport;

/** Whole-engine reachability probe. No replacement or stripped game methods. */
public final class EngineBridge {
    private static client engine;

    public static void main(String[] args) { }

    @JSExport public static void initialize() {
        if (engine != null) throw new IllegalStateException("Engine already initialized");
        engine = new client();
        engine.initialize();
    }
}
