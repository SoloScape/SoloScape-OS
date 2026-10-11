import java.io.DataInputStream;
import java.io.EOFException;
import java.io.FileInputStream;
import java.util.Arrays;

/** Optional pinned-rev-240 corpus check against audited JVM model lists. */
public final class OriginalLocationCorpusTest {
    public static void main(String[] args) throws Exception {
        int definitions = 0;
        int nonempty = 0;
        try (DataInputStream input = new DataInputStream(new FileInputStream(args[0]))) {
            while (true) {
                int id;
                try {
                    id = input.readInt();
                } catch (EOFException end) {
                    break;
                }
                int length = input.readInt();
                int count = input.readInt();
                if (length < 0 || length > 1000000 || count < 0 || count > 1000)
                    throw new AssertionError("Invalid audit record for " + id);
                byte[] raw = new byte[length];
                input.readFully(raw);
                int[] expected = new int[count];
                for (int i = 0; i < count; i++) expected[i] = input.readInt();
                int[] decoded = BrowserOriginalLocationModels.restoreMissingUntypedModels(raw, null);
                if (!Arrays.equals(expected, decoded == null ? new int[0] : decoded))
                    throw new AssertionError("Untyped model list differs at definition " + id +
                        ", expected " + Arrays.toString(expected) +
                        ", restored " + Arrays.toString(decoded));
                definitions++;
                if (count > 0) nonempty++;
            }
        }
        if (definitions != 62522 || nonempty != 36639)
            throw new AssertionError("Unexpected pinned corpus size: " + definitions +
                " definitions, " + nonempty + " untyped model lists");
        System.out.println("PASS: " + definitions + " original JVM definitions, " +
            nonempty + " untyped model lists, zero differences");
    }
}
