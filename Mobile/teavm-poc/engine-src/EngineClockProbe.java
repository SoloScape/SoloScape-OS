/**
 * Read-only telemetry around the pinned original game engine's clock.
 * The clock itself still computes the exact same number of game cycles.
 */
public final class EngineClockProbe {
    private static int calls;
    private static int ticks;
    private static int lastTicks;
    private static int maxTicks;
    private static long lastStartNanos;
    private static long lastCallGapNanos;
    private static long lastClockDurationNanos;
    private EngineClockProbe() {}

    public static int sample(mh clock, int cycleMillis, int minWaitMillis) {
        long start = System.nanoTime();
        if (lastStartNanos != 0) lastCallGapNanos = start - lastStartNanos;
        lastStartNanos = start;
        int result = clock.ip(cycleMillis, minWaitMillis);
        lastClockDurationNanos = System.nanoTime() - start;
        calls++;
        ticks += result;
        lastTicks = result;
        if (result > maxTicks) maxTicks = result;
        return result;
    }

    public static int calls() { return calls; }
    public static int ticks() { return ticks; }
    public static int lastTicks() { return lastTicks; }
    public static int maxTicks() { return maxTicks; }
    public static int lastCallGapMs() { return (int)(lastCallGapNanos / 1000000L); }
    public static int lastClockDurationMs() { return (int)(lastClockDurationNanos / 1000000L); }
}
