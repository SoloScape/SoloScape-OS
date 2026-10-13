package org.soloscape.teavm.platform.fs;
public final class Paths {public static Path get(String first,String... rest){String path=first;for(String part:rest)path+="/"+part;return new File(path).toPath();}}
