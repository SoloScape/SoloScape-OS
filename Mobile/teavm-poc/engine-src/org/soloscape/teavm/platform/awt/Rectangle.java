package org.soloscape.teavm.platform.awt;
import org.soloscape.teavm.platform.awt.Point;
public class Rectangle implements Shape {
    public int x,y,width,height;
    public Rectangle(int x,int y,int width,int height){this.x=x;this.y=y;this.width=width;this.height=height;}
    public boolean contains(Point p){return p.x>=x&&p.y>=y&&p.x<(long)x+width&&p.y<(long)y+height;}
}
