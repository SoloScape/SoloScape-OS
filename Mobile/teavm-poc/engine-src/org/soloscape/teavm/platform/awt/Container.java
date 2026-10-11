package org.soloscape.teavm.platform.awt;
import java.util.*;
public class Container extends Component {
    private final List<Component> children=new ArrayList<>();
    public Component add(Component child) {
        if(child.parent!=null)child.parent.remove(child);children.add(child);child.parent=this;return child;
    }
    public void remove(Component child){if(children.remove(child))child.parent=null;}
    public void setLayout(LayoutManager layout){if(layout!=null)throw new UnsupportedOperationException("Browser host controls layout");}
    public void setFocusCycleRoot(boolean enabled){ }
}
