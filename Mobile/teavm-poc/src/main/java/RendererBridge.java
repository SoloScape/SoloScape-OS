import org.teavm.jso.JSExport;
import org.soloscape.teavm.Js5Core;

/**
 * Local-only rev-240 OpenOSRS Rasterizer2D bridge, pinned to gamepack SHA-256
 * 25f42961c400bd9dfff1554402441c0ba6d1cffd011163cb9b0b4c42ae194f85.
 *
 * Uses the actual obfuscated "yw" renderer bytecode from the owner's local
 * injected-client.oprs; no substitute Java rasterizer is supplied here.
 * This source cannot compile without that exact local gamepack.
 */
public final class RendererBridge {
    public static final int WIDTH = 256;
    public static final int HEIGHT = 160;
    private static final char[] DIGITS = "0123456789abcdef".toCharArray();

    private RendererBridge() { }
    public static void main(String[] args) {
        System.out.println(Integer.toUnsignedString(framebufferHash()));
    }

    @JSExport public static int revision() { return Js5Core.revision(); }
    @JSExport public static int mapSquare(int x, int y) { return Js5Core.mapSquare(x, y); }
    @JSExport public static int crc32Hex(String data) { return Js5Core.crc32Hex(data); }

    @JSExport public static int width() { return WIDTH; }
    @JSExport public static int height() { return HEIGHT; }

    /**
     * Render a diagnostic using ORIGINAL OpenOSRS Rasterizer2D code:
     * de: set 2D frame buffer; dn: set clipping rectangle; fn: fill rectangle;
     * The untouched original methods output pixels, not drawing commands.
     *
     * This is an authentic primitive test, NOT a playable game scene.
     */
    public static int[] rasterize() {
        int[] pixels = new int[WIDTH * HEIGHT];
        yw.aj = pixels;
        yw.ay = WIDTH;
        yw.aq = HEIGHT;
        yw.ad = null;
        yw.dn(0, 0, WIDTH, HEIGHT);
        yw.fn(0, 0, WIDTH, HEIGHT, 0x101922);
        yw.fn(12, 12, WIDTH - 24, HEIGHT - 24, 0x30435a);
        yw.fn(24, 24, 110, 82, 0xd5a15f);
        yw.fn(78, 40, 124, 96, 0x3e9b94);
        yw.fn(56, 52, 120, 48, 0x662eae);
        yw.dn(40, 26, 218, 138);
        yw.fn(0, 118, WIDTH, 30, 0xcf6859); // must clip precisely at y=138
        yw.dn(0, 0, WIDTH, HEIGHT);
        return pixels;
    }

    @JSExport public static String renderHex() {
        int[] pixels = rasterize();
        char[] out = new char[pixels.length * 6];
        for (int n = 0, i = 0; n < pixels.length; n++) {
            int pixel = pixels[n];
            for (int j = 5; j >= 0; j--) {
                out[i + j] = DIGITS[pixel & 15];
                pixel >>>= 4;
            }
            i += 6;
        }
        return new String(out);
    }

    @JSExport public static int sample(int x, int y) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT)
            throw new IllegalArgumentException("Pixel out of range");
        return rasterize()[y * WIDTH + x];
    }

    @JSExport public static int framebufferHash() {
        int hash = 0x811c9dc5;
        for (int pixel : rasterize()) {
            hash ^= pixel;
            hash *= 0x01000193;
        }
        return hash;
    }
}
