package org.soloscape.teavm.platform;
import java.util.*; import java.util.concurrent.*;
/** Cooperative workers, matching the engine's bounded request queue. */
public final class ThreadPoolExecutor implements ExecutorService {
    private final int core;
    private final BlockingQueue<Runnable> queue;
    private final List<ExecutorService> workers=new ArrayList<>();
    private int cursor;
    private boolean shutdown;
    public ThreadPoolExecutor(int core,int maximum,long keepAlive,TimeUnit unit,BlockingQueue<Runnable> queue,ThreadFactory factory) {
        if(core<=0||maximum<core||keepAlive<0)throw new IllegalArgumentException();
        if(maximum!=core)throw new UnsupportedOperationException("Browser request pools require fixed worker counts");
        this.core=core;this.queue=Objects.requireNonNull(queue);Objects.requireNonNull(unit);
        for(int i=0;i<core;i++)workers.add(BrowserExecutors.newSingleThreadExecutor(factory));
    }
    public int getCorePoolSize(){return core;}
    public BlockingQueue<Runnable> getQueue(){return queue;}
    public synchronized <V> Future<V> submit(Callable<V> callable) {
        Objects.requireNonNull(callable); if(shutdown)throw new IllegalStateException("Executor is shut down");
        Request<V> request=new Request<>(callable);
        if(!queue.offer(request))throw new IllegalStateException("Executor request queue is full");
        ExecutorService worker=workers.get(cursor);cursor=(cursor+1)%core;
        worker.execute(()->{Runnable task=queue.poll();if(task!=null)task.run();});
        return request;
    }
    public Future<?> submit(Runnable runnable){ Objects.requireNonNull(runnable);return submit(()->{runnable.run();return null;});}
    public void execute(Runnable runnable){submit(runnable);}
    public synchronized void shutdown(){shutdown=true;for(ExecutorService worker:workers)worker.shutdown();}
    public synchronized List<Runnable> shutdownNow(){
        shutdown=true;List<Runnable> pending=new ArrayList<>();queue.drainTo(pending);
        for(Runnable task:pending)if(task instanceof Future<?>)((Future<?>)task).cancel(false);
        for(ExecutorService worker:workers)worker.shutdownNow();return pending;
    }
    public synchronized boolean isShutdown(){return shutdown;}
    public boolean isTerminated(){for(ExecutorService worker:workers)if(!worker.isTerminated())return false;return true;}
    private static final class Request<V> implements Future<V>,Runnable {
        private final Callable<V> callable; private volatile boolean done,cancelled;
        private Thread runner;
        private V value; private Throwable error;
        Request(Callable<V> callable){this.callable=callable;}
        public void run(){synchronized(this){if(done)return;runner=Thread.currentThread();}try{value=callable.call();}catch(Throwable e){error=e;}finally{done=true;}}
        public synchronized boolean cancel(boolean interrupt){if(done)return false;if(interrupt&&runner!=null)runner.interrupt();cancelled=true;done=true;return true;}
        public boolean isDone(){return done;} public boolean isCancelled(){return cancelled;}
        private V result()throws ExecutionException{if(cancelled)throw new CancellationException();if(error!=null)throw new ExecutionException(error);return value;}
        public V get()throws InterruptedException,ExecutionException{while(!done)Thread.sleep(1);return result();}
        public V get(long timeout,TimeUnit unit)throws InterruptedException,ExecutionException,TimeoutException {
            long start=System.nanoTime(),duration=unit.toNanos(timeout);
            while(!done){if(System.nanoTime()-start>=duration)throw new TimeoutException();Thread.sleep(1);}return result();
        }
    }
}
