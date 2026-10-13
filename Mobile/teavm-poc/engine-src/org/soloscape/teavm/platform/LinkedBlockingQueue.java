package org.soloscape.teavm.platform;
import java.util.*; import java.util.concurrent.*;
/** Unbounded queue without allocating an enormous fixed backing array. */
public class LinkedBlockingQueue<E> extends AbstractQueue<E> implements BlockingQueue<E> {
    private final ArrayDeque<E> values=new ArrayDeque<>();
    public synchronized boolean offer(E value) { values.add(Objects.requireNonNull(value)); return true; }
    public synchronized E poll() { return values.poll(); }
    public synchronized E peek() { return values.peek(); }
    public synchronized int size() { return values.size(); }
    public synchronized Iterator<E> iterator() { return Collections.unmodifiableList(new ArrayList<>(values)).iterator(); }
    public synchronized boolean remove(Object value) { return values.remove(value); }
    public synchronized boolean contains(Object value) { return values.contains(value); }
    public synchronized void clear() { values.clear(); }
    public int remainingCapacity() { return Integer.MAX_VALUE-size(); }
    public void put(E value) { offer(value); }
    public boolean offer(E value,long timeout,TimeUnit unit) { return offer(value); }
    public E take() throws InterruptedException { E value; while ((value=poll())==null) Thread.sleep(1); return value; }
    public E poll(long timeout,TimeUnit unit) throws InterruptedException {
        long duration=unit.toNanos(timeout),start=System.nanoTime(); E value;
        while ((value=poll())==null) { if(System.nanoTime()-start>=duration)return null; Thread.sleep(1); } return value;
    }
    public int drainTo(Collection<? super E> target) { return drainTo(target,Integer.MAX_VALUE); }
    public synchronized int drainTo(Collection<? super E> target,int maximum) {
        if(target==this)throw new IllegalArgumentException(); Objects.requireNonNull(target);
        int count=0; while(count<maximum&&!values.isEmpty()){target.add(values.peek());values.remove();count++;}return count;
    }
}
