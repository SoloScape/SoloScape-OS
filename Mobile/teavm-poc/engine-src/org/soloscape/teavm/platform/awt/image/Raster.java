package org.soloscape.teavm.platform.awt.image;
import org.soloscape.teavm.platform.awt.Point;
public class Raster {
    public static WritableRaster createWritableRaster(SampleModel model,DataBuffer buffer,Point origin){
        if(origin!=null&&(origin.x!=0||origin.y!=0))throw new UnsupportedOperationException("Nonzero raster origin");
        return new WritableRaster(model,(DataBufferInt)buffer);
    }
}
