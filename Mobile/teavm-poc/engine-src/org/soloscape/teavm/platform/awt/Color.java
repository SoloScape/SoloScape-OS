package org.soloscape.teavm.platform.awt;
public final class Color {
    public static final Color black=new Color(0,0,0),BLACK=black;
    public static final Color white=new Color(255,255,255),WHITE=white;
    public static final Color red=new Color(255,0,0),RED=red, green=new Color(0,255,0),GREEN=green, blue=new Color(0,0,255),BLUE=blue;
    public static final Color yellow=new Color(255,255,0),YELLOW=yellow, orange=new Color(255,200,0),ORANGE=orange;
    public static final Color gray=new Color(128,128,128),GRAY=gray, lightGray=new Color(192,192,192),LIGHT_GRAY=lightGray, darkGray=new Color(64,64,64),DARK_GRAY=darkGray;
    public static final Color cyan=new Color(0,255,255),CYAN=cyan, magenta=new Color(255,0,255),MAGENTA=magenta, pink=new Color(255,175,175),PINK=pink;
    private final int argb;
    public Color(int red,int green,int blue){if((red|green|blue)<0||red>255||green>255||blue>255)throw new IllegalArgumentException();argb=0xff000000|(red<<16)|(green<<8)|blue;}
    public Color(int rgb){argb=0xff000000|rgb;}
    public int getRGB(){return argb;}
}
