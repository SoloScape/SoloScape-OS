import java.net.MalformedURLException;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.Map;
import net.runelite.api.ClientConfiguration;

/**
 * Browser equivalent of ClientLoader's RSAppletStub for the pinned 1.12.x
 * panel-based game engine. Configuration is installed before initialize().
 * No credentials or gamepack bytes are persisted here.
 */
public final class EngineConfiguration implements ClientConfiguration {
    private URL codeBase;
    private final Map<String, String> parameters = new LinkedHashMap<>();
    private String lastError = "";
    private final StringBuilder requested = new StringBuilder();

    public void setCodeBase(String value) {
        if (value == null) throw new IllegalArgumentException("Codebase required");
        try {
            URL parsed = new URL(value);
            String protocol = parsed.getProtocol();
            if (!"http".equals(protocol) && !"https".equals(protocol))
                throw new IllegalArgumentException("Codebase must use HTTP or HTTPS");
            if (parsed.getHost() == null || parsed.getHost().isEmpty() ||
                parsed.getUserInfo() != null || parsed.getRef() != null)
                throw new IllegalArgumentException("Invalid codebase");
            codeBase = parsed;
        } catch (MalformedURLException error) {
            throw new IllegalArgumentException("Invalid codebase", error);
        }
    }

    public void setParameter(String key, String value) {
        if (key == null || key.isEmpty() || key.length() > 128 ||
            value == null || value.length() > 4096 ||
            parameters.size() >= 128 && !parameters.containsKey(key))
            throw new IllegalArgumentException("Invalid client parameter");
        parameters.put(key, value);
    }

    @Override public URL getCodeBase() { return codeBase; }
    @Override public String getParameter(String key) {
        String value = parameters.get(key);
        // Record only public parameter names and presence; never their values.
        if (requested.length() < 350)
            requested.append(key).append(value == null ? ":- " : ":+ ").append(' ');
        return value;
    }
    public String requestedKeys() { return requested.toString(); }
    @Override public void onError(String code) {
        lastError = code == null ? "unknown" : code;
        System.err.println("[original-engine] client error: " + lastError);
    }
    public String lastError() { return lastError; }
    public boolean configured() { return codeBase != null; }
}
