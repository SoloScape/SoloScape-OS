package org.soloscape.teavm.platform;
/** Ownership remains meaningful across yielding TeaVM threads. */
public final class ReentrantLock {
    private Thread owner;private int depth;
    public synchronized boolean tryLock(){Thread thread=Thread.currentThread();if(owner!=null&&owner!=thread)return false;owner=thread;depth++;return true;}
    public void lock(){boolean interrupted=false;while(!tryLock()){try{Thread.sleep(1);}catch(InterruptedException e){interrupted=true;}}if(interrupted)Thread.currentThread().interrupt();}
    public synchronized void unlock(){if(owner!=Thread.currentThread())throw new IllegalMonitorStateException();if(--depth==0)owner=null;}
}
