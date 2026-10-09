package org.soloscape.teavm.platform.awt;
import java.util.ArrayDeque;
public final class EventQueue {
    private final ArrayDeque<AWTEvent> queue = new ArrayDeque<>();
    public synchronized AWTEvent peekEvent() { return queue.peek(); }
    public synchronized void postEvent(AWTEvent event) { queue.add(event); }
    public synchronized AWTEvent getNextEvent() { return queue.poll(); }
}
