package org.soloscape.teavm.platform.audio;
public final class AudioSystem {
    public static Line getLine(Line.Info info){if(!(info instanceof DataLine.Info))throw new IllegalArgumentException("PCM line description required");return new BrowserAudioLine((DataLine.Info)info);}
    public static void unlock(){BrowserAudioLine.unlock();}
}
