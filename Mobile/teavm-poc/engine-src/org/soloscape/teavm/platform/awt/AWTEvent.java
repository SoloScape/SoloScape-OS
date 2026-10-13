package org.soloscape.teavm.platform.awt;
public class AWTEvent extends java.util.EventObject {
    private final int id;
    public AWTEvent(Object source, int id) { super(source); this.id=id; }
    public int getID() { return id; }
}
