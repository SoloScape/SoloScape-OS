package org.soloscape.teavm.platform.awt;
public final class Toolkit {
    private static final Toolkit INSTANCE = new Toolkit();
    private final EventQueue events = new EventQueue();
    private final org.soloscape.teavm.platform.awt.datatransfer.Clipboard clipboard = new org.soloscape.teavm.platform.awt.datatransfer.Clipboard();
    public static Toolkit getDefaultToolkit() { return INSTANCE; }
    public EventQueue getSystemEventQueue() { return events; }
    public org.soloscape.teavm.platform.awt.datatransfer.Clipboard getSystemClipboard() { return clipboard; }
}
