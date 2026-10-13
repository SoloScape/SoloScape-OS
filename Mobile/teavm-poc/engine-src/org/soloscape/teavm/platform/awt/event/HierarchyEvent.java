package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.*;
public class HierarchyEvent extends AWTEvent {
    public static final long PARENT_CHANGED=1, DISPLAYABILITY_CHANGED=2, SHOWING_CHANGED=4;
    private final long flags;
    public HierarchyEvent(Component source, long flags) { super(source,1400); this.flags=flags; }
    public Component getComponent() { return (Component) getSource(); }
    public long getChangeFlags() { return flags; }
}
