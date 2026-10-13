package org.soloscape.teavm.platform;

import java.util.ArrayDeque;
import java.util.concurrent.*;

/** FIFO worker using TeaVM cooperative threads; no native browser threads. */
public final class BrowserExecutors {
    private BrowserExecutors() { }
    public static ExecutorService newSingleThreadExecutor() { return new Worker(Thread::new); }
    public static ExecutorService newSingleThreadExecutor(ThreadFactory factory) { return new Worker(factory); }
    public static ScheduledExecutorService newScheduledThreadPool(int size) {
        if (size <= 0) throw new IllegalArgumentException("Pool size must be positive");
        return new Scheduler(size);
    }
    private static final class Worker implements ExecutorService {
        private final ThreadFactory factory;
        private final ArrayDeque<Task<?>> queue = new ArrayDeque<>();
        private boolean shutdown, running;
        Worker(ThreadFactory factory) { this.factory = java.util.Objects.requireNonNull(factory); }
        public synchronized <V> Future<V> submit(Callable<V> callable) {
            if (callable == null) throw new NullPointerException();
            if (shutdown) throw new IllegalStateException("Executor is shut down");
            Task<V> task = new Task<>(callable); queue.add(task);
            if (!running) { running = true; factory.newThread(this::drain).start(); }
            return task;
        }
        public Future<?> submit(Runnable runnable) {
            if (runnable == null) throw new NullPointerException();
            return submit(() -> { runnable.run(); return null; });
        }
        public void execute(Runnable runnable) { submit(runnable); }
        public synchronized void shutdown() { shutdown = true; }
        public synchronized java.util.List<Runnable> shutdownNow() {
            shutdown = true;
            java.util.List<Runnable> pending = new java.util.ArrayList<>();
            Task<?> task;
            while ((task = queue.poll()) != null) { task.cancel(false); pending.add(task); }
            return pending;
        }
        public synchronized boolean isShutdown() { return shutdown; }
        public synchronized boolean isTerminated() { return shutdown && !running; }
        private void drain() {
            while (true) {
                Task<?> task;
                synchronized (this) {
                    task = queue.poll();
                    if (task == null) { running = false; return; }
                }
                task.run();
            }
        }
    }
    private static final class Scheduler implements ScheduledExecutorService {
        private final ThreadPoolExecutor worker;
        private final java.util.List<Periodic> timers = new java.util.ArrayList<>();
        Scheduler(int size) { worker = new ThreadPoolExecutor(size,size,0,TimeUnit.MILLISECONDS,new LinkedBlockingQueue<>(),Thread::new); }
        public <V> Future<V> submit(Callable<V> callable) { return worker.submit(callable); }
        public Future<?> submit(Runnable runnable) { return worker.submit(runnable); }
        public void execute(Runnable runnable) { worker.execute(runnable); }
        public boolean isShutdown() { return worker.isShutdown(); }
        public synchronized boolean isTerminated() {
            for (Periodic timer : timers) if (!timer.isDone()) return false;
            return worker.isTerminated();
        }
        public synchronized void shutdown() { for (Periodic timer : timers) timer.cancel(false); worker.shutdown(); }
        public synchronized java.util.List<Runnable> shutdownNow() {
            for (Periodic timer : timers) timer.cancel(false);
            return worker.shutdownNow();
        }
        public synchronized ScheduledFuture<?> scheduleAtFixedRate(Runnable runnable, long delay, long period, TimeUnit unit) {
            if (period <= 0) throw new IllegalArgumentException("Period must be positive");
            if (isShutdown()) throw new IllegalStateException("Executor is shut down");
            Periodic timer = new Periodic(worker, runnable, unit.toNanos(Math.max(0, delay)), unit.toNanos(period));
            timers.add(timer); new Thread(timer::run).start(); return timer;
        }
    }
    private static final class Periodic implements ScheduledFuture<Object> {
        private final Runnable runnable;
        private final ExecutorService worker;
        private final long period;
        private volatile long next;
        private volatile boolean cancelled, done;
        private Throwable failure;
        Periodic(ExecutorService worker, Runnable runnable, long delay, long period) {
            this.worker=worker;this.runnable = java.util.Objects.requireNonNull(runnable); this.period=period; next=System.nanoTime()+delay;
        }
        void run() {
            try {
                while (!cancelled) {
                    long remaining = next-System.nanoTime();
                    if (remaining > 0) { Thread.sleep(Math.max(1, TimeUnit.NANOSECONDS.toMillis(remaining))); continue; }
                    worker.submit(() -> { if (!cancelled) runnable.run(); }).get(); next+=period;
                }
            } catch (Throwable error) { failure=error instanceof ExecutionException ? error.getCause() : error; }
            finally { done=true; }
        }
        public boolean cancel(boolean interrupt) { if (done || cancelled) return false; cancelled=true; return true; }
        public boolean isCancelled() { return cancelled; }
        public boolean isDone() { return done || cancelled; }
        public Object get() throws InterruptedException, ExecutionException {
            while (!isDone()) Thread.sleep(1);
            if (cancelled) throw new CancellationException();
            throw new ExecutionException(failure);
        }
        public Object get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
            long start=System.nanoTime(), duration=unit.toNanos(timeout);
            while (!isDone()) { if (System.nanoTime()-start>=duration) throw new TimeoutException(); Thread.sleep(1); }
            return get();
        }
        public long getDelay(TimeUnit unit) { return unit.convert(next-System.nanoTime(), TimeUnit.NANOSECONDS); }
    }
    private static final class Task<V> implements Future<V>, Runnable {
        private final Callable<V> callable;
        private boolean done, cancelled;
        private Thread runner;
        private V value;
        private Throwable failure;
        Task(Callable<V> callable) { this.callable = callable; }
        public void run() {
            synchronized (this) { if (done) return; runner = Thread.currentThread(); }
            try { V result = callable.call(); synchronized (this) { value = result; } }
            catch (Throwable error) { synchronized (this) { failure = error; } }
            finally { synchronized (this) { done = true; } }
        }
        public synchronized boolean cancel(boolean interrupt) {
            if (done) return false;
            if (interrupt && runner != null) runner.interrupt();
            cancelled = true; done = true; return true;
        }
        public synchronized boolean isCancelled() { return cancelled; }
        public synchronized boolean isDone() { return done; }
        private synchronized V result() throws ExecutionException {
            if (cancelled) throw new CancellationException();
            if (failure != null) throw new ExecutionException(failure);
            return value;
        }
        public V get() throws InterruptedException, ExecutionException {
            while (!isDone()) Thread.sleep(1);
            return result();
        }
        public V get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
            long duration = unit.toNanos(timeout), start = System.nanoTime();
            while (!isDone()) {
                if (System.nanoTime() - start >= duration) throw new TimeoutException();
                Thread.sleep(1);
            }
            return result();
        }
    }
}
