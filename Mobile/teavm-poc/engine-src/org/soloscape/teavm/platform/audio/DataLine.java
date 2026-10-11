package org.soloscape.teavm.platform.audio;
public interface DataLine extends Line {
    void start();void flush();int available();
    public static final class Info extends Line.Info {public final AudioFormat format;public final int size;public Info(Class<?> type,AudioFormat format,int size){super(type);this.format=format;this.size=size;}}
}
