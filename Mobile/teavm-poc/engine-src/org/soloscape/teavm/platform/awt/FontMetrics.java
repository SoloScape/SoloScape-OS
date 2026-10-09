package org.soloscape.teavm.platform.awt;
import org.soloscape.teavm.platform.awt.geom.Rectangle2D;
public final class FontMetrics {
    private final Graphics graphics;
    FontMetrics(Graphics graphics){this.graphics=graphics;}
    public int stringWidth(String text){return (int)Math.round(NativeCanvas.measure(graphics.context(),text));}
    public Rectangle2D getStringBounds(String text,Graphics context){return new Rectangle2D(NativeCanvas.measure(context.context(),text));}
}
