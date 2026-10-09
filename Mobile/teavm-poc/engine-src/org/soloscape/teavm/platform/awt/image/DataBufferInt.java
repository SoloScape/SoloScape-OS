package org.soloscape.teavm.platform.awt.image;
public final class DataBufferInt extends DataBuffer {public final int[] data;public DataBufferInt(int[] data,int size){if(size>data.length)throw new IllegalArgumentException();this.data=data;}}
