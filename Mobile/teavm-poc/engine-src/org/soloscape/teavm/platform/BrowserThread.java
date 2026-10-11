package org.soloscape.teavm.platform;
/** Browser threads have no native stack-size or operating-system group. */
public class BrowserThread extends Thread {
    public BrowserThread(){super();}public BrowserThread(Runnable task){super(task);}
    public BrowserThread(Runnable task,String name){super(task,name);}
    public BrowserThread(String name){super(name);}
    public BrowserThread(BrowserThreadGroup group,Runnable task,String name,long stackSize){super(task,name);}
}
