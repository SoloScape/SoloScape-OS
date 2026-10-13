import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutionException;
import java.util.regex.Pattern;
import org.soloscape.teavm.platform.*;
import org.soloscape.teavm.platform.awt.*;
import org.soloscape.teavm.platform.awt.event.*;
import org.soloscape.teavm.platform.awt.image.*;
import org.teavm.jso.*;

/** Focused executable proof, separate from whole-engine reachability. */
public final class PlatformProof {
    public static void main(String[] args) { }
    private static void check(boolean condition, String name) {
        if (!condition) throw new AssertionError(name);
    }
    @JSExport public static void verify() {
        new Thread(() -> {
            try { run(); finished("PASS"); }
            catch (Throwable error) { finished(error.toString()); }
        }).start();
    }
    private static void run() throws Exception {
        check(BrowserClasses.engineLoader() != null, "linked class loader");
        System.setProperty("runelite.reflectcheck.jar", "external.jar");
        try { BrowserClasses.engineLoader(); throw new AssertionError("External JAR accepted"); }
        catch (UnsupportedOperationException expected) { }
        finally { System.clearProperty("runelite.reflectcheck.jar"); }
        byte[] resource={7,8};BrowserResources.register("proof/data",resource);resource[0]=99;
        check(BrowserResources.stream(null,"proof/data").read()==7,"resource byte ownership");
        check(BrowserResources.stream(null,"missing")==null,"missing resources");
        check(BrowserResources.resources(null,"proof/data").nextElement().openStream().read()==7,"resource enumeration URL");
        check(BrowserResources.classStream(PlatformProof.class,"/proof/data").read()==7,"absolute class resource");
        check(BrowserRegex.replaceAll(Pattern.compile("(a)").matcher("a a"), m -> "$1!").equals("a! a!"), "regex groups");
        check(BrowserRegex.replaceAll(Pattern.compile("x").matcher("none"), m -> "unused").equals("none"), "regex no matches");
        check(BrowserRegex.replaceAll(Pattern.compile("").matcher("ab"), m -> "-").equals("-a-b-"), "regex empty matches");
        check(BrowserRegex.replaceAll(Pattern.compile("a").matcher("a"), m -> "\\$").equals("$"), "regex escaping");
        java.util.regex.Matcher mutation = Pattern.compile("a").matcher("aa");
        try { BrowserRegex.replaceAll(mutation, m -> { mutation.find(); return "x"; }); throw new AssertionError("Matcher mutation accepted"); }
        catch (java.util.ConcurrentModificationException expected) { }
        Panel panel = new Panel(); Canvas canvas = new Canvas(); panel.add(canvas);
        check(canvas.getParent() == panel, "component parent");
        final int[] resized = {0}, keys = {0};
        canvas.addComponentListener(new ComponentAdapter() { public void componentResized(ComponentEvent event) { resized[0]++; } });
        canvas.setSize(new Dimension(765,503));
        check(canvas.getWidth()==765 && canvas.getHeight()==503 && resized[0]==1, "component resize");
        canvas.addKeyListener(new KeyListener() {
            public void keyTyped(KeyEvent e) { }
            public void keyReleased(KeyEvent e) { }
            public void keyPressed(KeyEvent e) { keys[0]=e.getKeyCode();e.consume(); }
        });
        KeyEvent key = new KeyEvent(canvas,401,0,128,65,'a');canvas.dispatchKey(key);
        check(keys[0]==65 && key.isConsumed() && key.isControlDown(), "input consumption");
        BufferedImage image=new BufferedImage(2,1,BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0,0,2,1,new int[]{0xffff0000,0x8000ff00},0,2);
        int[] pixels=new int[2];new PixelGrabber(image,0,0,2,1,pixels,0,2).grabPixels();
        check(pixels[0]==0xffff0000 && pixels[1]==0x8000ff00,"ARGB backing buffer");
        BrowserLoggerFactory.getLogger("platform-proof").warn("value {}", 42);
        BrowserLoggerFactory.getLogger("platform-proof").error("failure {}", "test", new IllegalArgumentException("sentinel"));
        ExecutorService worker=BrowserExecutors.newSingleThreadExecutor();
        final StringBuilder order=new StringBuilder();
        Future<Integer> first=worker.submit(()->{Thread.sleep(10);order.append('a');return 7;});
        Future<?> second=worker.submit(()->order.append('b'));
        check(first.get()==7,"future result");second.get();check(order.toString().equals("ab"),"FIFO executor");
        Future<?> failure=worker.submit(()->{throw new IllegalArgumentException("task");});
        try{failure.get();throw new AssertionError("Task exception lost");}catch(ExecutionException expected){check(expected.getCause() instanceof IllegalArgumentException,"task cause");}
        Future<?> slow=worker.submit(()->{Thread.sleep(30);return null;});
        try{slow.get(1,TimeUnit.MILLISECONDS);throw new AssertionError("Timeout lost");}catch(TimeoutException expected){}
        Future<?> cancelled=worker.submit(()->{throw new AssertionError("Cancelled task ran");});
        check(cancelled.cancel(false)&&cancelled.isCancelled(),"queued cancellation");slow.get();
        try{cancelled.get();throw new AssertionError("Cancellation lost");}catch(java.util.concurrent.CancellationException expected){}
        worker.shutdown();
        try{worker.submit(()->1);throw new AssertionError("Shutdown accepted work");}catch(IllegalStateException expected){}
        Thread.sleep(5);check(worker.isTerminated(),"worker termination");
        ThreadPoolExecutor pool=new ThreadPoolExecutor(2,2,0,TimeUnit.MILLISECONDS,new java.util.concurrent.ArrayBlockingQueue<>(4),Thread::new);
        check(pool.submit(()->9).get()==9,"pool result");pool.shutdown();
        LinkedBlockingQueue<Integer> queue=new LinkedBlockingQueue<>();queue.put(3);check(queue.take()==3,"blocking queue");
        check(queue.poll(1,TimeUnit.MILLISECONDS)==null,"queue timeout");
        Semaphore semaphore=new Semaphore(1);semaphore.acquire();semaphore.release();check(semaphore.availablePermits()==1,"semaphore");
        ReentrantLock lock=new ReentrantLock();lock.lock();check(lock.tryLock(),"reentrant lock");lock.unlock();lock.unlock();
        ScheduledExecutorService scheduler=BrowserExecutors.newScheduledThreadPool(1);
        final int[] ticks={0};ScheduledFuture<?> timer=scheduler.scheduleAtFixedRate(()->ticks[0]++,0,5,TimeUnit.MILLISECONDS);
        long scheduleDeadline=System.currentTimeMillis()+1000;
        while(ticks[0]<2&&System.currentTimeMillis()<scheduleDeadline)Thread.sleep(5);
        check(ticks[0]>=2,"scheduled repetition");timer.cancel(false);int stopped=ticks[0];
        Thread.sleep(15);check(ticks[0]==stopped,"scheduled cancellation");scheduler.shutdown();
        ExecutorService stop=BrowserExecutors.newSingleThreadExecutor();
        Future<?> active=stop.submit(()->{Thread.sleep(20);return null;});
        Future<?> pending=stop.submit(()->{throw new AssertionError("Shutdown task ran");});
        check(stop.shutdownNow().size()>=1 && pending.isCancelled(),"shutdownNow pending tasks");
        if(!active.isCancelled())active.get();
        ScheduledExecutorService failedScheduler=BrowserExecutors.newScheduledThreadPool(1);
        ScheduledFuture<?> failedTimer=failedScheduler.scheduleAtFixedRate(()->{throw new IllegalArgumentException("periodic");},0,1,TimeUnit.MILLISECONDS);
        try{failedTimer.get(1000,TimeUnit.MILLISECONDS);throw new AssertionError("Periodic exception lost");}
        catch(ExecutionException expected){check(expected.getCause() instanceof IllegalArgumentException,"periodic cause");}
        failedScheduler.shutdown();
    }
    @JSExport public static boolean graphics() {
        BufferedImage image=new BufferedImage(2,1,BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0,0,2,1,new int[]{0xffff0000,0x8000ff00},0,2);
        if (!pixelCheck(image.surface())) return false;
        Graphics g=image.getGraphics();g.setColor(Color.blue);g.fillRect(0,0,1,1);
        return image.pixelData()[0]==0xff0000ff;
    }
    @JSExport public static boolean input() {
        NativeCanvas.hostId="input-proof";Canvas canvas=new Canvas();canvas.setSize(100,100);
        final int[] received={0};
        canvas.addKeyListener(new KeyListener() {
            public void keyTyped(KeyEvent e){}
            public void keyReleased(KeyEvent e){}
            public void keyPressed(KeyEvent e){received[0]=e.getKeyCode();e.consume();}
        });
        canvas.getGraphics();boolean prevented=keyCheck();NativeCanvas.hostId=null;
        return received[0]==65&&prevented;
    }
    @JSBody(script="const e=new KeyboardEvent('keydown',{key:'a',keyCode:65,bubbles:true,cancelable:true});document.getElementById('input-proof').dispatchEvent(e);return e.defaultPrevented;")
    private static native boolean keyCheck();
    @JSBody(params={"canvas"},script="const p=canvas.getContext('2d').getImageData(0,0,2,1).data;return p[0]===255&&p[1]===0&&p[3]===255&&p[4]===0&&p[5]===255&&p[7]===128;")
    private static native boolean pixelCheck(JSObject canvas);
    @JSBody(params={"result"},script="globalThis.soloscapePlatformResult=result;")
    private static native void finished(String result);
}
