package org.soloscape.teavm.platform.awt.color;
public final class ColorSpace {
    public static final int CS_sRGB=1000;
    public static ColorSpace getInstance(int type){if(type!=CS_sRGB)throw new UnsupportedOperationException("Only sRGB is supported");return new ColorSpace();}
}
