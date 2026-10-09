package org.soloscape.teavm.platform.fs;
import java.io.*;import java.util.*;
public final class BrowserProperties {
    public static void store(Properties properties,Writer writer,String comments)throws IOException {
        if(comments!=null)for(String line:comments.split("\\r?\\n"))writer.write("#"+line+"\n");
        for(String name:new TreeSet<>(properties.stringPropertyNames()))writer.write(escape(name,true)+"="+escape(properties.getProperty(name),false)+"\n");
        writer.flush();
    }
    private static String escape(String value,boolean key){
        StringBuilder out=new StringBuilder();for(int i=0;i<value.length();i++){char c=value.charAt(i);switch(c){
            case '\\':out.append("\\\\");break;case '\n':out.append("\\n");break;case '\r':out.append("\\r");break;case '\t':out.append("\\t");break;case '\f':out.append("\\f");break;
            case ' ':if(key||i==0)out.append('\\');out.append(c);break;case '=':case ':':case '#':case '!':out.append('\\').append(c);break;default:out.append(c);
        }}return out.toString();
    }
}
