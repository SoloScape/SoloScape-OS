package org.soloscape.teavm.platform;
import java.util.*;

/** Checked byte blocks replace the engine's three native Unsafe operations. */
public final class HeapMemory {
    public static final HeapMemory theUnsafe=new HeapMemory();
    public static final int ARRAY_BYTE_BASE_OFFSET=0;
    private final TreeMap<Long,byte[]> blocks=new TreeMap<>();
    private long next=1;
    public synchronized long allocateMemory(long size){
        if(size<0||size>Integer.MAX_VALUE-8)throw new IllegalArgumentException("Allocation size");
        if(size==0)return 0;long address=next;next=Math.addExact(next,size+1);blocks.put(address,new byte[(int)size]);return address;
    }
    public synchronized void freeMemory(long address){if(address!=0&&blocks.remove(address)==null)throw new IllegalArgumentException("Unknown allocation");}
    private byte[] block(long address,long size){Map.Entry<Long,byte[]> block=blocks.floorEntry(address);if(block==null||address-block.getKey()+size>block.getValue().length)throw new IndexOutOfBoundsException("Memory range");return block.getValue();}
    public synchronized void copyMemory(Object source,long sourceOffset,Object destination,long destinationOffset,long size){
        if(size<0||size>Integer.MAX_VALUE)throw new IllegalArgumentException("Copy size");
        if(size==0)return;
        byte[] from=source==null?block(sourceOffset,size):(byte[])source;
        byte[] to=destination==null?block(destinationOffset,size):(byte[])destination;
        long fromOffset=source==null?sourceOffset-blocks.floorKey(sourceOffset):sourceOffset;
        long toOffset=destination==null?destinationOffset-blocks.floorKey(destinationOffset):destinationOffset;
        if(fromOffset<0||toOffset<0||fromOffset+size>from.length||toOffset+size>to.length)throw new IndexOutOfBoundsException();
        System.arraycopy(from,(int)fromOffset,to,(int)toOffset,(int)size);
    }
}
