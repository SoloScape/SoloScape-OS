package org.soloscape.teavm.platform.fs;
import java.io.*;import java.util.*;
public final class RandomAccessFile implements Closeable {
    private final BrowserStorage.Entry entry;private final String path;private final boolean writable;private int offset;private boolean closed;
    public RandomAccessFile(File file,String mode)throws FileNotFoundException {
        if(!mode.equals("r")&&!mode.equals("rw")&&!mode.equals("rwd")&&!mode.equals("rws"))throw new IllegalArgumentException(mode);
        writable=!mode.equals("r");BrowserStorage.Entry current=BrowserStorage.entries.get(file.path);
        if(current==null&&writable&&new File(file.getParent()).isDirectory()){current=new BrowserStorage.Entry(false);BrowserStorage.entries.put(file.path,current);}
        if(current==null||current.directory)throw new FileNotFoundException(file.path);entry=current;path=file.path;
    }
    public RandomAccessFile(String file,String mode)throws FileNotFoundException{this(new File(file),mode);}
    private void open()throws IOException{if(closed)throw new IOException("File is closed");}
    public long length()throws IOException{open();return entry.localCache?BrowserStorage.localCacheSize(path):entry.bytes.length;}
    public void seek(long position)throws IOException{open();if(position<0||position>Integer.MAX_VALUE-8)throw new IOException("File position");offset=(int)position;}
    public int read()throws IOException{open();if(entry.localCache){byte[] b=new byte[1];int n=BrowserStorage.localCacheRead(path,offset,b,0,1);if(n<=0)return -1;offset++;return b[0]&255;}return offset>=entry.bytes.length?-1:entry.bytes[offset++]&255;}
    public int read(byte[] bytes,int start,int length)throws IOException{
        open();if(start<0||length<0||start>bytes.length-length)throw new IndexOutOfBoundsException();if(length==0)return 0;
        if(entry.localCache){int n=BrowserStorage.localCacheRead(path,offset,bytes,start,length);if(n>0)offset+=n;return n;}
        if(offset>=entry.bytes.length)return -1;
        int count=Math.min(length,entry.bytes.length-offset);System.arraycopy(entry.bytes,offset,bytes,start,count);offset+=count;return count;
    }
    public void write(int value)throws IOException{write(new byte[]{(byte)value},0,1);}
    public void write(byte[] bytes,int start,int length)throws IOException{
        open();if(!writable)throw new IOException("Read-only file");
        if(start<0||length<0||start>bytes.length-length)throw new IndexOutOfBoundsException();
        if(length==0)return;
        if(entry.localCache){BrowserStorage.localCacheWrite(path,offset,bytes,start,length);offset=Math.addExact(offset,length);return;}
        int end=Math.addExact(offset,length);if(end>entry.bytes.length)entry.bytes=Arrays.copyOf(entry.bytes,end);
        System.arraycopy(bytes,start,entry.bytes,offset,length);offset=end;
    }
    public FileDescriptor getFD(){return new FileDescriptor();}
    public void close()throws IOException{if(!closed){if(writable&&!entry.localCache)BrowserStorage.sync();closed=true;}}
}
