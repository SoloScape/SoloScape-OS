import java.util.List;
import net.runelite.api.MainBufferProvider;
import net.runelite.api.Renderable;
import net.runelite.api.hooks.Callbacks;
import net.runelite.api.widgets.Widget;
import net.runelite.api.widgets.WidgetItem;
import org.soloscape.teavm.platform.awt.Graphics;
import org.soloscape.teavm.platform.awt.event.KeyEvent;
import org.soloscape.teavm.platform.awt.event.MouseEvent;
import org.soloscape.teavm.platform.awt.event.MouseWheelEvent;

/**
 * Built-in browser host for the injected client's required callbacks.
 * Not the desktop Hooks plugin/event bus or a substitute for game cycles.
 * All original simulation and software framebuffer rendering remain in client.
 */
public final class BrowserEngineCallbacks implements Callbacks {
    private String lastError = "";
    public String lastError() { return lastError; }

    @Override public void post(Object event) { }
    @Override public void postDeferred(Object event) { }
    @Override public void tick() { }
    @Override public void tickEnd() { }
    @Override public void frame() { }
    @Override public void serverTick() { }
    @Override public void drawScene() { }
    @Override public void drawAboveOverheads() { }
    @Override public void draw(MainBufferProvider buffer, Graphics graphics, int x, int y) {
        // In desktop RuneLite Hooks.draw() composites the original software
        // buffer after the game renders. Leaving this callback empty shows
        // only the initial AWT loading bar even after LOGIN_SCREEN begins.
        // Use the original buffer pixels, not a synthetic title renderer.
        if (graphics != null && buffer != null && buffer.getImage() != null)
            graphics.drawImage(buffer.getImage(), x, y, null);
    }
    @Override public void drawInterface(int id, List<WidgetItem> items) { }
    @Override public void drawLayer(Widget layer, List<WidgetItem> items) { }
    @Override public MouseEvent mousePressed(MouseEvent event) { return event; }
    @Override public MouseEvent mouseReleased(MouseEvent event) { return event; }
    @Override public MouseEvent mouseClicked(MouseEvent event) { return event; }
    @Override public MouseEvent mouseEntered(MouseEvent event) { return event; }
    @Override public MouseEvent mouseExited(MouseEvent event) { return event; }
    @Override public MouseEvent mouseDragged(MouseEvent event) { return event; }
    @Override public MouseEvent mouseMoved(MouseEvent event) { return event; }
    @Override public MouseWheelEvent mouseWheelMoved(MouseWheelEvent event) { return event; }
    @Override public void keyPressed(KeyEvent event) { }
    @Override public void keyReleased(KeyEvent event) { }
    @Override public void keyTyped(KeyEvent event) { }
    @Override public boolean draw(Renderable renderable, boolean drawingUi) { return true; }
    @Override public void error(String message, Throwable reason) {
        lastError = (message == null ? "unknown" : message) +
            (reason == null ? "" : ": " + reason.toString());
        System.err.println("[original-engine] " + lastError);
    }
    @Override public void openUrl(String url) {
        // A native desktop browser-launch operation is not permitted in this
        // isolated, browser-origin diagnostic. Never navigate automatically.
        System.err.println("[original-engine] suppressed external URL launch");
    }
    @Override public boolean isRuneLiteClientOutdated() { return false; }
}
