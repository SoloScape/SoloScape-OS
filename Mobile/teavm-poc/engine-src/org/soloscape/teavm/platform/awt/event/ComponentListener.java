package org.soloscape.teavm.platform.awt.event;
public interface ComponentListener extends java.util.EventListener {
    void componentResized(ComponentEvent event);
    void componentMoved(ComponentEvent event);
    void componentShown(ComponentEvent event);
    void componentHidden(ComponentEvent event);
}
