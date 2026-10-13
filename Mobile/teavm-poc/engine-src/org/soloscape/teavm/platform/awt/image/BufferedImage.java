package org.soloscape.teavm.platform.awt.image;
import java.util.Hashtable;import org.soloscape.teavm.platform.awt.Image;
public class BufferedImage extends Image {
    public static final int TYPE_INT_RGB=1,TYPE_INT_ARGB=2;
    public BufferedImage(int width,int height,int type){super(width,height);if(type!=1&&type!=2)throw new UnsupportedOperationException("Image type");pixels=new int[width*height];alpha=type==2;}
    public BufferedImage(ColorModel color,WritableRaster raster,boolean premultiplied,Hashtable<?,?> properties){
        super(raster.model.width,raster.model.height);if(premultiplied)throw new UnsupportedOperationException("Premultiplied pixels");pixels=raster.buffer.data;alpha=color.alpha;
    }
    public void setRGB(int x,int y,int w,int h,int[] data,int offset,int stride){
        if(drawn){pixelData();drawn=false;}
        for(int row=0;row<h;row++)System.arraycopy(data,offset+row*stride,pixels,(y+row)*width+x,w);
    }
}
