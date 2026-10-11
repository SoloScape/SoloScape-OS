import java.util.Arrays;

public final class OriginalLocationModelsTest {
    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        // Fixed rev-240 definition 879: both Lumbridge courtyard fountains.
        byte[] fountain = {14,2,15,2,68,0,8,19,1,78,8,102,7,0,61,0,
            (byte)244,39,20,18,7,1,0,0,5,(byte)217,2,70,111,117,110,116,97,105,110,0,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(fountain, null),
            new int[]{1497}), "fountain model after four-byte sound metadata");
        int[] existing = {42};
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(fountain, existing) == existing,
            "preserve existing original model list");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{78,0,1,7,1,0}, null) == null, "do not interpret sound bytes as opcodes");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{78,0,1,2,3,7,1,0,0}, null) == null, "reject truncated model list");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{6,1,0,0,5,(byte)217,10,0}, null) == null, "preserve typed model path");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{126,0,7,1,0,0,5,(byte)217,0}, null) == null, "reject unknown prefix");
        byte[] flags = {21,22,62,64,7,1,0,0,5,(byte)217,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(flags, null),
            new int[]{1497}), "restore after contour, normals, rotate and clip flags");
        byte[] actions = {30,'O','p','e','n',0,31,0,32,'L','o','o','k',0,
            33,0,34,0,7,1,0,0,5,(byte)217,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(actions, null),
            new int[]{1497}), "restore after all five action strings");
        byte[] variableSound = {79,0,(byte)150,0,(byte)250,5,0,3,
            12,29,12,29,9,107,7,1,0,0,(byte)154,8,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(variableSound, null),
            new int[]{39432}), "restore after opcode 79 sound array");
        byte[] extended = {93,0,0,10,0,0,10,7,1,0,0,(byte)228,(byte)131,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(extended, null),
            new int[]{58499}), "restore after opcode 93 metadata");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{30,'U','n','f','i','n','i','s','h','e','d'}, null) == null,
            "reject unterminated action");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{79,0,1,0,2,3,4,2,0,1,7,1,0,0,0}, null) == null,
            "reject truncated opcode 79 payload");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{93,0,0,0,0,7,1}, null) == null,
            "reject truncated opcode 93 payload");
        byte[] extendedAction = {101,0,(byte)255,(byte)255,0x3c,0x68,
            0,0,0,0,0,0,0,(byte)176,0,7,1,0,0,20,33,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(extendedAction, null),
            new int[]{5153}), "restore after opcode 101 extended action");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{101,2,0,0,0,0,0,0,0,0,7,1,0,0,0}, null) == null,
            "reject truncated opcode 101 extended action");
        byte[] manyExtendedActions = new byte[200 * (1 + 13 + 1) + 7];
        for (int i = 0; i < 200; i++) {
            int at = i * 15;
            manyExtendedActions[at] = 101;
            manyExtendedActions[at + 1] = 2;
        }
        int end = manyExtendedActions.length - 7;
        manyExtendedActions[end] = 7;
        manyExtendedActions[end + 1] = 1;
        manyExtendedActions[end + 5] = 42;
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            manyExtendedActions, null), new int[]{42}), "read >160 valid extended actions");
        byte[] optionalActions = {100,3,7,'F','a','v',0,
            102,3,0,10,(byte)255,(byte)255,0x4f,0x19,0,0,0,125,0,0,0,125,
            'A','J','S',0,7,1,0,0,5,(byte)217,0};
        check(Arrays.equals(BrowserOriginalLocationModels.restoreMissingUntypedModels(optionalActions, null),
            new int[]{1497}), "restore after original extended actions 100 and 102");
        check(BrowserOriginalLocationModels.restoreMissingUntypedModels(
            new byte[]{102,3,0,10,0,0,0,0,0,0}, null) == null,
            "reject truncated opcode 102 extended action");
        System.out.println("PASS: rev-240 original location model prefixes and bounds checks");
    }
}
