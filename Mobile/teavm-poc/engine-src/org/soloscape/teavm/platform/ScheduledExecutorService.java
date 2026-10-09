package org.soloscape.teavm.platform;
import java.util.List; import java.util.concurrent.TimeUnit;
public interface ScheduledExecutorService extends ExecutorService {
    ScheduledFuture<?> scheduleAtFixedRate(Runnable task, long delay, long period, TimeUnit unit);
    List<Runnable> shutdownNow();
}
