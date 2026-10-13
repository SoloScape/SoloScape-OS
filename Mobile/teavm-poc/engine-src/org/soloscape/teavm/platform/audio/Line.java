package org.soloscape.teavm.platform.audio;
public interface Line {void open();void close();public static class Info {public final Class<?> type;public Info(Class<?> type){this.type=type;}}}
