package org.soloscape.teavm.platform.awt;
import org.soloscape.teavm.platform.awt.Dimension;
import java.util.*;
import org.soloscape.teavm.platform.awt.event.*;

/** Logical bounds and listeners; a configured host canvas supplies browser input. */
public class Component {
    Container parent;
    private boolean visible=true, traversal=true;
    private org.teavm.jso.JSObject canvas;
    private org.soloscape.teavm.platform.awt.Color background=new org.soloscape.teavm.platform.awt.Color(0,0,0);
    public Container getParent(){return parent;}
    public Toolkit getToolkit(){return Toolkit.getDefaultToolkit();}
    public void setVisible(boolean visible){this.visible=visible;}
    public void setBackground(org.soloscape.teavm.platform.awt.Color color){background=color;}
    public void setFocusTraversalKeysEnabled(boolean enabled){traversal=enabled;}
    public boolean getFocusTraversalKeysEnabled(){return traversal;}
    public void validate(){dispatchHierarchyEvent(HierarchyEvent.SHOWING_CHANGED);}
    public Graphics getGraphics(){
        if(canvas==null) {
            canvas=NativeCanvas.create(Math.max(1,width),Math.max(1,height),NativeCanvas.hostId);
            if(this instanceof Canvas && NativeCanvas.hostId!=null)NativeCanvas.input(canvas,this::dispatchNative);
        }
        Graphics graphics=new Graphics2D(canvas,width,height);graphics.setBackground(background);return graphics;
    }
    public Image createImage(int width,int height){return new Image(width,height);}
    public FontMetrics getFontMetrics(Font font){Graphics g=getGraphics();g.setFont(font);return g.getFontMetrics();}
    public void paint(Graphics graphics){}
    public void update(Graphics graphics){paint(graphics);}
    public void repaint(){paint(getGraphics());}
    public void requestFocus(){getGraphics();NativeCanvas.focus(canvas);}
    private boolean dispatchNative(int id,double when,int modifiers,int x,int y,int button,int code,String character,int rotation){
        if(id==1004||id==1005){dispatchFocus(id==1004);return false;}
        if(id>=400&&id<=402){KeyEvent event=new KeyEvent(this,id,(long)when,modifiers,code,character.isEmpty()?'\uffff':character.charAt(0));dispatchKey(event);return event.isConsumed();}
        if(id==507){MouseWheelEvent event=new MouseWheelEvent(this,(long)when,modifiers,x,y,rotation);dispatchMouseWheel(event);return event.isConsumed();}
        MouseEvent event=new MouseEvent(this,id,(long)when,modifiers,x,y,1,button==3,button);
        if(id==503||id==506)dispatchMouseMotion(event);else dispatchMouse(event);
        return event.isConsumed();
    }
    private final List<FocusListener> focusListeners=new ArrayList<>();
    public void addFocusListener(FocusListener listener){focusListeners.add(listener);}
    public void removeFocusListener(FocusListener listener){focusListeners.remove(listener);}
    public void dispatchFocus(boolean gained){FocusEvent event=new FocusEvent(this,gained?1004:1005);for(FocusListener listener:new ArrayList<>(focusListeners)){if(gained)listener.focusGained(event);else listener.focusLost(event);}}
    private final List<KeyListener> keyListeners=new ArrayList<>();
    public void addKeyListener(KeyListener listener){keyListeners.add(listener);}
    public void removeKeyListener(KeyListener listener){keyListeners.remove(listener);}
    public void dispatchKey(KeyEvent event){for(KeyListener listener:new ArrayList<>(keyListeners)){switch(event.getID()){
        case 400:listener.keyTyped(event);break;
        case 401:listener.keyPressed(event);break;
        case 402:listener.keyReleased(event);break;
    }}}
    private final List<MouseListener> mouseListeners=new ArrayList<>();
    public void addMouseListener(MouseListener listener){mouseListeners.add(listener);}
    public void removeMouseListener(MouseListener listener){mouseListeners.remove(listener);}
    public void dispatchMouse(MouseEvent event){for(MouseListener listener:new ArrayList<>(mouseListeners)){switch(event.getID()){
        case 500:listener.mouseClicked(event);break;
        case 501:listener.mousePressed(event);break;
        case 502:listener.mouseReleased(event);break;
        case 504:listener.mouseEntered(event);break;
        case 505:listener.mouseExited(event);break;
    }}}
    private final List<MouseMotionListener> mousemotionListeners=new ArrayList<>();
    public void addMouseMotionListener(MouseMotionListener listener){mousemotionListeners.add(listener);}
    public void removeMouseMotionListener(MouseMotionListener listener){mousemotionListeners.remove(listener);}
    public void dispatchMouseMotion(MouseEvent event){for(MouseMotionListener listener:new ArrayList<>(mousemotionListeners)){switch(event.getID()){
        case 506:listener.mouseDragged(event);break;
        case 503:listener.mouseMoved(event);break;
    }}}
    private final List<MouseWheelListener> mousewheelListeners=new ArrayList<>();
    public void addMouseWheelListener(MouseWheelListener listener){mousewheelListeners.add(listener);}
    public void removeMouseWheelListener(MouseWheelListener listener){mousewheelListeners.remove(listener);}
    public void dispatchMouseWheel(MouseWheelEvent event){for(MouseWheelListener listener:new ArrayList<>(mousewheelListeners)){switch(event.getID()){
        case 507:listener.mouseWheelMoved(event);break;
    }}}
    private int width, height, x, y;
    private final List<HierarchyListener> hierarchy = new ArrayList<>();
    private final List<ComponentListener> components = new ArrayList<>();
    public void setSize(Dimension size) { setSize(size.width, size.height); }
    public void setSize(int width, int height) {
        this.width = width; this.height = height;
        if(canvas!=null)NativeCanvas.resize(canvas,width,height);
        ComponentEvent event = new ComponentEvent(this, ComponentEvent.COMPONENT_RESIZED);
        for (ComponentListener listener : new ArrayList<>(components)) listener.componentResized(event);
    }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public Dimension getSize() { return new Dimension(width, height); }
    public void setLocation(int x, int y) { this.x=x; this.y=y; }
    public int getX() { return x; }
    public int getY() { return y; }
    public void addHierarchyListener(HierarchyListener listener) { hierarchy.add(listener); }
    public void removeHierarchyListener(HierarchyListener listener) { hierarchy.remove(listener); }
    public void addComponentListener(ComponentListener listener) { components.add(listener); }
    public void removeComponentListener(ComponentListener listener) { components.remove(listener); }
    public boolean isDisplayable() { return NativeCanvas.hostId != null; }
    public boolean isShowing() { return visible && isDisplayable(); }
    public void dispatchHierarchyEvent(long flags) {
        HierarchyEvent event = new HierarchyEvent(this, flags);
        for (HierarchyListener listener : new ArrayList<>(hierarchy)) listener.hierarchyChanged(event);
    }
}
