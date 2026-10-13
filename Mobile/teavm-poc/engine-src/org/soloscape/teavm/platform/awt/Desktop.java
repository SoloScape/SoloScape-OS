package org.soloscape.teavm.platform.awt;
import java.net.URI;import org.teavm.jso.JSBody;
public final class Desktop {
    public enum Action {BROWSE}
    public static boolean isDesktopSupported(){return true;}
    public static Desktop getDesktop(){return new Desktop();}
    public boolean isSupported(Action action){return action==Action.BROWSE;}
    public void browse(URI uri){String scheme=uri.getScheme();if(!"https".equals(scheme)&&!"http".equals(scheme))throw new IllegalArgumentException("Browser URL scheme");open(uri.toString());}
    @JSBody(params={"url"},script="window.open(url,'_blank','noopener,noreferrer');")
    private static native void open(String url);
}
