package org.soloscape.teavm.platform;
import java.util.concurrent.*;
public interface ExecutorService extends Executor {
    <V> Future<V> submit(Callable<V> callable);
    Future<?> submit(Runnable runnable);
    void shutdown();
    java.util.List<Runnable> shutdownNow();
    boolean isShutdown();
    boolean isTerminated();
}
