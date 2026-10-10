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
        for (int opcodeCount = 0; opcodeCount < 160 && p < bytes.length; opcodeCount++) {
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
            if (op == 2 || op == 3) {
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
            else if (op == 17 || op == 18 || op == 23 || op == 25 ||
                     op == 27 || op == 73 || op == 74 || op == 88 ||
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
