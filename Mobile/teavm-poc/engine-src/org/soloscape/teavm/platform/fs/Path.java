package org.soloscape.teavm.platform.fs;
public final class Path {
    final File file;private final String display;
    Path(File file){this(file,file.path);}private Path(File file,String display){this.file=file;this.display=display;}
    public File toFile(){return file;}public Path toAbsolutePath(){return new Path(file);}
    public Path getFileName(){return file.path.equals("/")?null:new Path(new File(file.getName()),file.getName());}
    public String toString(){return display;}
}
