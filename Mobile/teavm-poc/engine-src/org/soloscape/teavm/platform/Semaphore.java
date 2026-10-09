package org.soloscape.teavm.platform;
public final class Semaphore {
    private int permits;
    public Semaphore(int permits) { this.permits=permits; }
    public void acquire() throws InterruptedException {
        if(Thread.interrupted())throw new InterruptedException();
        while (true) { synchronized(this) { if (permits>0) { permits--; return; } } Thread.sleep(1); }
    }
    public synchronized void release() { permits++; }
    public synchronized int availablePermits() { return permits; }
}
