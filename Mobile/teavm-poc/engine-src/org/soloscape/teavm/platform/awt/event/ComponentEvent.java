package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.*;
public class ComponentEvent extends AWTEvent {
    public static final int COMPONENT_MOVED=100, COMPONENT_RESIZED=101, COMPONENT_SHOWN=102, COMPONENT_HIDDEN=103;
    public ComponentEvent(Component source,int id){super(source,id);}
    public Component getComponent(){return (Component)getSource();}
}
