package org.soloscape.teavm.platform.awt;
public final class Font {
    public final String name; public final int style,size;
    public Font(String name,int style,int size){this.name=name;this.style=style;this.size=size;}
    String css(){return ((style&2)!=0?"italic ":"")+((style&1)!=0?"bold ":"")+size+"px "+name;}
}
