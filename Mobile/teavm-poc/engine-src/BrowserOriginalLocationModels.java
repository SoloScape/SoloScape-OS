/**
 * Narrow TeaVM cache-compatibility shim for pinned rev-240 location definitions.
 * The original om constructor leaves its model-ID array null for some valid
 * opcode-7 (untyped 32-bit model ID) definitions. This restores ONLY that
 * model-ID list from the SAME original definition bytes when missing.
 *
 * It does not draw anything, create world objects, alter placement/state,
 * change model IDs or override correctly decoded typed definitions.
 */
public final class BrowserOriginalLocationModels {
    private BrowserOriginalLocationModels() { }

    public static int[] restoreMissingUntypedModels(byte[] bytes, int[] decoded) {
        if ((decoded != null && decoded.length > 0) || bytes == null || bytes.length < 6 || bytes.length > 65536)
            return decoded;
        int p = 0;
        // Each iteration advances p by at least one byte. The byte length,
        // rather than an arbitrary opcode count, bounds large valid action tables.
        for (int opcodeCount = 0; opcodeCount < bytes.length && p < bytes.length; opcodeCount++) {
            int op = bytes[p++] & 255;
            if (op == 7) {
                if (p >= bytes.length) return decoded;
                int n = bytes[p++] & 255;
                if (n <= 0 || n > 64 || (long)p + (long)n * 4 > bytes.length)
                    return decoded;
                int[] ids = new int[n];
                for (int i = 0; i < n; i++) {
                    int modelId = (bytes[p] & 255) << 24 |
                        (bytes[p + 1] & 255) << 16 |
                        (bytes[p + 2] & 255) << 8 | bytes[p + 3] & 255;
                    if (modelId < 0 || modelId > 1000000) return decoded;
                    ids[i] = modelId;
                    p += 4;
                }
                return ids;
            }
            if (op == 0 || op == 1 || op == 5 || op == 6)
                return decoded; // Never reinterpret other model formats.
            int skip = 0;
            if (op == 2 || op == 3 || (op >= 30 && op <= 34) ||
                (op >= 100 && op <= 102)) {
                // Extended actions from the pinned original decoder:
                // 100: two numeric bytes; 101: thirteen; 102: fifteen.
                // Each is followed by a null-terminated label.
                int fixed = op == 100 ? 2 : op == 101 ? 13 : op == 102 ? 15 : 0;
                if ((long)p + fixed >= bytes.length) return decoded;
                p += fixed;
                int end = p;
                while (end < bytes.length && bytes[end] != 0) end++;
                if (end == bytes.length) return decoded;
                p = end + 1;
                continue;
            }
            if (op == 29 || op == 39 || op == 14 || op == 15 ||
                op == 19 || op == 28 || op == 69 || op == 75 || op == 91 ||
                op == 95 || op == 96 || op == 104 || op == 81) skip = 1;
            else if (op == 24 || op == 61 || op == 60 ||
                     op == 68 || op == 82 || op == 107 ||
                     op == 42 || op == 44 || op == 45 || op == 167 ||
                     op == 65 || op == 66 || op == 67 ||
                     op == 70 || op == 71 || op == 72)
                skip = 2;
            // Rev-240 ambient sound: unsigned short ID, range, retain byte.
            // Lumbridge's fountain has this before its opcode-7 model list.
            else if (op == 78) skip = 4;
            // Pinned rev-240 opcode 93 carries six bytes of metadata.
            else if (op == 93) skip = 6;
            // Sound variant 79: two shorts, two bytes, count and short IDs.
            else if (op == 79) {
                if ((long)p + 7 > bytes.length) return decoded;
                skip = 7 + 2 * (bytes[p + 6] & 255);
            }
            else if (op == 17 || op == 18 || op == 21 || op == 22 ||
                     op == 23 || op == 25 || op == 27 || op == 62 ||
                     op == 64 || op == 73 || op == 74 || op == 88 ||
                     op == 89 || op == 90 || op == 94 || op == 97 ||
                     op == 98 || op == 103 || op == 105 || op == 168 ||
                     op == 169 || op == 177) skip = 0;
            else if (op == 40 || op == 41) {
                if (p >= bytes.length) return decoded;
                skip = 4 * (bytes[p++] & 255);
            } else {
                return decoded; // Unknown prefixes must not be guessed.
            }
            if ((long)p + skip > bytes.length) return decoded;
            p += skip;
        }
        return decoded;
    }
}
