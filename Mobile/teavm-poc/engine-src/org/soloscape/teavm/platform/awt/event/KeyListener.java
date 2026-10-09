package org.soloscape.teavm.platform.awt.event;
public interface KeyListener extends java.util.EventListener {
    void keyTyped(KeyEvent event);
    void keyPressed(KeyEvent event);
    void keyReleased(KeyEvent event);
}
