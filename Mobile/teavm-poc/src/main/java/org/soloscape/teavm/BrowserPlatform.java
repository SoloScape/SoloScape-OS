package org.soloscape.teavm;

import org.teavm.jso.JSExport;

/**
 * Browser platform contract for a future TeaVM engine port. Everything here
 * compiles from original SoloScape Java; this is NOT the OpenOSRS gamepack.
 *
 * Browser hosts canvas, pointer/keyboard events, timing and native JS5 IO.
 * Java owns input state and emits deterministic Canvas2D draw commands.
 * There is no AWT, reflection, Java thread or JVM socket dependency.
 */
public final class BrowserPlatform {
    public static final int WIDTH = 765;
    public static final int HEIGHT = 503;
    private static int pointerX = WIDTH / 2, pointerY = HEIGHT / 2;
    private static int down, scroll, offsetX, offsetY, ticks;
    private static int lastArchive = -1, lastGroup = -1, assetBytes;
    private static int transport; // 0 idle; 1 fetching; 2 verified; 3 failure
    private static int pressed; // arrow-key bitset
    private BrowserPlatform() {}

    @JSExport public static void reset() {
        pointerX = WIDTH / 2; pointerY = HEIGHT / 2;
        down = 0; scroll = 0; offsetX = 0; offsetY = 0;
        ticks = 0; pressed = 0;
        lastArchive = -1; lastGroup = -1; assetBytes = 0; transport = 0;
    }

    @JSExport public static String capabilities() {
        return "canvas2d,pointer,touch,keyboard,wheel,js5;no-awt,no-jvm-sockets,no-reflection,no-threads";
    }

    /** pointer state: 0 = move, 1 = down, 2 = up. All positions are logical OSRS pixels. */
    @JSExport public static void pointer(int x, int y, int state) {
        if (state < 0 || state > 2) throw new IllegalArgumentException("Invalid pointer state");
        pointerX = Math.max(0, Math.min(WIDTH - 1, x));
        pointerY = Math.max(0, Math.min(HEIGHT - 1, y));
        if (state == 1) down = 1;
        else if (state == 2) down = 0;
    }

    /** 37-40 = browser ArrowLeft/Up/Right/Down. 65/68/83/87 = WASD. */
    @JSExport public static void key(int code, boolean isDown) {
        final int bit;
        switch (code) {
            case 37: case 65: bit = 1; break;
            case 38: case 87: bit = 2; break;
            case 39: case 68: bit = 4; break;
            case 40: case 83: bit = 8; break;
            default: return;
        }
        if (isDown) pressed |= bit;
        else pressed &= ~bit;
    }

    @JSExport public static void wheel(int delta) {
        scroll = Math.max(-8, Math.min(8, scroll + Math.max(-3, Math.min(3, delta))));
    }

    /** A fixed-step Java simulation, independent of the browser render frequency. */
    @JSExport public static void tick() {
        ticks++;
        if ((pressed & 1) != 0) offsetX = Math.max(-256, offsetX - 3);
        if ((pressed & 2) != 0) offsetY = Math.max(-256, offsetY - 3);
        if ((pressed & 4) != 0) offsetX = Math.min(256, offsetX + 3);
        if ((pressed & 8) != 0) offsetY = Math.min(256, offsetY + 3);
    }

    /** Network adapter: caller must first validate revision-240 JS5 reference-table CRCs. */
    @JSExport public static boolean acceptVerifiedJs5(int archive, int group, int crc, String hex) {
        if (archive < 0 || archive > 254 || group < 0 || group > 65535 ||
                hex == null || hex.length() < 10 || hex.length() > 4 * 1024 * 1024 ||
                (hex.length() & 1) != 0) return false;
        if (Js5Core.crc32Hex(hex) != crc) return false;
        lastArchive = archive; lastGroup = group; assetBytes = hex.length() / 2;
        transport = 2;
        return true;
    }

    @JSExport public static void transportState(int state) {
        if (state < 0 || state > 3) throw new IllegalArgumentException("Invalid transport state");
        transport = state;
    }

    @JSExport public static int pointerX() { return pointerX; }
    @JSExport public static int pointerY() { return pointerY; }
    @JSExport public static int ticks() { return ticks; }
    @JSExport public static int offsetX() { return offsetX; }
    @JSExport public static int assetBytes() { return assetBytes; }
    @JSExport public static int transportState() { return transport; }

    private static void rect(StringBuilder out, int x, int y, int w, int h, String color) {
        out.append("R|").append(x).append('|').append(y).append('|')
                .append(w).append('|').append(h).append('|').append(color).append('\n');
    }
    private static void line(StringBuilder out, int x1, int y1, int x2, int y2, String color) {
        out.append("L|").append(x1).append('|').append(y1).append('|')
                .append(x2).append('|').append(y2).append('|').append(color).append('\n');
    }
    private static void label(StringBuilder out, int x, int y, String value, String color) {
        out.append("T|").append(x).append('|').append(y).append('|')
                .append(color).append('|').append(value).append('\n');
    }

    /**
     * Bounded display-list ABI interpreted by browser Canvas2D (never HTML).
     * A compatibility harness for a Java game loop, not synthetic OpenOSRS graphics.
     */
    @JSExport public static String drawCommands() {
        StringBuilder out = new StringBuilder(3200);
        rect(out, 0, 0, WIDTH, HEIGHT, "#0b121c");
        rect(out, 12, 12, WIDTH - 24, HEIGHT - 24, "#192635");
        for (int x = 30; x < WIDTH - 12; x += 48)
            line(out, x + offsetX % 48, 100, x + offsetX % 48, HEIGHT - 24, "#344456");
        for (int y = 100; y < HEIGHT - 24; y += 48)
            line(out, 12, y + offsetY % 48, WIDTH - 12, y + offsetY % 48, "#344456");
        rect(out, 12, 12, WIDTH - 24, 82, "#142030");
        label(out, 26, 39, "TeaVM Java platform harness - not the OpenOSRS engine", "#f0d997");
        label(out, 26, 68, "AWT replaced: Canvas2D    JVM sockets replaced: browser JS5", "#c9d7e9");
        String status = transport == 2 ? "verified " + lastArchive + ":" + lastGroup + " (" + assetBytes + " bytes)" :
                transport == 1 ? "fetching JS5" : transport == 3 ? "JS5 unavailable" : "JS5 idle";
        rect(out, 12, HEIGHT - 48, WIDTH - 24, 36, "#142030");
        label(out, 26, HEIGHT - 25, "Java tick " + ticks + "    Wheel " + scroll +
                "    Cache: " + status, "#d6e3f5");
        String color = down == 1 ? "#ffb84d" : "#78c6e8";
        rect(out, pointerX - 9, pointerY - 9, 18, 18, color);
        line(out, pointerX - 16, pointerY, pointerX + 16, pointerY, "#ffffff");
        line(out, pointerX, pointerY - 16, pointerX, pointerY + 16, "#ffffff");
        label(out, 26, 125, "Touch/drag to move cursor. Use arrow keys or WASD to move grid.", "#d6e3f5");
        return out.toString();
    }
}
