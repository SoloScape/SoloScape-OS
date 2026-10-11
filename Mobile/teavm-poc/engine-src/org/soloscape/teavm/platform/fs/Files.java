package org.soloscape.teavm.platform.fs;
import java.io.*;import java.nio.file.CopyOption;import java.nio.file.OpenOption;import java.nio.file.attribute.FileAttribute;
public final class Files {
    private static int temp;
    public static OutputStream newOutputStream(Path path,OpenOption... options)throws IOException {
        if(options.length!=0)throw new UnsupportedOperationException("File open options");
        File file=path.toFile();BrowserStorage.Entry entry=new BrowserStorage.Entry(false);
        if(!new File(file.getParent()).isDirectory())throw new FileNotFoundException(file.path);
        BrowserStorage.entries.put(file.path,entry);
        return new ByteArrayOutputStream(){
            public void close()throws IOException{entry.bytes=toByteArray();BrowserStorage.sync();super.close();}
            public void flush()throws IOException{entry.bytes=toByteArray();BrowserStorage.sync();}
        };
    }
    public static long copy(InputStream stream,Path path,CopyOption... options)throws IOException {
        if(options.length!=0)throw new UnsupportedOperationException("Copy options");
        if(path.toFile().exists())throw new IOException("File exists");long count=0;
        try(OutputStream out=newOutputStream(path)){byte[] bytes=new byte[8192];int n;while((n=stream.read(bytes))!=-1){out.write(bytes,0,n);count+=n;}}return count;
    }
    public static Path createTempFile(String prefix,String suffix,FileAttribute<?>... attributes)throws IOException {
        if(attributes.length!=0)throw new UnsupportedOperationException("File attributes");new File("/tmp").mkdirs();
        File file=new File("/tmp/"+prefix+(temp++)+(suffix==null?".tmp":suffix));while(file.exists())file=new File("/tmp/"+prefix+(temp++)+suffix);
        BrowserStorage.entries.put(file.path,new BrowserStorage.Entry(false));return file.toPath();
    }
}
