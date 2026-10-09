package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.Component;
public class MouseWheelEvent extends MouseEvent {
    private final int rotation;
    public MouseWheelEvent(Component source,long when,int modifiers,int x,int y,int rotation){super(source,507,when,modifiers,x,y,0,false,0);this.rotation=rotation;}
    public int getWheelRotation(){return rotation;}
}
