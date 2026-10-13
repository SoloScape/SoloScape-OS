// Bounded parallel tasks for verified JS5 asset loading. Retains input order,
// avoids unbounded WebSocket fan-out, and propagates asset failures.
export async function mapBounded(items,concurrency,work){
    if(!Number.isInteger(concurrency)||concurrency<1||concurrency>64)
        throw new RangeError("Invalid cache request concurrency");
    const values=Array.from(items),results=new Array(values.length);
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(concurrency,values.length)},async()=>{
        while(cursor<values.length){
            const index=cursor++;
            results[index]=await work(values[index],index);
        }
    }));
    return results;
}
