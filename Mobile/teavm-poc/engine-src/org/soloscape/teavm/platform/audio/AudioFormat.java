package org.soloscape.teavm.platform.audio;
public final class AudioFormat {
    public final float rate;public final int bits,channels;public final boolean signed,bigEndian;
    public AudioFormat(float rate,int bits,int channels,boolean signed,boolean bigEndian){
        if(rate<=0||bits!=16||channels<1||channels>2||!signed)throw new IllegalArgumentException("Signed 16-bit mono/stereo PCM required");
        this.rate=rate;this.bits=bits;this.channels=channels;this.signed=signed;this.bigEndian=bigEndian;
    }
}
