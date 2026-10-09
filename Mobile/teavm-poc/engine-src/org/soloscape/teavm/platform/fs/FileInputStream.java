package org.soloscape.teavm.platform.fs;
import java.io.*;
public final class FileInputStream extends InputStream {
    private final RandomAccessFile file;public FileInputStream(File name)throws FileNotFoundException{file=new RandomAccessFile(name,"r");}
    public int read()throws IOException{return file.read();}public int read(byte[] data,int offset,int size)throws IOException{return file.read(data,offset,size);}
    public FileDescriptor getFD(){return file.getFD();}public void close()throws IOException{file.close();}
}
