package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.Component;
public class KeyEvent extends InputEvent {
    private final int code;private final char character;
    public KeyEvent(Component source,int id,long when,int modifiers,int code,char character){super(source,id,when,modifiers);this.code=code;this.character=character;}
    public int getKeyCode(){return code;}public char getKeyChar(){return character;}
}
