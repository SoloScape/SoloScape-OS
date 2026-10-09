package org.soloscape.teavm;
import org.teavm.jso.JSExport;

/** Original SoloScape Java bytecode feasibility core, NOT the OpenOSRS engine. */
public final class Js5Core {
    private Js5Core() { }
    public static void main(String[] args) { }
    @JSExport public static int revision() { return 240; }

    /** Standard CRC32 for a native JS5 cache container, compiled by TeaVM. */
    @JSExport public static int crc32Hex(String hex) {
        if (hex == null || (hex.length() & 1) != 0 || hex.length() > 4 * 1024 * 1024) {
            throw new IllegalArgumentException("Invalid cache container hex size");
        }
        int crc = -1;
        for (int i = 0; i < hex.length(); i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi < 0 || lo < 0) throw new IllegalArgumentException("Invalid cache container hex");
            crc ^= (hi << 4) | lo;
            for (int bit = 0; bit < 8; bit++) {
                crc = (crc >>> 1) ^ ((crc & 1) == 1 ? 0xEDB88320 : 0);
            }
        }
        return crc ^ -1;
    }

    /** OSRS map-square index; does not render or launch the Java game. */
    @JSExport public static int mapSquare(int x, int y) {
        if (x < 0 || y < 0 || x > 16383 || y > 16383)
            throw new IllegalArgumentException("World tile out of range");
        return ((x >>> 6) << 8) | (y >>> 6);
    }
}
