import org.teavm.jso.JSExport;

/** Isolated original OpenOSRS gamepack runtime: never used by the active homepage. */
public final class EngineBridge {
    private static client engine;
    private static BrowserEngineCallbacks callbacks;
    private static final EngineConfiguration configuration = new EngineConfiguration();
    private static boolean initializing;
    private static String initializationState = "not-started", initializationError = "";
    private static String startupStep = "not-started";
    @org.teavm.jso.JSFunctor public interface Completion extends org.teavm.jso.JSObject {
        void completed(String error);
    }

    public static void main(String[] args) { }

    private static void beforeStartup() {
        if (engine != null || initializing)
            throw new IllegalStateException("Configure original engine before initialization");
    }

    @JSExport public static void configureClient(String codeBase) {
        beforeStartup();
        configuration.setCodeBase(codeBase);
    }

    @JSExport public static void configureClientParameter(String key, String value) {
        beforeStartup();
        configuration.setParameter(key, value);
    }

    @JSExport public static String clientError() { return configuration.lastError(); }
    @JSExport public static String callbackError() { return callbacks == null ? "" : callbacks.lastError(); }
    @JSExport public static String callbackTrace() { return callbacks == null ? "" : callbacks.lastTrace(); }

    private static boolean localRsaConfigured;
    /** Use only SoloScape's generated public client.key. Never provide private keys. */
    @JSExport public static void configureLoginRsaPublic(String exponentHex, String modulusHex) {
        beforeStartup();
        if (exponentHex == null || modulusHex == null || !exponentHex.matches("[0-9a-fA-F]{1,8}") ||
            !modulusHex.matches("[0-9a-fA-F]{256,1024}"))
            throw new IllegalArgumentException("Invalid SoloScape public RSA key");
        java.math.BigInteger exponent = new java.math.BigInteger(exponentHex, 16);
        java.math.BigInteger modulus = new java.math.BigInteger(modulusHex, 16);
        if (exponent.compareTo(java.math.BigInteger.valueOf(3)) < 0 || !exponent.testBit(0) ||
            modulus.bitLength() < 1024 || !modulus.testBit(0))
            throw new IllegalArgumentException("Invalid SoloScape public RSA parameters");
        bq.az = exponent;
        bq.af = modulus;
        localRsaConfigured = true;
    }
    @JSExport public static boolean loginRsaConfigured() { return localRsaConfigured; }

    @JSExport public static void configureGateway(String host, int port, String url) {
        beforeStartup();
        org.soloscape.teavm.platform.net.Socket.configure(host, port, url);
    }

    @JSExport public static void configureEnvironment(String key, String value) {
        beforeStartup();
        org.soloscape.teavm.platform.BrowserDiagnostics.configureEnvironment(key, value);
    }

    @JSExport public static void unlockAudio() {
        org.soloscape.teavm.platform.audio.AudioSystem.unlock();
    }

    @JSExport public static void syncFilesystem(Completion callback) {
        if (callback == null) throw new IllegalArgumentException("Filesystem completion callback required");
        new Thread(() -> {
            try {
                org.soloscape.teavm.platform.fs.BrowserStorage.sync();
                callback.completed(null);
            } catch (Throwable error) {
                callback.completed(error.toString());
            }
        }).start();
    }

    @JSExport public static void configureCanvas(String elementId) {
        beforeStartup();
        org.soloscape.teavm.platform.awt.NativeCanvas.hostId = elementId;
    }

    @JSExport public static void registerResource(String name, String hex) {
        beforeStartup();
        if (name == null || hex == null || (hex.length() & 1) != 0)
            throw new IllegalArgumentException("Invalid resource");
        byte[] bytes = new byte[hex.length() / 2];
        for (int i = 0; i < bytes.length; i++) {
            int high = Character.digit(hex.charAt(i * 2), 16);
            int low = Character.digit(hex.charAt(i * 2 + 1), 16);
            if (high < 0 || low < 0) throw new IllegalArgumentException("Resource hex digit");
            bytes[i] = (byte)((high << 4) | low);
        }
        org.soloscape.teavm.platform.BrowserResources.register(name, bytes);
    }

    @JSExport public static String startupState() { return initializationState; }
    @JSExport public static String startupError() { return initializationError; }
    @JSExport public static String startupStep() { return startupStep; }

    /** A successful initialize() return does not imply that game cycles are running. */
    @JSExport public static int gameCycle() {
        return engine instanceof net.runelite.api.Client
            ? ((net.runelite.api.Client) engine).getGameCycle() : -1;
    }

    /** Report the original client's internal FPS metric, not browser event frequency. */
    @JSExport public static int originalFps() {
        return engine instanceof net.runelite.api.Client
            ? ((net.runelite.api.Client) engine).getFPS() : -1;
    }

    /** Number of original software frames actually blitted by RuneLite callbacks. */
    @JSExport public static int presentedFrames() {
        return callbacks == null ? 0 : callbacks.framesPresented();
    }

    /** Read-only original Java game clock telemetry. */
    @JSExport public static int clockCalls() { return EngineClockProbe.calls(); }
    @JSExport public static int clockTicks() { return EngineClockProbe.ticks(); }
    @JSExport public static int clockLastTicks() { return EngineClockProbe.lastTicks(); }
    @JSExport public static int clockMaxTicks() { return EngineClockProbe.maxTicks(); }
    @JSExport public static int clockGapMs() { return EngineClockProbe.lastCallGapMs(); }
    @JSExport public static int clockWaitMs() { return EngineClockProbe.lastClockDurationMs(); }

    /** The real injected client game state, not a screen inferred from pixels. */
    @JSExport public static String gameState() {
        if (!(engine instanceof net.runelite.api.Client)) return "UNAVAILABLE";
        net.runelite.api.GameState state=((net.runelite.api.Client)engine).getGameState();
        return state==null?"UNAVAILABLE":state.name();
    }

    @JSExport public static boolean hasClientThread() {
        return engine != null && ((net.runelite.api.GameEngine) engine).getClientThread() != null;
    }

    @JSExport public static void initialize() { initializeAsync(null); }

    @JSExport public static void initializeAsync(Completion callback) {
        beforeStartup();
        if (!configuration.configured())
            throw new IllegalStateException("ClientConfiguration codebase is required");
        initializing = true;
        initializationState = "loading";
        initializationError = "";
        startupStep = "mount-storage";
        new Thread(() -> {
            String failure = null;
            try {
                org.soloscape.teavm.platform.fs.BrowserStorage.mount();
                startupStep = "configure-jvm-platform";
                // TeaVM 0.15 does not provide java.vendor by default. The
                // original client uses it to choose built-in keyboard mapping.
                // On a real JVM this property is non-null; supply the honest
                // browser identity rather than changing the original client.
                if (System.getProperty("java.vendor") == null)
                    System.setProperty("java.vendor", "Browser");
                startupStep = "construct-client";
                engine = new client();
                // RuneLite's desktop ClientLoader supplies the injected client's
                // scheduler. In this isolated browser bootstrap we must supply
                // the same service before login UI callbacks queue work.
                // Do not drop those tasks or change original gamepack logic.
                engine.jl = org.soloscape.teavm.platform.BrowserExecutors.newScheduledThreadPool(1);
                startupStep = "configure-injected-hooks";
                callbacks = new BrowserEngineCallbacks();
                engine.vi = callbacks;
                startupStep = "set-client-configuration";
                // Follow the actual local OpenOSRS ClientLoader (1.12.x GameEngine).
                ((net.runelite.api.GameEngine) engine).setConfiguration(configuration);
                startupStep = "initialize-game-engine";
                engine.initialize();
                startupStep = "initialized";
                initializationState = "ready";
            } catch (Throwable error) {
                // TeaVM may not provide JVM stack-trace metadata for obfuscated
                // gamepack exceptions. Never let diagnostic formatting replace
                // the original failure with a second JavaScript runtime error.
                failure = startupStep + ": " + error.toString();
                // Pinned gamepack aaf wraps the real exception and records the
                // obfuscated throw location in package-visible fields.
                if (error instanceof aaf) {
                    try {
                        aaf wrapped = (aaf) error;
                        failure += " [location=" + wrapped.as + "]";
                        if (wrapped.ax != null)
                            failure += " [underlying=" + wrapped.ax.toString() + "]";
                    } catch (Throwable ignored) { /* preserve primary failure */ }
                }
                failure += " [parameter-presence=" + configuration.requestedKeys() + "]";
                try {
                    failure += " [original-environment=" +
                        (ro.gp == null ? "missing" : ro.gp.ag) + "]";
                } catch (Throwable ignored) { /* do not mask the initialization failure */ }
                initializationError = failure;
                initializationState = "error";
            } finally {
                initializing = false;
            }
            if (callback != null) callback.completed(failure);
        }).start();
    }
}
