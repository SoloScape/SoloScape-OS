package org.soloscape.teavm.platform;
import java.util.concurrent.TimeUnit;
public interface ScheduledFuture<V> extends Future<V> { long getDelay(TimeUnit unit); }
