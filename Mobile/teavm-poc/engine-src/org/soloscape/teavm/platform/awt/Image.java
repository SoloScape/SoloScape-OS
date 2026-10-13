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
    /**
     * Present the original opaque raster directly on the original game canvas
     * at its normal integer draw offset. Unlike drawImage, putImageData ignores
     * alpha blending and transforms, so only use it for fully contained opaque
     * buffers: no sprite, transparent asset, or clipped/scaled image qualifies.
     * This also avoids the offscreen conversion + drawImage copy when the host
     * canvas is larger than the game's buffer (e.g. fullscreen mobile title).
     */
    public boolean presentOpaqueFrame(JSObject target,int targetWidth,int targetHeight){
        return presentOpaqueFrame(target,targetWidth,targetHeight,0,0);
    }
    public boolean presentOpaqueFrame(JSObject target,int targetWidth,int targetHeight,int x,int y){
        if(pixels==null||drawn||alpha||x<0||y<0||
            (long)x+width>targetWidth||(long)y+height>targetHeight)return false;
        NativeCanvas.pixelsAt(target,pixels,width,height,false,x,y);
        return true;
    }
    public Graphics getGraphics(){Graphics graphics=new Graphics2D(surface(),width,height);drawn=true;return graphics;}
    public int[] pixelData(){if(pixels==null)pixels=new int[width*height];if(drawn)NativeCanvas.readPixels(canvas,pixels,width,height);return pixels;}
}
