package org.soloscape.teavm.platform.awt.image;
import org.soloscape.teavm.platform.awt.color.ColorSpace;
public final class DirectColorModel extends ColorModel {
    public DirectColorModel(int bits,int red,int green,int blue){this(null,bits,red,green,blue,0,false,3);}
    public DirectColorModel(ColorSpace space,int bits,int red,int green,int blue,int alpha,boolean premultiplied,int transfer){
        super(alpha!=0);
        if(red!=0xff0000||green!=0xff00||blue!=0xff||premultiplied||transfer!=3||(alpha!=0&&alpha!=0xff000000))
            throw new UnsupportedOperationException("Unsupported engine pixel layout");
    }
    public SampleModel createCompatibleSampleModel(int width,int height){return new SampleModel(width,height);}
}
