package org.soloscape.teavm.platform.awt.event;
public interface WindowListener extends java.util.EventListener {
    void windowOpened(WindowEvent event);
    void windowClosing(WindowEvent event);
    void windowClosed(WindowEvent event);
    void windowIconified(WindowEvent event);
    void windowDeiconified(WindowEvent event);
    void windowActivated(WindowEvent event);
    void windowDeactivated(WindowEvent event);
}
