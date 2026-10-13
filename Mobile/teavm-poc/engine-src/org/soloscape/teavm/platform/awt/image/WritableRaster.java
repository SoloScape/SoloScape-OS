package org.soloscape.teavm.platform.awt.image;
public final class WritableRaster extends Raster {
    public final SampleModel model;public final DataBufferInt buffer;
    WritableRaster(SampleModel model,DataBufferInt buffer){this.model=model;this.buffer=buffer;}
}
