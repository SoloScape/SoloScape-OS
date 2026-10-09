package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.Component;
public class MouseEvent extends InputEvent {
    private final int x,y,button;private final boolean popup;
    public MouseEvent(Component source,int id,long when,int modifiers,int x,int y,int clicks,boolean popup,int button){
        super(source,id,when,modifiers);this.x=x;this.y=y;this.popup=popup;this.button=button;
    }
    public int getX(){return x;}public int getY(){return y;}public int getButton(){return button;}
    public boolean isPopupTrigger(){return popup;}
}
