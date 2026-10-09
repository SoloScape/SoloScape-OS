package org.soloscape.teavm.platform.fs;
import java.util.*;import java.net.URI;
public final class File {
    public static final char separatorChar='/';
    public static final String separator="/";
    final String path;
    public File(String path){this.path=BrowserStorage.normalize(Objects.requireNonNull(path));record(this.path);}
    @org.teavm.jso.JSBody(params={"path"},script="const a=globalThis.soloscapeOriginalFilePaths??(globalThis.soloscapeOriginalFilePaths=[]);if(a.length<100&&!a.includes(path))a.push(path);")
    private static native void record(String path);
    public File(File parent,String child){this(parent==null?child:parent.path+"/"+child);}
    public File(String parent,String child){this(parent==null?child:parent+"/"+child);}
    public String getPath(){return path;}public String toString(){return path;}
    public String getName(){return path.substring(path.lastIndexOf('/')+1);}
    public String getParent(){return path.equals("/")?null:path.substring(0,path.lastIndexOf('/')).isEmpty()?"/":path.substring(0,path.lastIndexOf('/'));}
    public boolean exists(){return BrowserStorage.entries.containsKey(path);}
    public boolean isDirectory(){BrowserStorage.Entry e=BrowserStorage.entries.get(path);return e!=null&&e.directory;}
    public long length(){BrowserStorage.Entry e=BrowserStorage.entries.get(path);return e==null||e.directory?0:e.localCache?BrowserStorage.localCacheSize(path):e.bytes.length;}
    public boolean mkdirs(){
        if(exists())return false;String parent=getParent();if(parent!=null&&!new File(parent).isDirectory())new File(parent).mkdirs();
        if(parent!=null&&!new File(parent).isDirectory())return false;BrowserStorage.entries.put(path,new BrowserStorage.Entry(true));return true;
    }
    public File[] listFiles(){if(!isDirectory())return null;List<File> result=new ArrayList<>();for(String name:BrowserStorage.entries.keySet())if(!name.equals(path)&&path.equals(new File(name).getParent()))result.add(new File(name));return result.toArray(new File[0]);}
    public boolean delete(){if(!exists()||isDirectory()&&listFiles().length!=0)return false;BrowserStorage.entries.remove(path);return true;}
    public void deleteOnExit(){BrowserStorage.deleteOnExit.add(path);}
    public boolean renameTo(File target){
        if(!exists()||target.exists()||!new File(target.getParent()).isDirectory())return false;
        Map<String,BrowserStorage.Entry> moved=new LinkedHashMap<>();for(Map.Entry<String,BrowserStorage.Entry> e:BrowserStorage.entries.entrySet())if(e.getKey().equals(path)||e.getKey().startsWith(path+"/"))moved.put(e.getKey(),e.getValue());
        for(Map.Entry<String,BrowserStorage.Entry> e:moved.entrySet()){BrowserStorage.entries.remove(e.getKey());BrowserStorage.entries.put(target.path+e.getKey().substring(path.length()),e.getValue());}return true;
    }
    public Path toPath(){return new Path(this);}
    public URI toURI(){return URI.create("file:"+path);}
}
