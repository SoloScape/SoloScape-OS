package org.soloscape.teavm.platform.awt;
import org.teavm.jso.JSObject;
public class Image {
    protected final int width,height;
    protected JSObject canvas;
    protected int[] pixels;
    protected boolean alpha;
    protected boolean drawn;
    public Image(int width,int height){if(width<=0||height<=0)throw new IllegalArgumentException("Image dimensions");this.width=width;this.height=height;}
    public int getWidth(){return width;}public int getHeight(){return height;}
    public JSObject surface(){if(canvas==null)canvas=NativeCanvas.create(width,height,null);if(pixels!=null&&!drawn)NativeCanvas.pixels(canvas,pixels,width,height,alpha);return canvas;}
    public Graphics getGraphics(){Graphics graphics=new Graphics2D(surface(),width,height);drawn=true;return graphics;}
    public int[] pixelData(){if(pixels==null)pixels=new int[width*height];if(drawn)NativeCanvas.readPixels(canvas,pixels,width,height);return pixels;}
}
