package org.soloscape.teavm.platform.awt.image;
import org.soloscape.teavm.platform.awt.Image;
public final class PixelGrabber {
    private final Image image;private final int x,y,width,height,offset,stride;private final int[] output;
    public PixelGrabber(Image image,int x,int y,int width,int height,int[] output,int offset,int stride){this.image=image;this.x=x;this.y=y;this.width=width;this.height=height;this.output=output;this.offset=offset;this.stride=stride;}
    public boolean grabPixels(){int[] input=image.pixelData();for(int row=0;row<height;row++)System.arraycopy(input,(y+row)*image.getWidth()+x,output,offset+row*stride,width);return true;}
}
