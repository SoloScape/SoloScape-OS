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
        System.out.println("PASS: Lumbridge fountain model restoration and bounded prefix handling");
    }
}
