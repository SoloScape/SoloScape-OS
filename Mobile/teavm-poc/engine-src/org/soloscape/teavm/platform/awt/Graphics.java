package org.soloscape.teavm.platform.awt;
import org.soloscape.teavm.platform.awt.Color;
import org.teavm.jso.JSObject;
import org.soloscape.teavm.platform.awt.image.ImageObserver;
public class Graphics {
    private final JSObject canvas,context;private final int width,height;
    protected Font font=new Font("sans-serif",0,12);
    private Color background=Color.black;
    public Graphics(JSObject canvas,int width,int height){this.canvas=canvas;this.context=NativeCanvas.context(canvas);this.width=width;this.height=height;setFont(font);}
    JSObject context(){return context;}
    public void setColor(Color color){NativeCanvas.color(context,color.getRGB());}
    public void fillRect(int x,int y,int w,int h){NativeCanvas.rect(context,x,y,w,h,0);}
    public void drawRect(int x,int y,int w,int h){NativeCanvas.rect(context,x,y,w,h,1);}
    public void setBackground(Color color){background=color;}
    public void clearRect(int x,int y,int w,int h){NativeCanvas.clear(context,background.getRGB(),x,y,w,h);}
    public void setFont(Font font){this.font=font;NativeCanvas.font(context,font.css());}
    public void drawString(String text,int x,int y){NativeCanvas.text(context,text,x,y);}
    public boolean drawImage(Image image,int x,int y,ImageObserver observer){NativeCanvas.image(context,image.surface(),x,y);return true;}
    public Rectangle getClipBounds(){return new Rectangle(0,0,width,height);}
    public FontMetrics getFontMetrics(){return new FontMetrics(this);}
}
