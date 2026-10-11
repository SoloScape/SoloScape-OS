package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.*;
public class InputEvent extends AWTEvent {
    private boolean consumed; private final int modifiers; private final long when;
    public InputEvent(Component source,int id,long when,int modifiers){super(source,id);this.when=when;this.modifiers=modifiers;}
    public void consume(){consumed=true;}public boolean isConsumed(){return consumed;}
    public long getWhen(){return when;}
    public boolean isAltDown(){return (modifiers&512)!=0;}public boolean isControlDown(){return (modifiers&128)!=0;}
    public boolean isMetaDown(){return (modifiers&256)!=0;}
}
