package org.soloscape.teavm.platform.awt;

/**
 * Browser AWT boundary: there is no desktop AWT EventDispatchThread.
 *
 * NativeCanvas delivers real mouse/keyboard/focus input directly to the
 * original game engine via event listeners. The original GameEngine posts a
 * desktop-only dummy ActionEvent after every draw and waits for the AWT
 * queue to drain before drawing again. In a browser, queuing those events
 * forever forces fifty Thread.sleep(1) suspensions per frame.
 *
 * No gameplay simulation, input or rendering is dispatched by this shim.
 */
public final class EventQueue {
    public AWTEvent peekEvent() { return null; }
    public void postEvent(AWTEvent event) {
        // Browser event delivery is direct; no AWT event thread to wake.
    }
    public AWTEvent getNextEvent() { return null; }
}
