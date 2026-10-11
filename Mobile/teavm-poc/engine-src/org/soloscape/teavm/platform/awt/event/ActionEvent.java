package org.soloscape.teavm.platform.awt.event;
import org.soloscape.teavm.platform.awt.AWTEvent;
public class ActionEvent extends AWTEvent {
    private final String command;
    public ActionEvent(Object source,int id,String command){super(source,id);this.command=command;}
    public String getActionCommand(){return command;}
}
